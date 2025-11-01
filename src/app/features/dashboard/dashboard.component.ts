import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardDataService } from '../../core/services/dashboard-data.service';
import {
  ActivityRow,
  DashboardData,
  EngagementRow,
  ProductRow,
  SaleRow,
} from '../../core/models/dashboard.module';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private readonly dataSvc = inject(DashboardDataService);

  sales: SaleRow[] = [];
  activity: ActivityRow[] = [];
  engagement: EngagementRow[] = [];
  products: ProductRow[] = [];

  ngOnInit(): void {
    this.dataSvc.getDashboardData().subscribe((data: DashboardData) => {
      this.sales = data.sales;
      this.activity = data.userActivity;
      this.engagement = data.engagement;
      this.products = data.topProducts;
    });
  }

  getTotalRevenue(): number {
    return this.products.reduce((sum, product) => sum + product.revenue, 0);
  }

  getTotalUsers(): number {
    return this.activity.reduce((sum, day) => sum + day.activeUsers, 0) / this.activity.length;
  }

  getTotalSessions(): number {
    return this.activity.reduce((sum, day) => sum + day.sessions, 0);
  }

  getAvgSessionDuration(): number {
    if (this.engagement.length === 0) return 0;
    const total = this.engagement.reduce((sum, e) => sum + e.avgSessionDuration, 0);
    return Math.round((total / this.engagement.length) * 10) / 10;
  }

  getBounceRateClass(bounceRate: number): string {
    if (bounceRate >= 60) return 'bg-danger-subtle text-danger';
    if (bounceRate >= 40) return 'bg-warning-subtle text-warning';
    return 'bg-success-subtle text-success';
  }
}
