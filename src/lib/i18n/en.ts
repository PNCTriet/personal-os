/** English UI chrome. Keys are the source of truth; vi.ts must provide every key (type-checked). */
export const en = {
  // navigation
  "nav.dashboard": "Dashboard", "nav.today": "Today", "nav.calendar": "Calendar", "nav.projects": "Projects", "nav.tasks": "Tasks",
  "nav.transactions": "Transactions", "nav.accounts": "Accounts", "nav.budgets": "Budgets", "nav.debts": "Debts",
  "nav.people": "People", "nav.companies": "Companies", "nav.inbox": "Inbox", "nav.campaigns": "Campaigns",
  "nav.notes": "Notes", "nav.documents": "Documents", "nav.goals": "Goals", "nav.habits": "Habits", "nav.memory": "Memory",
  "nav.integrations": "Integrations", "nav.apiKeys": "API keys", "nav.auditLog": "Audit log",
  "group.overview": "Overview", "group.planning": "Planning", "group.work": "Work", "group.finance": "Finance",
  "group.relationships": "Relationships", "group.communication": "Communication", "group.knowledge": "Knowledge",
  "group.growth": "Growth", "group.memory": "Memory", "group.settings": "Settings",

  // shell
  "shell.search": "Search", "shell.searchLong": "Search tasks, projects, people…", "shell.newTask": "New task",
  "shell.signOut": "Sign out", "shell.demo": "Demo", "shell.demoHint": "Demo mode: sample data in server memory, no sign-in. Resets on restart.",
  "shell.openNav": "Open navigation", "shell.closeNav": "Close navigation", "shell.toggleSidebar": "Toggle sidebar", "shell.toggleTheme": "Toggle dark mode",
  "shell.language": "Language", "shell.switchTo": "Tiếng Việt", "shell.skip": "Skip to content", "shell.close": "Close",
  "shell.refresh": "Reload", "shell.profile": "Profile",
  "login.title": "Personal OS", "login.subtitle": "Personal operating system for work, time and money",
  "login.email": "Email", "login.submit": "Sign in", "login.sending": "Sending…",
  "login.expired": "That link has expired or was already used. Request a new one.",
  "login.emailHint": "We’ll email you a sign-in link.",
  "cmd.placeholder": "Search or jump to…", "cmd.empty": "No results.", "cmd.actions": "Actions", "cmd.goto": "Go to",
  "cmd.newProject": "New project", "cmd.switchLang": "Switch to Vietnamese",

  // common
  "common.seeAll": "See all", "common.showMore": "Show more", "common.showLess": "Show less", "common.inbox": "Inbox",
  "common.noMatches": "No matches", "common.tryFilter": "Try a different filter.", "common.filter": "Filter…", "common.all": "All",
  "common.noActivity": "No activity yet.", "common.backHome": "Back to Dashboard", "common.notFound": "This page isn’t here",
  "common.preview": "Preview · Phase {p}", "common.phase": "Phase {p}", "common.connectedIn": "Connected in Phase {p}",
  "common.noneYet": "No {noun} yet", "common.readOnly": "This area is read-only until its backend ships.",
  "common.rows": "{n} rows", "common.approve": "Approve", "common.reject": "Reject",

  // greetings & dashboard
  "greet.morning": "Good morning", "greet.afternoon": "Good afternoon", "greet.evening": "Good evening",
  "dash.summaryClear": "Nothing due today. Enjoy the calm.",
  "dash.summary": "{due} due today, {overdue} overdue.",
  "dash.summarySpend": "Spent {pct}% of this month’s budget.",
  "dash.dueToday": "Due today", "dash.overdue": "Overdue", "dash.open": "Open tasks", "dash.spend": "Spend", "dash.cash": "Cash",
  "dash.followUps": "Follow-ups", "dash.ofBudget": "of {b}",
  "dash.agenda": "Today’s agenda", "dash.nothingScheduled": "Nothing scheduled", "dash.nothingScheduledBody": "No events or tasks due today.",
  "dash.calendarLater": "Calendar events connect in Phase 2.",
  "dash.projects": "Projects", "dash.approvals": "AI approvals", "dash.noApprovals": "No pending approvals",
  "dash.approvalsSoon": "Approvals ship with the MCP slice (Phase 1.5)",
  "dash.transactions": "Recent transactions", "dash.noTransactions": "No transactions yet", "dash.activity": "Activity",
  "dash.reconnect": "Reconnect", "dash.noPeople": "No people yet", "dash.caughtUp": "All caught up", "dash.daysLate": "{n}d late", "dash.never": "Never",
  "dash.moreSections": "Projects, finance, activity",
  "dash.done": "{done}/{total} done", "dash.overdueN": "{n} overdue",

  // tasks
  "task.status.backlog": "Backlog", "task.status.todo": "To do", "task.status.in_progress": "In progress", "task.status.blocked": "Blocked",
  "task.status.done": "Done", "task.status.cancelled": "Cancelled",
  "task.priority.urgent": "Urgent", "task.priority.high": "High", "task.priority.normal": "Normal", "task.priority.low": "Low",
  "task.kind.task": "Task", "task.kind.follow_up": "Follow-up", "task.kind.milestone": "Milestone",
  "task.view.open": "Open", "task.view.due": "Due ≤ 7d", "task.view.follow_up": "Follow-ups", "task.view.inbox": "Inbox", "task.view.done": "Done", "task.view.all": "All",
  "task.table": "Table", "task.board": "Board", "task.filter": "Filter tasks…", "task.priorityAll": "Priority: All", "task.projectAll": "Project: All",
  "task.count": "{n} tasks", "task.noMatch": "No tasks match", "task.noMatchBody": "Try another view or clear the filters.",
  "task.col.task": "Task", "task.col.code": "Code", "task.col.project": "Project", "task.col.status": "Status", "task.col.priority": "Priority", "task.col.due": "Due",
  "task.dropHere": "Drop tasks here", "task.updateFailed": "Could not update the task",
  "task.markDone": "Mark “{t}” as done", "task.markUndone": "Mark “{t}” as not done",
  "task.subtitle": "{open} open · {overdue} overdue",
  "qa.placeholder": "Add a task…", "qa.add": "Add task", "qa.adding": "Adding…", "qa.added": "Added", "qa.company": "Company…", "qa.due": "Due date",

  // today
  "today.subtitle": "{date} · {due} due, {overdue} overdue",
  "today.overdue": "Overdue", "today.due": "Due today", "today.progress": "In progress", "today.upcoming": "Next 7 days",
  "today.emptyOverdue": "Nothing overdue.", "today.emptyDue": "Nothing else is due today.", "today.emptyProgress": "Nothing in progress.",
  "today.emptyUpcoming": "A quiet week ahead.", "today.schedule": "Schedule", "today.noEvents": "No events", "today.calendarLater": "Calendar connects in Phase 2",

  // due / relative time
  "due.overdueDays": "{n} days overdue", "due.yesterday": "Yesterday", "due.today": "Today", "due.tomorrow": "Tomorrow",
  "rel.now": "Just now", "rel.min": "{n} min ago", "rel.hour": "{n} h ago", "rel.days": "{n} days ago",

  // projects
  "proj.subtitle": "{n} projects · {active} active", "proj.new": "New project", "proj.none": "No projects", "proj.noneBody": "Create your first project below.",
  "proj.overview": "Overview", "proj.progress": "Progress", "proj.start": "Start", "proj.target": "Target", "proj.noActivity": "No activity on this project yet.",
  "proj.create": "Create project", "proj.creating": "Creating…", "proj.created": "Project created", "proj.name": "Project name",
  "proj.description": "What does done look like? (optional)", "proj.codeHint": "Codes follow ADR-006 (COMPANY-PROJECT-NN) and never change.",

  // page subtitles
  "sub.inbox": "Gmail threads linked to people and projects", "sub.inboxN": "{n} unread · read-only preview",
  "sub.people": "Contacts, clients, partners, friends and family", "sub.peopleN": "{n} people · {late} to reconnect with",
  "sub.habits": "Last 7 days", "sub.goals": "Financial and personal goals",
  "sub.apiKeys": "Shown once, stored hashed, scoped and revocable", "sub.integrations": "Replaceable adapters, never the source of truth",
  "sub.audit": "Every change: who, what, when, and through which channel", "sub.companies": "{n} companies",
  "sub.calendar": "Next 7 days", "sub.documents": "Notion, Google Drive, GitHub and links", "sub.budgets": "This month",
  "sub.debts": "Money owed to you and by you", "sub.debtsN": "Owed to you {r} · You owe {p}",
  "sub.transactions": "All amounts in VND", "sub.accounts": "Bank, cash, e-wallet and credit", "sub.accountsN": "Net {total} · {n} accounts",
  "sub.memory": "What the OS knows. AI reads it only through scoped tools", "sub.notes": "Markdown notes with full-text search",
  "sub.campaigns": "Cold email sequences via Resend",
  "title.debts": "Debts & receivables",
  "btn.addPerson": "Add person", "btn.createKey": "Create key", "btn.connect": "Connect", "btn.addTransaction": "Add transaction",
  "btn.newNote": "New note", "btn.newCampaign": "New campaign",
  "empty.audit": "No audit entries", "empty.auditBody": "Changes to projects and tasks appear here.",
  "empty.companies": "No companies yet", "empty.noCalendar": "No calendar connected", "empty.noCalendarBody": "Google Calendar sync arrives in Phase 2.",
  "noun.threads": "email threads", "noun.people": "people", "noun.habits": "habits", "noun.goals": "goals", "noun.apiKeys": "API keys",
  "noun.documents": "documents", "noun.budgets": "budgets", "noun.debts": "debts", "noun.transactions": "transactions", "noun.accounts": "accounts",
  "noun.memories": "memories", "noun.notes": "notes", "noun.campaigns": "campaigns",
} as const;

export type MessageKey = keyof typeof en;
