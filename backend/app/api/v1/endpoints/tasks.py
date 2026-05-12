import json
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.api.deps import get_project_for_user, get_session
from app.models import Project, Task, TaskStatus, Priority
from app.schemas.task import (
    TaskCreate, TaskUpdate, TaskOut, KanbanReorder,
    KanbanTaskOut, STATUS_TO_COLUMN, COLUMN_TO_STATUS, PRIORITY_IN,
)
from app.services.health_score import recalculate_project

router = APIRouter(prefix="/projects/{project_id}/tasks", tags=["tasks"])


# ─── Kanban endpoints ────────────────────────────────────────────────────────

@router.get("/kanban")
async def get_kanban(
    project: Project = Depends(get_project_for_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, list[dict]]:
    tasks = (await session.execute(
        select(Task)
        .where(Task.project_id == project.id)
        .order_by(Task.board_order)
    )).scalars().all()

    columns: dict[str, list[dict]] = {
        "Backlog": [], "In Progress": [], "Review": [], "Done": []
    }
    for t in tasks:
        col = STATUS_TO_COLUMN.get(t.status, "Backlog")
        columns[col].append(KanbanTaskOut.from_orm(t).model_dump())

    return columns


@router.put("/kanban", status_code=status.HTTP_204_NO_CONTENT)
async def update_kanban(
    kanban: dict[str, list[dict[str, Any]]],
    project: Project = Depends(get_project_for_user),
    session: AsyncSession = Depends(get_session),
):
    """Bulk-sync frontend kanban state → DB. Upserts tasks, removes deleted ones."""
    existing = (await session.execute(
        select(Task).where(Task.project_id == project.id)
    )).scalars().all()
    existing_by_id = {t.id: t for t in existing}
    received_ids: set[int] = set()

    for col_name, tasks_data in kanban.items():
        new_status = COLUMN_TO_STATUS.get(col_name, TaskStatus.backlog)
        for order, td in enumerate(tasks_data):
            raw_id = td.get("id")
            task_id = int(raw_id) if raw_id and str(raw_id).isdigit() else None

            if task_id and task_id in existing_by_id:
                received_ids.add(task_id)
                t = existing_by_id[task_id]
                # "In Progress" column covers both in_progress and blocked;
                # preserve blocked so it isn't silently downgraded.
                if not (new_status == TaskStatus.in_progress and t.status == TaskStatus.blocked):
                    t.status = new_status
                t.board_order = order
                t.title = td.get("title", t.title)
                incoming_priority = PRIORITY_IN.get(td.get("priority", ""), None)
                # "high" from the frontend is ambiguous — it also represents critical;
                # preserve critical so it isn't silently downgraded.
                if incoming_priority is not None:
                    if not (incoming_priority == Priority.high and t.priority == Priority.critical):
                        t.priority = incoming_priority
                t.overdue = td.get("overdue", t.overdue)
                t.tags_json = json.dumps(td.get("tags", []))
                t.subtask_done = td.get("subtaskDone", t.subtask_done)
                t.subtask_total = td.get("subtaskTotal", t.subtask_total)
                t.comments = td.get("comments", t.comments)
                t.assignee = td.get("assignee") or ""
                t.updated_at = datetime.now(timezone.utc)
                session.add(t)
            elif not task_id:
                # New task created on frontend (has non-numeric id like genId())
                new_task = Task(
                    project_id=project.id,
                    title=td.get("title", ""),
                    status=new_status,
                    priority=PRIORITY_IN.get(td.get("priority", "med"), Priority.medium),
                    board_order=order,
                    overdue=td.get("overdue", False),
                    tags_json=json.dumps(td.get("tags", [])),
                    subtask_done=td.get("subtaskDone", 0),
                    subtask_total=td.get("subtaskTotal", 0),
                    comments=td.get("comments", 0),
                    assignee=td.get("assignee") or "",
                )
                session.add(new_task)

    # Delete tasks removed from kanban
    for tid, t in existing_by_id.items():
        if tid not in received_ids:
            await session.delete(t)

    project.last_activity_at = datetime.now(timezone.utc)
    project.updated_at = datetime.now(timezone.utc)
    session.add(project)
    await session.flush()
    await recalculate_project(project.id, session)


# ─── Standard CRUD ───────────────────────────────────────────────────────────

@router.get("", response_model=list[TaskOut])
async def list_tasks(
    project: Project = Depends(get_project_for_user),
    session: AsyncSession = Depends(get_session),
):
    tasks = (await session.execute(
        select(Task).where(Task.project_id == project.id).order_by(Task.board_order)
    )).scalars().all()
    return tasks


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(
    body: TaskCreate,
    project: Project = Depends(get_project_for_user),
    session: AsyncSession = Depends(get_session),
):
    task = Task(**body.model_dump(), project_id=project.id)
    session.add(task)
    project.last_activity_at = datetime.now(timezone.utc)
    session.add(project)
    await session.flush()
    await recalculate_project(project.id, session)
    await session.refresh(task)
    return task


@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: int,
    body: TaskUpdate,
    project: Project = Depends(get_project_for_user),
    session: AsyncSession = Depends(get_session),
):
    task = await session.get(Task, task_id)
    if not task or task.project_id != project.id:
        raise HTTPException(status_code=404, detail="Task not found")
    for key, val in body.model_dump(exclude_none=True).items():
        setattr(task, key, val)
    task.updated_at = datetime.now(timezone.utc)
    project.last_activity_at = datetime.now(timezone.utc)
    session.add(task)
    session.add(project)
    await session.flush()
    await recalculate_project(project.id, session)
    await session.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    project: Project = Depends(get_project_for_user),
    session: AsyncSession = Depends(get_session),
):
    task = await session.get(Task, task_id)
    if not task or task.project_id != project.id:
        raise HTTPException(status_code=404, detail="Task not found")
    await session.delete(task)
    await session.flush()
    await recalculate_project(project.id, session)


@router.post("/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_tasks(
    body: list[KanbanReorder],
    project: Project = Depends(get_project_for_user),
    session: AsyncSession = Depends(get_session),
):
    for item in body:
        task = await session.get(Task, item.task_id)
        if task and task.project_id == project.id:
            task.status = item.new_status
            task.board_order = item.new_order
            session.add(task)
    await session.flush()
    await recalculate_project(project.id, session)
