import {
  LayoutDashboard, Sun, CalendarDays, FolderKanban, ListChecks, ArrowLeftRight, Landmark, PieChart, HandCoins,
  Users, Building2, Inbox, Send, StickyNote, FileText, Target, Repeat, Brain, Plug, KeyRound, ScrollText, type LucideIcon,
} from "lucide-react";
import type { IconName } from "./nav";

export const ICONS: Record<IconName, LucideIcon> = {
  dashboard: LayoutDashboard, today: Sun, calendar: CalendarDays, projects: FolderKanban, tasks: ListChecks,
  transactions: ArrowLeftRight, accounts: Landmark, budgets: PieChart, debts: HandCoins, people: Users, companies: Building2,
  inbox: Inbox, campaigns: Send, notes: StickyNote, documents: FileText, goals: Target, habits: Repeat, memory: Brain,
  integrations: Plug, keys: KeyRound, audit: ScrollText,
};
