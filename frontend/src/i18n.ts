import { useState, useEffect } from 'react';

export type Lang = 'en' | 'ru';

const STORAGE_KEY = 'bb_lang';
let _lang: Lang = (localStorage.getItem(STORAGE_KEY) as Lang) || 'en';
const _subs = new Set<() => void>();

export function getLang(): Lang { return _lang; }

export function setLang(l: Lang): void {
  _lang = l;
  localStorage.setItem(STORAGE_KEY, l);
  _subs.forEach(fn => fn());
}

export function useLang(): [Lang, typeof setLang] {
  const [lang, setLocal] = useState<Lang>(_lang);
  useEffect(() => {
    const fn = () => setLocal(_lang);
    _subs.add(fn);
    return () => { _subs.delete(fn); };
  }, []);
  return [lang, setLang];
}

export function useT() {
  const [lang] = useLang();
  const dict = lang === 'ru' ? ru : en;
  return (key: string): string => (dict as Record<string, string>)[key] ?? key;
}

// ─── English ─────────────────────────────────────────────────────────────────

const en = {
  // Nav
  nav_dashboard: 'Dashboard',
  nav_projects: 'Projects',
  nav_system: 'Style guide',
  nav_settings: 'Settings',
  nav_sign_out: 'Sign out',
  nav_active: 'Active',

  // Dashboard
  dash_you: 'You',
  dash_morning: 'Good morning',
  dash_afternoon: 'Good afternoon',
  dash_evening: 'Good evening',
  dash_active_projects: 'active projects',
  dash_active_project: 'active project',
  dash_attention: 'awaiting your attention.',
  dash_new_project: 'New project',
  dash_velocity: 'Velocity · last 4 weeks',
  dash_tasks_closed: 'tasks closed',
  dash_no_data: 'No data yet',
  dash_complete_tasks: '— complete tasks to see velocity',
  dash_health_snapshot: 'Health snapshot',
  dash_active_projects_h: 'Active projects',
  dash_no_projects: 'No active projects yet.',
  dash_create_first: 'Create your first project',
  dash_zombie_title: 'Zombie projects · 14+ days inactive',
  dash_zombie_desc: "Decide what to do with these. No pressure — sometimes resting is fine.",
  dash_review_all: 'Review all',
  dash_this_week: 'This week',
  dash_activity: 'Activity',
  dash_view_all: 'View all',
  dash_no_activity: 'No activity yet. Start by creating a project.',
  dash_no_tasks_week: 'No tasks due this week',
  dash_of: 'of',
  dash_today: 'TODAY',

  // Projects
  proj_title: 'Projects',
  proj_sorted: 'sorted by health',
  proj_search: 'Search projects…',
  proj_new: 'New project',
  proj_status_all: 'All',
  proj_grid: 'Grid',
  proj_list: 'List',
  proj_of: 'of',
  proj_no_match: 'No projects match',
  proj_no_category: 'No projects in this category.',

  // Status
  status_idea: 'idea',
  status_active: 'active',
  status_paused: 'paused',
  status_done: 'done',
  status_archived: 'archived',

  // Project detail
  pd_projects: 'Projects',
  pd_open_repo: 'Open repo',
  pd_add_task: 'Add task',
  pd_due: 'Due',
  pd_last_active: 'Last active',

  // Tabs
  tab_kanban: 'Kanban',
  tab_timeline: 'Timeline',
  tab_risks: 'Risk Matrix',
  tab_notes: 'Notes',

  // Sidebar
  sb_goal: 'Goal',
  sb_health: 'Health',
  sb_progress: 'Progress',
  sb_deadline: 'Deadline',
  sb_tags: 'Tags',
  sb_velocity: 'Velocity (4w)',
  sb_status: 'Status',
  sb_no_goal: 'No goal set yet.',
  sb_no_tags: 'No tags',
  sb_add_tag: '+ add',
  sb_auto_calc: 'auto-calculated',
  sb_tasks_done: 'tasks done',
  sb_active: 'Active',

  // Health tooltip
  health_how: 'How health is scored',
  health_activity: 'Activity',
  health_progress: 'Progress',
  health_risk: 'Risk score',
  health_milestones: 'Milestones',

  // Kanban
  kanban_task: 'task',
  kanban_tasks: 'tasks',
  kanban_new_task: 'New task',
  kanban_confirm_hint: '↵ confirm · Esc cancel',
  kanban_drag_hint: 'Drag between columns · hover for edit / delete',
  col_backlog: 'Backlog',
  col_in_progress: 'In Progress',
  col_review: 'Review',
  col_done: 'Done',
  kanban_just_me: 'Just me',
  kanban_all_tags: 'All tags',

  // Timeline
  tl_title: 'Timeline',
  tl_done_of: 'milestones done',
  tl_no_milestones: 'No milestones yet',
  tl_add: 'Add milestone',
  tl_empty: 'No milestones yet. Track key checkpoints for your project.',
  tl_placeholder: 'Milestone title…',
  tl_cancel: 'Cancel',
  tl_add_btn: 'Add',

  // Risks
  rm_title: 'Risk Matrix',
  rm_mitigated: 'mitigated',
  rm_add: 'Add risk',
  rm_empty: 'No risks tracked yet. Add potential risks to keep your project health accurate.',
  rm_probability: 'Probability:',
  rm_impact: 'Impact:',
  rm_cancel: 'Cancel',
  rm_add_btn: 'Add risk',
  rm_mitigate: 'mitigate',
  rm_done_btn: '✓ done',
  rm_placeholder: 'Risk title…',
  rm_desc_placeholder: 'Mitigation / description (optional)',

  // Notes
  notes_title: 'Notes',
  notes_saved: 'Saved · markdown',
  notes_saving: 'Saving…',

  // Repo modal
  repo_title: 'Repository',
  repo_label: 'URL',
  repo_placeholder: 'https://github.com/you/repo',
  repo_open: 'Open site',
  repo_save: 'Save',
  repo_cancel: 'Cancel',
  repo_clear: 'Clear URL',
  repo_hint: 'Paste the URL of your repository or project site.',

  // Settings
  settings_title: 'Settings',
  settings_desc: 'Notifications, profile, and how Backlog Buddy nudges you.',
  settings_profile: 'Profile',
  settings_notifications: 'Notifications',
  settings_capture: 'Quick capture',
  settings_danger: 'Danger',
  settings_hotkey: 'Hotkey',
  settings_hotkey_desc: 'Open the capture window from anywhere in the app.',
  settings_export: 'Export everything',
  settings_export_desc: 'JSON archive of projects, tasks, notes.',
  settings_edit: 'Edit',
  settings_export_btn: 'Export',
  settings_change: 'Change',
  settings_language: 'Language',

  // Notifications
  notif_digest: 'Weekly digest',
  notif_digest_desc: "Sunday 18:00 — velocity, zombies, what's due",
  notif_tg: 'Telegram quick capture',
  notif_tg_desc: 'Forward messages to @backlogbuddy_bot to triage later',
  notif_zombie: 'Zombie nudges',
  notif_zombie_desc: 'Gentle reminder when a project hits 14 days idle. No badges, no red.',
  notif_not_linked: 'not linked',
  notif_in_app: 'in-app',

  // Auth screen
  auth_welcome_back: 'Welcome back',
  auth_create_account: 'Create account',
  auth_signin_desc: 'Sign in to Backlog Buddy',
  auth_register_desc: 'Get started with Backlog Buddy',
  auth_display_name: 'Display name',
  auth_email: 'Email',
  auth_password: 'Password',
  auth_your_name: 'Your name',
  auth_min_chars: 'Min. 8 characters',
  auth_wait: 'Please wait…',
  auth_sign_in: 'Sign in',
  auth_no_account: 'No account?',
  auth_register: 'Register',
  auth_have_account: 'Already have an account?',
  auth_err_invalid: 'Invalid email or password.',
  auth_err_taken: 'This email is already registered.',
  auth_err_connect: 'Unable to connect. Is the server running?',

  // New project modal
  np_title: 'New project',
  np_name: 'Name *',
  np_abbr: 'Abbr',
  np_goal: 'Goal',
  np_due: 'Due date',
  np_tags: 'Tags',
  np_cancel: 'Cancel',
  np_create: 'Create project',
  np_placeholder_name: 'My new project',
  np_placeholder_goal: 'What is this project trying to achieve?',
  np_placeholder_due: 'Jun 30',
  np_placeholder_tags: 'react, saas',

  // Quick capture
  qc_title: 'Quick capture',
  qc_placeholder: 'Capture an idea, task, or thought…',
  qc_project: 'Project',
  qc_priority: 'Priority',
  qc_capture: 'Capture',

  // General
  btn_save: 'Save',
  btn_cancel: 'Cancel',
  btn_edit: 'Edit',
  btn_delete: 'Delete',
  btn_add: 'Add',
};

// ─── Russian ─────────────────────────────────────────────────────────────────

const ru: typeof en = {
  nav_dashboard: 'Главная',
  nav_projects: 'Проекты',
  nav_system: 'Стили',
  nav_settings: 'Настройки',
  nav_sign_out: 'Выйти',
  nav_active: 'Активные',

  dash_you: 'Вы',
  dash_morning: 'Доброе утро',
  dash_afternoon: 'Добрый день',
  dash_evening: 'Добрый вечер',
  dash_active_projects: 'активных проектов',
  dash_active_project: 'активный проект',
  dash_attention: 'требуют внимания.',
  dash_new_project: 'Новый проект',
  dash_velocity: 'Темп · последние 4 недели',
  dash_tasks_closed: 'задач выполнено',
  dash_no_data: 'Нет данных',
  dash_complete_tasks: '— выполните задачи, чтобы увидеть темп',
  dash_health_snapshot: 'Состояние',
  dash_active_projects_h: 'Активные проекты',
  dash_no_projects: 'Активных проектов нет.',
  dash_create_first: 'Создать первый проект',
  dash_zombie_title: 'Зомби-проекты · 14+ дней без активности',
  dash_zombie_desc: 'Решите что делать. Иногда пауза — это нормально.',
  dash_review_all: 'Просмотреть',
  dash_this_week: 'Эта неделя',
  dash_activity: 'Активность',
  dash_view_all: 'Все',
  dash_no_activity: 'Нет активности. Создайте первый проект.',
  dash_no_tasks_week: 'Задач на эту неделю нет',
  dash_of: 'из',
  dash_today: 'СЕГОДНЯ',

  proj_title: 'Проекты',
  proj_sorted: 'сортировка по здоровью',
  proj_search: 'Поиск проектов…',
  proj_new: 'Новый проект',
  proj_status_all: 'Все',
  proj_grid: 'Сетка',
  proj_list: 'Список',
  proj_of: 'из',
  proj_no_match: 'Нет проектов по запросу',
  proj_no_category: 'Нет проектов в этой категории.',

  status_idea: 'идея',
  status_active: 'активный',
  status_paused: 'пауза',
  status_done: 'завершён',
  status_archived: 'архив',

  pd_projects: 'Проекты',
  pd_open_repo: 'Открыть репо',
  pd_add_task: 'Добавить задачу',
  pd_due: 'До',
  pd_last_active: 'Активность',

  tab_kanban: 'Канбан',
  tab_timeline: 'Лента',
  tab_risks: 'Риски',
  tab_notes: 'Заметки',

  sb_goal: 'Цель',
  sb_health: 'Здоровье',
  sb_progress: 'Прогресс',
  sb_deadline: 'Дедлайн',
  sb_tags: 'Теги',
  sb_velocity: 'Темп (4н)',
  sb_status: 'Статус',
  sb_no_goal: 'Цель не задана.',
  sb_no_tags: 'Нет тегов',
  sb_add_tag: '+ добавить',
  sb_auto_calc: 'авто',
  sb_tasks_done: 'задач выполнено',
  sb_active: 'Активен',

  health_how: 'Как считается здоровье',
  health_activity: 'Активность',
  health_progress: 'Прогресс',
  health_risk: 'Риски',
  health_milestones: 'Вехи',

  kanban_task: 'задача',
  kanban_tasks: 'задач',
  kanban_new_task: 'Новая задача',
  kanban_confirm_hint: '↵ подтвердить · Esc отмена',
  kanban_drag_hint: 'Перетащите · наведите для редактирования',
  col_backlog: 'Беклог',
  col_in_progress: 'В работе',
  col_review: 'Проверка',
  col_done: 'Готово',
  kanban_just_me: 'Только я',
  kanban_all_tags: 'Все теги',

  tl_title: 'Лента',
  tl_done_of: 'вех выполнено',
  tl_no_milestones: 'Нет вех',
  tl_add: 'Добавить веху',
  tl_empty: 'Нет вех. Добавьте ключевые этапы проекта.',
  tl_placeholder: 'Название вехи…',
  tl_cancel: 'Отмена',
  tl_add_btn: 'Добавить',

  rm_title: 'Матрица рисков',
  rm_mitigated: 'устранено',
  rm_add: 'Добавить риск',
  rm_empty: 'Рисков нет. Добавьте потенциальные риски для точного расчёта здоровья.',
  rm_probability: 'Вероятность:',
  rm_impact: 'Влияние:',
  rm_cancel: 'Отмена',
  rm_add_btn: 'Добавить риск',
  rm_mitigate: 'устранить',
  rm_done_btn: '✓ устранён',
  rm_placeholder: 'Название риска…',
  rm_desc_placeholder: 'Описание / митигация (необязательно)',

  notes_title: 'Заметки',
  notes_saved: 'Сохранено · markdown',
  notes_saving: 'Сохранение…',

  repo_title: 'Репозиторий',
  repo_label: 'URL',
  repo_placeholder: 'https://github.com/you/repo',
  repo_open: 'Открыть сайт',
  repo_save: 'Сохранить',
  repo_cancel: 'Отмена',
  repo_clear: 'Очистить',
  repo_hint: 'Вставьте URL репозитория или сайта проекта.',

  settings_title: 'Настройки',
  settings_desc: 'Уведомления, профиль и настройки напоминаний.',
  settings_profile: 'Профиль',
  settings_notifications: 'Уведомления',
  settings_capture: 'Быстрый захват',
  settings_danger: 'Опасная зона',
  settings_hotkey: 'Горячая клавиша',
  settings_hotkey_desc: 'Открыть окно захвата из любого места.',
  settings_export: 'Экспорт всего',
  settings_export_desc: 'JSON-архив проектов, задач, заметок.',
  settings_edit: 'Изменить',
  settings_export_btn: 'Экспорт',
  settings_change: 'Изменить',
  settings_language: 'Язык',

  notif_digest: 'Еженедельная сводка',
  notif_digest_desc: 'Воскресенье 18:00 — темп, зомби, дедлайны',
  notif_tg: 'Telegram быстрый захват',
  notif_tg_desc: 'Пересылайте сообщения боту @backlogbuddy_bot',
  notif_zombie: 'Напоминания о зомби',
  notif_zombie_desc: 'Напомнит, если проект 14 дней без активности.',
  notif_not_linked: 'не подключено',
  notif_in_app: 'в приложении',

  // Auth screen
  auth_welcome_back: 'Добро пожаловать',
  auth_create_account: 'Создать аккаунт',
  auth_signin_desc: 'Войдите в Backlog Buddy',
  auth_register_desc: 'Начните работу с Backlog Buddy',
  auth_display_name: 'Имя',
  auth_email: 'Email',
  auth_password: 'Пароль',
  auth_your_name: 'Ваше имя',
  auth_min_chars: 'Минимум 8 символов',
  auth_wait: 'Подождите…',
  auth_sign_in: 'Войти',
  auth_no_account: 'Нет аккаунта?',
  auth_register: 'Зарегистрироваться',
  auth_have_account: 'Уже есть аккаунт?',
  auth_err_invalid: 'Неверный email или пароль.',
  auth_err_taken: 'Email уже зарегистрирован.',
  auth_err_connect: 'Нет соединения с сервером.',

  np_title: 'Новый проект',
  np_name: 'Название *',
  np_abbr: 'Аббр.',
  np_goal: 'Цель',
  np_due: 'Дедлайн',
  np_tags: 'Теги',
  np_cancel: 'Отмена',
  np_create: 'Создать проект',
  np_placeholder_name: 'Мой новый проект',
  np_placeholder_goal: 'Чего хочет достичь этот проект?',
  np_placeholder_due: '30 июн',
  np_placeholder_tags: 'react, saas',

  qc_title: 'Быстрый захват',
  qc_placeholder: 'Идея, задача, мысль…',
  qc_project: 'Проект',
  qc_priority: 'Приоритет',
  qc_capture: 'Захват',

  btn_save: 'Сохранить',
  btn_cancel: 'Отмена',
  btn_edit: 'Изменить',
  btn_delete: 'Удалить',
  btn_add: 'Добавить',
};
