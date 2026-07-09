export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  avatarColor: string;
  createdAt: string;
}

export interface Template {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  gradient: string;
  accentColor: string;
  promptTemplate: string;
  sceneCount: number;
  isSystem: boolean;
}

export interface Scene {
  index: number;
  heading: string;
  narration: string;
  caption: string;
  durationSec: number;
  stat?: string;
}

export interface GeneratedContent {
  topic: string;
  title: string;
  hook: string;
  script: string;
  scenes: Scene[];
  caption: string;
  hashtags: string[];
  tiktokDescription: string;
  instagramDescription: string;
  youtubeDescription: string;
  thumbnailText: string;
  cta: string;
}

export type VideoStatus = 'DRAFT' | 'QUEUED' | 'RENDERING' | 'READY' | 'FAILED';

export interface Video {
  id: string;
  userId: string;
  title: string;
  topic: string;
  templateKey: string;
  status: VideoStatus;
  hook: string;
  script: string;
  scenes: Scene[];
  caption: string;
  hashtags: string[];
  tiktokDescription: string;
  instagramDescription: string;
  youtubeDescription: string;
  thumbnailText: string;
  cta: string;
  videoPath: string | null;
  thumbnailPath: string | null;
  durationSec: number;
  width: number;
  height: number;
  fps: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExportJob {
  id: string;
  videoId: string;
  status: VideoStatus;
  progress: number;
  stage: string;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  video?: Video;
}

export interface BrandSettings {
  id: string;
  userId: string;
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  fontFamily: 'BigShoulders' | 'Arsenal' | 'BigShouldersRegular';
  watermarkText: string;
  watermarkEnabled: boolean;
  logoPath: string | null;
  outroPath: string | null;
  ctaText: string;
}

export interface Prompt {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  content: string;
  isSystem: boolean;
}

export interface AnalyticsOverview {
  totals: {
    videos: number;
    ready: number;
    exports: number;
    rendersCompleted: number;
    minutesRendered: number;
  };
  byTemplate: Record<string, number>;
  timeline: { date: string; count: number; rendered: number }[];
}

export interface AdminStats {
  users: number;
  videos: number;
  rendered: number;
  jobs: number;
  prompts: number;
  templates: number;
  queueDepth: number;
  openai: { configured: boolean; model: string };
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  avatarColor: string;
  createdAt: string;
  _count: { videos: number; exportJobs: number };
}

export interface LogEntry {
  id: string;
  level: string;
  message: string;
  context: string;
  userId: string | null;
  createdAt: string;
}

/* ─────────────── Owner console (/users) ─────────────── */

export type UserPlan = 'free' | 'creator' | 'studio';
export type UserStatus = 'active' | 'trial' | 'expired' | 'banned';

export interface ConsoleUser {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  avatarColor: string;
  plan: UserPlan;
  status: UserStatus;
  premiumUntil: string | null;
  usageResetAt: string;
  lastActivityAt: string;
  createdAt: string;
  videos: number;
  exports: number;
}

export interface ConsoleMetrics {
  totals: {
    totalUsers: number;
    activeUsers: number;
    premiumUsers: number;
    bannedUsers: number;
    totalVideos: number;
    rendered: number;
    totalExports: number;
  };
  timeline: { date: string; signups: number; renders: number }[];
}

export interface ActivityItem {
  id: string;
  userId: string | null;
  type: string;
  message: string;
  meta: string;
  createdAt: string;
  user?: { email: string; name: string; avatarColor: string } | null;
}

export interface ConsoleUserDetail {
  user: ConsoleUser;
  activity: ActivityItem[];
  videos: { id: string; title: string; status: VideoStatus; templateKey: string; createdAt: string }[];
  failedRenders: number;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
  note: string;
  createdAt: string;
  updatedAt: string;
}

/* ─────────────── Expense tracker (/expenses) ─────────────── */

export type ExpenseStatus = 'paid' | 'pending' | 'cancelled';
export type RecurringFrequency = 'monthly' | 'yearly' | 'weekly' | 'custom';

export interface ExpenseCategory {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface ExpenseProject {
  id: string;
  name: string;
  notes: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  expenseCount: number;
  currency: string;
  totalSpent: number;
  oneTime: number;
  monthlyRecurring: number;
  yearlyRecurring: number;
  pending: number;
}

export interface Expense {
  id: string;
  projectId: string;
  title: string;
  category: string;
  vendor: string;
  paymentMethod: string;
  amount: number;
  currency: string;
  datePaid: string;
  isRecurring: boolean;
  recurringFrequency: RecurringFrequency | null;
  nextPaymentDate: string | null;
  status: ExpenseStatus;
  notes: string;
  addedBy: string;
  createdAt: string;
  updatedAt: string;
  project?: { name: string };
}

export interface ExpenseDashboard {
  baseCurrency: string;
  currencies: string[];
  totals: {
    totalSpent: number;
    monthlyRecurring: number;
    yearlyRecurring: number;
    pending: number;
    oneTime: number;
    projectCount: number;
    expenseCount: number;
  };
  byProject: Record<string, number>;
  byCategory: Record<string, number>;
  upcoming: {
    id: string;
    title: string;
    project: string;
    amount: number;
    currency: string;
    frequency: RecurringFrequency | null;
    nextPaymentDate: string;
    overdue: boolean;
  }[];
  recent: {
    id: string;
    title: string;
    project: string;
    category: string;
    amount: number;
    currency: string;
    status: ExpenseStatus;
    datePaid: string;
  }[];
}

export interface ExpenseProjectDetail {
  project: ExpenseProject;
  expenses: Expense[];
  byCategory: Record<string, number>;
  byPaymentMethod: Record<string, number>;
}

export interface ExpenseFilters {
  search?: string;
  projectId?: string;
  category?: string;
  status?: string;
  recurring?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ExpenseInput {
  projectId: string;
  title: string;
  category: string;
  vendor?: string;
  paymentMethod?: string;
  amount: number;
  currency: string;
  datePaid: string;
  isRecurring: boolean;
  recurringFrequency?: RecurringFrequency | null;
  nextPaymentDate?: string | null;
  status: ExpenseStatus;
  notes?: string;
  addedBy?: string;
}
