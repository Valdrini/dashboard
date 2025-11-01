import { Injectable } from '@angular/core';
import { DashboardData } from '../models/dashboard.module';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DashboardDataService {
  // Static data; can be replaced by HTTP later
  private readonly data: DashboardData = {
    sales: [
      { month: 'January', revenue: 12000, orders: 310, returns: 12 },
      { month: 'February', revenue: 15000, orders: 355, returns: 15 },
      { month: 'March', revenue: 18000, orders: 390, returns: 14 },
      { month: 'April', revenue: 22000, orders: 420, returns: 10 },
      { month: 'May', revenue: 26000, orders: 460, returns: 8 },
      { month: 'June', revenue: 30000, orders: 510, returns: 6 },
    ],
    userActivity: [
      { date: '2025-06-01', activeUsers: 520, newUsers: 120, sessions: 850 },
      { date: '2025-06-02', activeUsers: 580, newUsers: 140, sessions: 910 },
      { date: '2025-06-03', activeUsers: 600, newUsers: 150, sessions: 980 },
      { date: '2025-06-04', activeUsers: 640, newUsers: 165, sessions: 1050 },
      { date: '2025-06-05', activeUsers: 690, newUsers: 180, sessions: 1120 },
      { date: '2025-06-06', activeUsers: 720, newUsers: 195, sessions: 1180 },
      { date: '2025-06-07', activeUsers: 750, newUsers: 210, sessions: 1250 },
      { date: '2025-06-08', activeUsers: 680, newUsers: 190, sessions: 1150 },
      { date: '2025-06-09', activeUsers: 710, newUsers: 200, sessions: 1200 },
      { date: '2025-06-10', activeUsers: 740, newUsers: 215, sessions: 1280 },
      { date: '2025-06-11', activeUsers: 680, newUsers: 185, sessions: 1130 },
      { date: '2025-06-12', activeUsers: 760, newUsers: 220, sessions: 1320 },
      { date: '2025-06-13', activeUsers: 790, newUsers: 240, sessions: 1400 },
      { date: '2025-06-14', activeUsers: 720, newUsers: 210, sessions: 1220 },
      { date: '2025-06-15', activeUsers: 770, newUsers: 230, sessions: 1350 },
    ],
    engagement: [
      {
        platform: 'Web',
        pageViews: 12000,
        avgSessionDuration: 4.3,
        bounceRate: 42,
      },
      {
        platform: 'iOS',
        pageViews: 9000,
        avgSessionDuration: 5.1,
        bounceRate: 37,
      },
      {
        platform: 'Android',
        pageViews: 11000,
        avgSessionDuration: 4.8,
        bounceRate: 39,
      },
    ],
    topProducts: [
      { product: 'Premium Plan', sales: 1200, revenue: 36000 },
      { product: 'Standard Plan', sales: 1980, revenue: 29700 },
      { product: 'Basic Plan', sales: 2500, revenue: 25000 },
    ],
  };

  getDashboardData(): Observable<DashboardData> {
    return of(this.data);
  }
}
