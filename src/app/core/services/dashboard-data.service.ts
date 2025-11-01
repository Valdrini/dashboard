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
