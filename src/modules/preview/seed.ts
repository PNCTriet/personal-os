import { addDays, todayISO } from "@/lib/dates";
import type { PreviewData, FinanceTransaction, Budget } from "./domain";

/** Deterministic demo data relative to "today" (owner timezone). */
export function buildPreview(tz: string): PreviewData {
  const today = todayISO(tz);
  const d = (n: number) => addDays(today, n);
  const at = (dayOffset: number, hhmm: string) => `${d(dayOffset)}T${hhmm}:00+07:00`;
  let n = 0;
  const id = (p: string) => `${p}_${(++n).toString().padStart(3, "0")}`;

  const accounts = [
    { id: id("acc"), name: "Vietcombank Checking", kind: "bank", institution: "Vietcombank", currency: "VND", balance: 48_250_000 },
    { id: id("acc"), name: "HOWL LAB Business", kind: "bank", institution: "Techcombank", currency: "VND", balance: 86_400_000 },
    { id: id("acc"), name: "Techcombank Savings", kind: "savings", institution: "Techcombank", currency: "VND", balance: 120_000_000 },
    { id: id("acc"), name: "MoMo", kind: "ewallet", institution: "MoMo", currency: "VND", balance: 1_870_000 },
    { id: id("acc"), name: "Cash wallet", kind: "cash", institution: null, currency: "VND", balance: 2_350_000 },
    { id: id("acc"), name: "VIB Credit Card", kind: "credit", institution: "VIB", currency: "VND", balance: -6_420_000 },
  ] satisfies PreviewData["accounts"];

  const tx = (off: number, description: string, category: string, account: string, amount: number, counterparty: string | null = null, kind?: FinanceTransaction["kind"]): FinanceTransaction => ({
    id: id("txn"), occurred_on: d(-off), description, category, account, amount, counterparty, kind: kind ?? (amount >= 0 ? "income" : "expense"),
  });
  const transactions: FinanceTransaction[] = [
    tx(0, "Phở Thìn, lunch", "Food & drink", "MoMo", -65_000, "Phở Thìn"),
    tx(0, "Grab to District 1", "Transport", "MoMo", -48_000, "Grab"),
    tx(1, "Highlands Coffee", "Coffee", "Cash wallet", -39_000, "Highlands Coffee"),
    tx(1, "Mekong Trails: milestone 2", "Client income", "HOWL LAB Business", 18_500_000, "Mekong Trails"),
    tx(2, "Vercel Pro seat (team)", "Software", "VIB Credit Card", -520_000, "Vercel"),
    tx(2, "Co.op Mart groceries", "Groceries", "Vietcombank Checking", -684_000, "Co.opmart"),
    tx(3, "EVN electricity", "Utilities", "Vietcombank Checking", -1_120_000, "EVN HCMC"),
    tx(4, "ChatGPT Plus", "Software", "VIB Credit Card", -520_000, "OpenAI"),
    tx(4, "Cơm tấm Ba Ghiền", "Food & drink", "Cash wallet", -75_000),
    tx(5, "Transfer to savings", "Transfer", "Vietcombank Checking", -10_000_000, null, "transfer"),
    tx(5, "Transfer to savings", "Transfer", "Techcombank Savings", 10_000_000, null, "transfer"),
    tx(6, "Running shoes, Nike", "Health", "VIB Credit Card", -2_190_000, "Nike Store"),
    tx(7, "Lotus Print: merch deposit", "Business", "HOWL LAB Business", -3_200_000, "Lotus Print Co."),
    tx(8, "Viettel fibre", "Utilities", "Vietcombank Checking", -265_000, "Viettel"),
    tx(9, "The Workshop coffee", "Coffee", "MoMo", -85_000),
    tx(10, "Figma Professional", "Software", "VIB Credit Card", -390_000, "Figma"),
    tx(11, "Bún chả Hương Liên", "Food & drink", "Cash wallet", -90_000),
    tx(12, "Xanh SM taxi", "Transport", "MoMo", -112_000, "Xanh SM"),
    tx(13, "Consulting: Lotus brand sprint", "Client income", "HOWL LAB Business", 12_000_000, "Lotus Print Co."),
    tx(14, "Apartment rent", "Rent", "Vietcombank Checking", -9_500_000, "Landlord"),
    tx(15, "CGV cinema", "Entertainment", "MoMo", -220_000, "CGV"),
    tx(17, "Bách Hóa Xanh", "Groceries", "Cash wallet", -312_000),
    tx(18, "Google Workspace", "Software", "VIB Credit Card", -158_000, "Google"),
    tx(20, "Dinner with Minh", "Food & drink", "Vietcombank Checking", -640_000),
    tx(22, "Salary transfer to personal", "Transfer", "HOWL LAB Business", -25_000_000, null, "transfer"),
    tx(22, "Salary transfer to personal", "Transfer", "Vietcombank Checking", 25_000_000, null, "transfer"),
    tx(24, "Gym membership", "Health", "Vietcombank Checking", -600_000, "California Fitness"),
    tx(26, "Tiki: books", "Learning", "MoMo", -348_000, "Tiki"),
  ];

  const month = today.slice(0, 7);
  const spentIn = (cat: string) => -transactions.filter((t) => t.kind === "expense" && t.category === cat && t.occurred_on.startsWith(month)).reduce((s, t) => s + t.amount, 0);
  const budgets: Budget[] = [
    ["Rent", 9_500_000], ["Food & drink", 4_000_000], ["Groceries", 3_000_000], ["Software", 2_500_000], ["Utilities", 1_800_000],
    ["Transport", 1_500_000], ["Health", 2_000_000], ["Coffee", 800_000], ["Entertainment", 1_000_000], ["Learning", 1_000_000],
  ].map(([category, limit]) => ({ id: id("bud"), category: category as string, limit: limit as number, spent: spentIn(category as string) }));

  const debts = [
    { id: id("debt"), direction: "receivable", counterparty: "Mekong Trails", principal: 37_000_000, outstanding: 18_500_000, due_on: d(5), note: "Invoice INV-2026-014, milestone 3 of 4" },
    { id: id("debt"), direction: "receivable", counterparty: "Nguyễn Văn Minh", principal: 1_500_000, outstanding: 1_500_000, due_on: d(-3), note: "Concert tickets" },
    { id: id("debt"), direction: "payable", counterparty: "Lotus Print Co.", principal: 6_400_000, outstanding: 3_200_000, due_on: d(12), note: "Merch run balance on delivery" },
    { id: id("debt"), direction: "payable", counterparty: "Trần Thu Hà", principal: 500_000, outstanding: 500_000, due_on: null, note: "Team lunch split" },
  ] satisfies PreviewData["debts"];

  const people = [
    { name: "Lê Hoàng Nam", company: "Mekong Trails", role: "Operations Director", email: "nam@mekongtrails.vn", relationship: "client", tags: ["tour-ops", "decision-maker"], last: 3, every: 14 },
    { name: "Phạm Thanh Thảo", company: "Mekong Trails", role: "Booking Lead", email: "thao@mekongtrails.vn", relationship: "client", tags: ["tour-ops"], last: 9, every: 14 },
    { name: "Võ Minh Khoa", company: "Lotus Print Co.", role: "Owner", email: "khoa@lotusprint.vn", relationship: "vendor", tags: ["merch"], last: 21, every: 30 },
    { name: "Nguyễn Văn Minh", company: null, role: null, email: "minh.nv@gmail.com", relationship: "friend", tags: ["running"], last: 26, every: 14 },
    { name: "Trần Thu Hà", company: "HOWL LAB", role: "Freelance designer", email: "ha.tran@howllab.vn", relationship: "partner", tags: ["design"], last: 1, every: 7 },
    { name: "Đặng Quốc Bảo", company: "Saigon Ventures", role: "Partner", email: "bao@saigonventures.vc", relationship: "lead", tags: ["investor", "intro:Nam"], last: 45, every: 30 },
    { name: "Bùi Ngọc Anh", company: "Hanoi Heritage Tours", role: "CEO", email: "anh@hanoiheritage.vn", relationship: "lead", tags: ["tour-ops", "cold"], last: null, every: 21 },
    { name: "Mẹ", company: null, role: null, email: null, relationship: "family", tags: ["family"], last: 4, every: 3 },
    { name: "Hoàng Gia Huy", company: "Grab Vietnam", role: "Engineering Manager", email: "huy.hoang@grab.com", relationship: "friend", tags: ["mentor"], last: 62, every: 45 },
    { name: "Sarah Chen", company: "Notion Labs", role: "Partnerships", email: "sarah@makenotion.com", relationship: "partner", tags: ["integration"], last: 18, every: 30 },
    { name: "Lý Thanh Tâm", company: "Mekong Trails", role: "Finance", email: "tam@mekongtrails.vn", relationship: "client", tags: ["invoices"], last: 12, every: 30 },
    { name: "Phan Đức Long", company: null, role: "Running coach", email: "long.coach@gmail.com", relationship: "vendor", tags: ["running"], last: 6, every: 7 },
  ].map((p) => ({
    id: id("per"), name: p.name, company: p.company, role: p.role, email: p.email, relationship: p.relationship as PreviewData["people"][number]["relationship"],
    tags: p.tags, last_contacted_on: p.last === null ? null : d(-p.last), reconnect_every_days: p.every,
  }));

  const inbox = [
    { from: "Lê Hoàng Nam", subject: "Re: Q4 itinerary v2, two questions", snippet: "Looks great. Can we move the Cần Thơ floating market to day 2 and confirm the boat operator's insurance?", h: 0.6, label: "Clients", unread: true },
    { from: "Võ Minh Khoa", subject: "Merch proofs ready", snippet: "Attached are the final proofs for the tote and tee. Please approve by Thursday so we can print next week.", h: 3, label: "Partners", unread: true },
    { from: "Techcombank", subject: "Biến động số dư tài khoản", snippet: "Tài khoản ****8821 +18,500,000 VND. Nội dung: MEKONG TRAILS TT MILESTONE 2", h: 26, label: "Receipts", unread: false },
    { from: "Sarah Chen", subject: "Notion API partner program", snippet: "Following up on our call. Happy to get you into the early access for the new webhooks API.", h: 30, label: "Partners", unread: false },
    { from: "Nguyễn Văn Minh", subject: "Chạy sáng CN không?", snippet: "Sunday 5:30 at Thảo Điền? 12k easy then bánh mì.", h: 40, label: "Personal", unread: false },
    { from: "Vercel", subject: "Your deployment is ready", snippet: "personal-os deployed to production. Visit personal-os-blond-eta.vercel.app", h: 50, label: "Newsletters", unread: false },
    { from: "Phạm Thanh Thảo", subject: "Guide licenses: status", snippet: "Two of the four guide licenses are still with the department. Expected Friday.", h: 70, label: "Clients", unread: false },
  ].map((m) => ({ id: id("msg"), from: m.from, subject: m.subject, snippet: m.snippet, received_at: new Date(Date.now() - m.h * 3_600_000).toISOString(), label: m.label as PreviewData["inbox"][number]["label"], unread: m.unread }));

  const campaigns = [
    { id: id("cmp"), name: "Tour operators Q4 intro", status: "active", steps: 3, enrolled: 24, sent: 51, opened: 29, replied: 6, updated_on: d(-1) },
    { id: id("cmp"), name: "Studio case study launch", status: "draft", steps: 2, enrolled: 0, sent: 0, opened: 0, replied: 0, updated_on: d(-4) },
    { id: id("cmp"), name: "Past clients check-in", status: "paused", steps: 1, enrolled: 11, sent: 11, opened: 8, replied: 3, updated_on: d(-12) },
    { id: id("cmp"), name: "Brand refresh follow-up", status: "completed", steps: 3, enrolled: 9, sent: 27, opened: 19, replied: 4, updated_on: d(-30) },
  ] satisfies PreviewData["campaigns"];

  const notes = [
    { title: "Q4 Mekong itinerary: open questions", excerpt: "Floating market timing, boat insurance, homestay capacity for 18 pax, rain plan.", kind: "note", tags: ["mekong", "tour-ops"], h: 5 },
    { title: "Pricing model for studio retainers", excerpt: "Three tiers. Retainer floor 25M/month; overflow billed per day at 6M.", kind: "research", tags: ["studio", "pricing"], h: 28 },
    { title: "Supabase RLS patterns", excerpt: "Owner-only policies, restrictive policy for OAuth-client tokens, column grants for secret hashes.", kind: "research", tags: ["personal-os", "security"], h: 50 },
    { title: "Book notes: The Mom Test", excerpt: "Talk about their life, not your idea. Ask about specifics in the past. Talk less, listen more.", kind: "note", tags: ["books", "sales"], h: 120 },
    { title: "Vietnam tourism licensing guide", excerpt: "Tour guide card types, international vs domestic, renewal timelines.", kind: "bookmark", tags: ["tour-ops", "legal"], h: 200 },
    { title: "Running plan: HCMC Marathon", excerpt: "16 weeks. Base 40 km/week, long run Sunday, tempo Wednesday.", kind: "note", tags: ["running", "health"], h: 260 },
  ].map((x) => ({ id: id("note"), title: x.title, excerpt: x.excerpt, kind: x.kind as PreviewData["notes"][number]["kind"], tags: x.tags, updated_at: new Date(Date.now() - x.h * 3_600_000).toISOString() }));

  const documents = [
    { id: id("doc"), title: "Mekong Trails: Statement of work", source: "Google Drive", linked_to: "HOWL-VTO-01", updated_on: d(-6) },
    { id: id("doc"), title: "Personal OS: Architecture", source: "GitHub", linked_to: "HOWL-POS-01", updated_on: d(0) },
    { id: id("doc"), title: "Brand guidelines v2", source: "Notion", linked_to: "HOWL-BRD-01", updated_on: d(-8) },
    { id: id("doc"), title: "Q4 tour pricing sheet", source: "Google Drive", linked_to: "HOWL-VTO-01", updated_on: d(-2) },
    { id: id("doc"), title: "Studio website sitemap", source: "Notion", linked_to: "HOWL-WEB-01", updated_on: d(-3) },
    { id: id("doc"), title: "Vietnam guide licensing (gov.vn)", source: "Link", linked_to: null, updated_on: d(-20) },
  ] satisfies PreviewData["documents"];

  const goals = [
    { id: id("goal"), title: "Emergency fund: 6 months", area: "Finance", current: 120_000_000, target: 180_000_000, unit: "VND", due_on: d(90) },
    { id: id("goal"), title: "HCMC Marathon under 4:00", area: "Fitness", current: 22, target: 42, unit: "km long run", due_on: d(75) },
    { id: id("goal"), title: "Ship Personal OS Phase 1", area: "Career", current: 4, target: 22, unit: "tasks", due_on: d(28) },
    { id: id("goal"), title: "Read 24 books", area: "Learning", current: 17, target: 24, unit: "books", due_on: d(93) },
    { id: id("goal"), title: "Studio revenue 1.2B VND", area: "Finance", current: 812_000_000, target: 1_200_000_000, unit: "VND", due_on: d(93) },
  ] satisfies PreviewData["goals"];

  const habits = [
    { id: id("hab"), name: "Morning run", cadence: "3× week", streak: 5, last7: [true, false, true, false, true, false, true] },
    { id: id("hab"), name: "Inbox zero by 18:00", cadence: "Weekdays", streak: 3, last7: [true, true, false, true, true, true, false] },
    { id: id("hab"), name: "Read 20 pages", cadence: "Daily", streak: 12, last7: [true, true, true, true, true, true, true] },
    { id: id("hab"), name: "Log expenses", cadence: "Daily", streak: 2, last7: [false, true, true, false, false, true, true] },
    { id: id("hab"), name: "Weekly review", cadence: "Weekly", streak: 8, last7: [false, false, false, false, false, false, true] },
  ] satisfies PreviewData["habits"];

  const memories = [
    { id: id("mem"), content: "Prefers deep work before 11:00; no meetings in the morning.", kind: "preference", subject: "Howls", source: "manual", confidence: 1, valid_from: d(-60) },
    { id: id("mem"), content: "Nam (Mekong Trails) decides on budget; Thảo handles bookings day to day.", kind: "context", subject: "Mekong Trails", source: "email", confidence: 0.9, valid_from: d(-20) },
    { id: id("mem"), content: "Expenses under 50,000 VND may be auto-recorded by AI; larger ones need approval (ADR-012).", kind: "decision", subject: "Finance", source: "manual", confidence: 1, valid_from: d(0) },
    { id: id("mem"), content: "Mẹ's birthday is 12 November; she likes lotus tea.", kind: "fact", subject: "Mẹ", source: "manual", confidence: 1, valid_from: d(-300) },
    { id: id("mem"), content: "Lotus Print needs proofs approved 7 days before a print run.", kind: "fact", subject: "Lotus Print Co.", source: "note", confidence: 0.8, valid_from: d(-15) },
    { id: id("mem"), content: "Minh runs Sunday mornings at Thảo Điền, 5:30.", kind: "fact", subject: "Nguyễn Văn Minh", source: "ai_command", confidence: 0.7, valid_from: d(-9) },
  ] satisfies PreviewData["memories"];

  const events = [
    { id: id("evt"), title: "Deep work: Personal OS auth", starts_at: at(0, "08:30"), ends_at: at(0, "11:00"), calendar: "Focus", location: null },
    { id: id("evt"), title: "Mekong Trails weekly sync", starts_at: at(0, "14:00"), ends_at: at(0, "14:45"), calendar: "Work", location: "Google Meet" },
    { id: id("evt"), title: "Design review with Hà", starts_at: at(0, "16:00"), ends_at: at(0, "16:30"), calendar: "Work", location: "HOWL LAB" },
    { id: id("evt"), title: "Easy run 8 km", starts_at: at(0, "18:15"), ends_at: at(0, "19:00"), calendar: "Personal", location: "Thảo Điền" },
    { id: id("evt"), title: "Lotus Print: proof approval", starts_at: at(1, "10:00"), ends_at: at(1, "10:30"), calendar: "Work", location: "District 3" },
    { id: id("evt"), title: "Coffee with Bảo (Saigon Ventures)", starts_at: at(2, "09:00"), ends_at: at(2, "10:00"), calendar: "Work", location: "The Workshop" },
    { id: id("evt"), title: "Weekly review", starts_at: at(4, "17:00"), ends_at: at(4, "18:00"), calendar: "Focus", location: null },
    { id: id("evt"), title: "Long run 22 km", starts_at: at(5, "05:30"), ends_at: at(5, "08:00"), calendar: "Personal", location: "Thảo Điền" },
  ] satisfies PreviewData["events"];

  const approvals = [
    { id: id("ai"), tool: "gmail.send_draft", summary: "Send follow-up to Lê Hoàng Nam about the Q4 itinerary changes", client: "ChatGPT", risk: "medium", requested_at: new Date(Date.now() - 25 * 60_000).toISOString(), expires_at: new Date(Date.now() + 23 * 3_600_000).toISOString() },
    { id: id("ai"), tool: "finance.record_expense", summary: "Record 2,190,000 VND, Nike Store (Health), above the 50,000 VND auto-approve limit", client: "Cursor", risk: "medium", requested_at: new Date(Date.now() - 3 * 3_600_000).toISOString(), expires_at: new Date(Date.now() + 21 * 3_600_000).toISOString() },
    { id: id("ai"), tool: "tasks.bulk_update", summary: "Move 4 HOWL-WEB-01 tasks to next sprint and shift due dates by 7 days", client: "Cursor", risk: "low", requested_at: new Date(Date.now() - 5 * 3_600_000).toISOString(), expires_at: new Date(Date.now() + 19 * 3_600_000).toISOString() },
  ] satisfies PreviewData["approvals"];

  const apiKeys = [
    { id: id("key"), name: "Cursor MCP (laptop)", prefix: "pk_test_7f3a", scopes: ["tasks:read", "tasks:write", "projects:read"], last_used_at: new Date(Date.now() - 40 * 60_000).toISOString(), created_on: d(-2), kind: "api_key" },
    { id: id("key"), name: "Shortcuts: quick capture", prefix: "pk_test_c21e", scopes: ["tasks:write"], last_used_at: new Date(Date.now() - 26 * 3_600_000).toISOString(), created_on: d(-10), kind: "api_key" },
    { id: id("key"), name: "ChatGPT connector", prefix: "oauth:chatgpt", scopes: ["tasks:read", "tasks:write"], last_used_at: null, created_on: d(0), kind: "oauth_grant" },
  ] satisfies PreviewData["apiKeys"];

  return { accounts, transactions, budgets, debts, people, inbox, campaigns, notes, documents, goals, habits, memories, events, approvals, apiKeys };
}
