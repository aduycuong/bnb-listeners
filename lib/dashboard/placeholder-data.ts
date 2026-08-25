export type ChatItem = {
  id: string;
  title: string;
  icon: string;
  iconColor: string;
};

export type TeamProject = {
  id: string;
  name: string;
};

export type ChatAgent = {
  id: string;
  name: string;
  role: string;
  description: string;
  avatarColor: string;
  initials: string;
  createdAt: string;
};

export type Skill = {
  id: string;
  name: string;
  description: string;
  category: string;
  agentCount: number;
  createdAt: string;
};

export type Tool = {
  id: string;
  name: string;
  description: string;
  type: "api" | "mcp" | "builtin";
  enabled: boolean;
  createdAt: string;
};

export type KnowledgeBase = {
  id: string;
  name: string;
  description: string;
  documentCount: number;
  updatedAt: string;
  createdAt: string;
};

export type Connection = {
  id: string;
  name: string;
  description: string;
  channel: "facebook" | "website" | "whatsapp" | "telegram";
  status: "connected" | "disconnected" | "pending";
  agentName: string;
  createdAt: string;
};

export type ToolChip = {
  id: string;
  label: string;
  color: string;
};

/** @deprecated Use PLACEHOLDER_CHAT_AGENTS */
export type Assistant = ChatAgent;

export const PLACEHOLDER_TEAM_PROJECTS: TeamProject[] = [
  { id: "tp-1", name: "Website Redesign" },
  { id: "tp-2", name: "Mobile App Launch" },
  { id: "tp-3", name: "Guest Onboarding" },
];

export const PLACEHOLDER_CHATS: ChatItem[] = [
  {
    id: "c-1",
    title: "Pricing strategy Q3",
    icon: "P",
    iconColor: "bg-rose-100 text-rose-600",
  },
  {
    id: "c-2",
    title: "Listing copy review",
    icon: "L",
    iconColor: "bg-sky-100 text-sky-600",
  },
  {
    id: "c-3",
    title: "Check-in automation",
    icon: "C",
    iconColor: "bg-emerald-100 text-emerald-600",
  },
  {
    id: "c-4",
    title: "Competitor analysis",
    icon: "A",
    iconColor: "bg-amber-100 text-amber-600",
  },
  {
    id: "c-5",
    title: "Weekly ops summary",
    icon: "W",
    iconColor: "bg-violet-100 text-violet-600",
  },
];

export const PLACEHOLDER_CHAT_AGENTS: ChatAgent[] = [
  {
    id: "a-1",
    name: "Patrick",
    role: "Listing Writer",
    description: "Craft compelling property descriptions and headlines.",
    avatarColor: "bg-orange-100 text-orange-700",
    initials: "P",
    createdAt: "2026-07-12T09:15:00.000Z",
  },
  {
    id: "a-2",
    name: "Emily",
    role: "Guest Support",
    description: "Draft replies for guest messages and FAQs.",
    avatarColor: "bg-pink-100 text-pink-700",
    initials: "E",
    createdAt: "2026-07-18T14:30:00.000Z",
  },
  {
    id: "a-3",
    name: "Marcus",
    role: "Pricing Analyst",
    description: "Analyze rates, seasonality, and competitor pricing.",
    avatarColor: "bg-blue-100 text-blue-700",
    initials: "M",
    createdAt: "2026-06-28T11:00:00.000Z",
  },
  {
    id: "a-4",
    name: "Sofia",
    role: "Ops Planner",
    description: "Plan turnovers, maintenance, and vendor schedules.",
    avatarColor: "bg-teal-100 text-teal-700",
    initials: "S",
    createdAt: "2026-08-01T08:45:00.000Z",
  },
  {
    id: "a-5",
    name: "Leo",
    role: "Marketing",
    description: "Create social posts and email campaigns for listings.",
    avatarColor: "bg-indigo-100 text-indigo-700",
    initials: "L",
    createdAt: "2026-07-05T16:20:00.000Z",
  },
  {
    id: "a-6",
    name: "Nina",
    role: "Review Responder",
    description: "Write thoughtful responses to guest reviews.",
    avatarColor: "bg-lime-100 text-lime-700",
    initials: "N",
    createdAt: "2026-07-22T10:10:00.000Z",
  },
];

/** @deprecated Use PLACEHOLDER_CHAT_AGENTS */
export const PLACEHOLDER_ASSISTANTS = PLACEHOLDER_CHAT_AGENTS;

export const PLACEHOLDER_SKILLS: Skill[] = [
  {
    id: "s-1",
    name: "Listing copywriting",
    description: "Write SEO-friendly titles and descriptions for short-term rentals.",
    category: "Content",
    agentCount: 2,
    createdAt: "2026-06-15T10:00:00.000Z",
  },
  {
    id: "s-2",
    name: "Guest message replies",
    description: "Draft polite, on-brand replies to common guest questions.",
    category: "Support",
    agentCount: 3,
    createdAt: "2026-06-20T08:30:00.000Z",
  },
  {
    id: "s-3",
    name: "Pricing recommendations",
    description: "Suggest nightly rates based on seasonality and local demand.",
    category: "Revenue",
    agentCount: 1,
    createdAt: "2026-07-01T12:00:00.000Z",
  },
  {
    id: "s-4",
    name: "Review responses",
    description: "Respond professionally to guest reviews and feedback.",
    category: "Support",
    agentCount: 2,
    createdAt: "2026-07-08T09:45:00.000Z",
  },
  {
    id: "s-5",
    name: "Turnover scheduling",
    description: "Coordinate cleaning and maintenance between bookings.",
    category: "Operations",
    agentCount: 1,
    createdAt: "2026-07-25T15:20:00.000Z",
  },
];

export const PLACEHOLDER_TOOLS: Tool[] = [
  {
    id: "t-1",
    name: "BNB CLI",
    description: "Manage listings, reservations, and property data.",
    type: "builtin",
    enabled: true,
    createdAt: "2026-06-10T11:00:00.000Z",
  },
  {
    id: "t-2",
    name: "Google Calendar",
    description: "Check availability and schedule turnovers.",
    type: "api",
    enabled: true,
    createdAt: "2026-06-18T13:30:00.000Z",
  },
  {
    id: "t-3",
    name: "GitHub",
    description: "Look up issues and documentation from repositories.",
    type: "mcp",
    enabled: true,
    createdAt: "2026-07-02T10:15:00.000Z",
  },
  {
    id: "t-4",
    name: "Google Sheets",
    description: "Read and update pricing spreadsheets.",
    type: "api",
    enabled: false,
    createdAt: "2026-07-14T16:00:00.000Z",
  },
  {
    id: "t-5",
    name: "Web search",
    description: "Search the web for market and competitor information.",
    type: "builtin",
    enabled: true,
    createdAt: "2026-05-28T09:00:00.000Z",
  },
];

export const PLACEHOLDER_KNOWLEDGE_BASES: KnowledgeBase[] = [
  {
    id: "kb-1",
    name: "Property guides",
    description: "House manuals, check-in instructions, and local tips.",
    documentCount: 24,
    updatedAt: "2026-08-01T11:30:00.000Z",
    createdAt: "2026-06-05T10:00:00.000Z",
  },
  {
    id: "kb-2",
    name: "Guest FAQ",
    description: "Answers to frequently asked guest questions.",
    documentCount: 18,
    updatedAt: "2026-07-28T09:15:00.000Z",
    createdAt: "2026-06-12T14:20:00.000Z",
  },
  {
    id: "kb-3",
    name: "Brand voice",
    description: "Tone, style, and messaging guidelines for all agents.",
    documentCount: 6,
    updatedAt: "2026-07-15T16:45:00.000Z",
    createdAt: "2026-07-01T08:00:00.000Z",
  },
  {
    id: "kb-4",
    name: "Pricing playbook",
    description: "Seasonal pricing rules and competitor benchmarks.",
    documentCount: 11,
    updatedAt: "2026-07-20T13:00:00.000Z",
    createdAt: "2026-06-25T11:30:00.000Z",
  },
];

export const PLACEHOLDER_CONNECTIONS: Connection[] = [
  {
    id: "cn-1",
    name: "Sunset Villa — Facebook Page",
    description: "Messenger inbox for guest inquiries and booking questions.",
    channel: "facebook",
    status: "connected",
    agentName: "Emily",
    createdAt: "2026-07-10T10:00:00.000Z",
  },
  {
    id: "cn-2",
    name: "Acme Properties website",
    description: "Embedded chat widget on the main booking site.",
    channel: "website",
    status: "connected",
    agentName: "Patrick",
    createdAt: "2026-06-22T15:30:00.000Z",
  },
  {
    id: "cn-3",
    name: "Coastal Stays — WhatsApp",
    description: "WhatsApp Business channel for guest support.",
    channel: "whatsapp",
    status: "pending",
    agentName: "Emily",
    createdAt: "2026-08-02T09:00:00.000Z",
  },
  {
    id: "cn-4",
    name: "Ops team Telegram",
    description: "Internal alerts and turnover coordination.",
    channel: "telegram",
    status: "disconnected",
    agentName: "Sofia",
    createdAt: "2026-07-05T12:45:00.000Z",
  },
];

export const PLACEHOLDER_TOOL_CHIPS: ToolChip[] = [
  { id: "t-1", label: "BNB CLI", color: "bg-neutral-900 text-white" },
  { id: "t-2", label: "GitHub", color: "bg-neutral-800 text-white" },
  { id: "t-3", label: "Calendar", color: "bg-blue-600 text-white" },
  { id: "t-4", label: "Docs", color: "bg-emerald-600 text-white" },
  { id: "t-5", label: "Sheets", color: "bg-green-700 text-white" },
];
