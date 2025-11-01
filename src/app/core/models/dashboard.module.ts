export interface SaleRow {
  month: string;
  revenue: number;
  orders: number;
  returns: number;
}

export interface ActivityRow {
  date: string; // ISO yyyy-mm-dd
  activeUsers: number;
  newUsers: number;
  sessions: number;
}

export interface EngagementRow {
  platform: string; // Web | iOS | Android
  pageViews: number;
  avgSessionDuration: number; // minutes
  bounceRate: number; // percent
}

export interface ProductRow {
  product: string;
  sales: number;
  revenue: number;
}

export interface DashboardData {
  sales: SaleRow[];
  userActivity: ActivityRow[];
  engagement: EngagementRow[];
  topProducts: ProductRow[];
}
