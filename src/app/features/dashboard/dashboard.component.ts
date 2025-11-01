import { Component, OnInit, inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardDataService } from '../../core/services/dashboard-data.service';
import {
  ActivityRow,
  DashboardData,
  EngagementRow,
  ProductRow,
  SaleRow,
} from '../../core/models/dashboard.module';
import { Chart, registerables } from 'chart.js';

// Register all Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, AfterViewInit {
  private readonly dataSvc = inject(DashboardDataService);

  sales: SaleRow[] = [];
  activity: ActivityRow[] = [];
  engagement: EngagementRow[] = [];
  products: ProductRow[] = [];

  // Filter states
  dateRange: string = '7d';
  searchTerm: string = '';
  
  // Table states
  sortedColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage: number = 1;
  itemsPerPage: number = 5;

  // Charts
  @ViewChild('lineChart') lineChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('barChart') barChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('pieChart') pieChartRef?: ElementRef<HTMLCanvasElement>;
  
  lineChart?: Chart;
  barChart?: Chart;
  pieChart?: Chart;

  // Store original data for filtering
  originalActivity: ActivityRow[] = [];
  originalEngagement: EngagementRow[] = [];
  originalProducts: ProductRow[] = [];

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initializeCharts();
    }, 100);
  }

  loadData(): void {
    this.dataSvc.getDashboardData().subscribe((data: DashboardData) => {
      this.sales = data.sales;
      this.activity = data.userActivity;
      this.engagement = data.engagement;
      this.products = data.topProducts;
      
      // Store original data
      this.originalActivity = [...data.userActivity];
      this.originalEngagement = [...data.engagement];
      this.originalProducts = [...data.topProducts];
      
      // Apply filters
      this.applyFilters();
      
      // Update charts if they exist
      if (this.lineChart && this.barChart && this.pieChart) {
        this.updateCharts();
      }
    });
  }

  initializeCharts(): void {
    if (!this.lineChartRef || !this.barChartRef || !this.pieChartRef) {
      setTimeout(() => this.initializeCharts(), 100);
      return;
    }
    
    this.createLineChart();
    this.createBarChart();
    this.createPieChart();
  }
  
  applyFilters(): void {
    // Apply date range filter (for demo, just limit number of records)
    let filteredActivity = [...this.originalActivity];
    
    if (this.dateRange === '7d') {
      filteredActivity = this.originalActivity.slice(0, 7);
    } else if (this.dateRange === '30d') {
      filteredActivity = this.originalActivity.slice(0, 30);
    } else if (this.dateRange === '90d') {
      filteredActivity = this.originalActivity.slice(0, 90);
    } else if (this.dateRange === 'all') {
      filteredActivity = [...this.originalActivity];
    }
    
    // Apply search filter
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filteredActivity = filteredActivity.filter(item => 
        item.date.toLowerCase().includes(search) ||
        item.activeUsers.toString().includes(search) ||
        item.newUsers.toString().includes(search) ||
        item.sessions.toString().includes(search)
      );
    }
    
    this.activity = filteredActivity;
  }

  createLineChart(): void {
    if (!this.lineChartRef) return;
    
    const ctx = this.lineChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.lineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.activity.map(a => a.date),
        datasets: [
          {
            label: 'Active Users',
            data: this.activity.map(a => a.activeUsers),
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Sessions',
            data: this.activity.map(a => a.sessions),
            borderColor: '#764ba2',
            backgroundColor: 'rgba(118, 75, 162, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  createBarChart(): void {
    if (!this.barChartRef) return;
    
    const ctx = this.barChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.engagement.map(e => e.platform),
        datasets: [
          {
            label: 'Page Views',
            data: this.engagement.map(e => e.pageViews),
            backgroundColor: [
              'rgba(102, 126, 234, 0.8)',
              'rgba(118, 75, 162, 0.8)',
              'rgba(13, 202, 240, 0.8)'
            ],
            borderColor: [
              '#667eea',
              '#764ba2',
              '#0dcaf0'
            ],
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  createPieChart(): void {
    if (!this.pieChartRef) return;
    
    const ctx = this.pieChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.pieChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: this.products.map(p => p.product),
        datasets: [
          {
            data: this.products.map(p => p.revenue),
            backgroundColor: [
              'rgba(102, 126, 234, 0.8)',
              'rgba(118, 75, 162, 0.8)',
              'rgba(13, 202, 240, 0.8)',
              'rgba(255, 206, 86, 0.8)',
              'rgba(255, 99, 132, 0.8)'
            ],
            borderColor: '#fff',
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: false
          }
        }
      }
    });
  }

  updateCharts(): void {
    if (this.lineChart) {
      this.lineChart.data.labels = this.activity.map(a => a.date);
      this.lineChart.data.datasets[0].data = this.activity.map(a => a.activeUsers);
      this.lineChart.data.datasets[1].data = this.activity.map(a => a.sessions);
      this.lineChart.update();
    }
    
    if (this.barChart) {
      this.barChart.data.labels = this.engagement.map(e => e.platform);
      this.barChart.data.datasets[0].data = this.engagement.map(e => e.pageViews);
      this.barChart.update();
    }
    
    if (this.pieChart) {
      this.pieChart.data.labels = this.products.map(p => p.product);
      this.pieChart.data.datasets[0].data = this.products.map(p => p.revenue);
      this.pieChart.update();
    }
  }

  onDateRangeChange(): void {
    this.currentPage = 1;
    this.applyFilters();
    this.updateCharts();
  }

  onSearch(): void {
    this.currentPage = 1;
    this.applyFilters();
    this.updateCharts();
  }

  sortTable(column: string): void {
    if (this.sortedColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortedColumn = column;
      this.sortDirection = 'asc';
    }

    // Create a copy before sorting
    let dataToSort = [...this.activity];
    
    dataToSort = dataToSort.sort((a, b) => {
      const aValue = a[column as keyof ActivityRow];
      const bValue = b[column as keyof ActivityRow];
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return this.sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      const aStr = String(aValue);
      const bStr = String(bValue);
      return this.sortDirection === 'asc' 
        ? aStr.localeCompare(bStr) 
        : bStr.localeCompare(aStr);
    });
    
    this.activity = dataToSort;
  }

  get paginatedActivity(): ActivityRow[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.activity.slice(start, end);
  }

  get totalPages(): number {
    return Math.ceil(this.activity.length / this.itemsPerPage);
  }
  
  get pagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
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
