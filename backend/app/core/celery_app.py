from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "backlogbuddy",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.worker.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "health-scores-hourly": {
            "task": "app.worker.tasks.recalculate_all_health_scores",
            "schedule": crontab(minute=0),
        },
        "deadline-reminders-daily": {
            "task": "app.worker.tasks.send_deadline_reminders",
            "schedule": crontab(hour=8, minute=0),
        },
        "resurrection-alerts-daily": {
            "task": "app.worker.tasks.send_resurrection_alerts",
            "schedule": crontab(hour=9, minute=0),
        },
        "weekly-digest-sunday": {
            "task": "app.worker.tasks.send_weekly_digest",
            "schedule": crontab(day_of_week=0, hour=18, minute=0),
        },
    },
)
