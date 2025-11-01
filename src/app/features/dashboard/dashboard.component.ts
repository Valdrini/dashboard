import { Component, OnInit, inject, ViewChild, ElementRef, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardDataService } from '../../core/services/dashboard-data.service';
import { DashboardLayoutService } from '../../core/services/dashboard-layout.service';
import {
  ActivityRow,
  DashboardData,
  EngagementRow,
  ProductRow,
  SaleRow,
} from '../../core/models/dashboard.module';
import { Chart, registerables } from 'chart.js';
import { GridStack } from 'gridstack';
import { Subscription } from 'rxjs';

// Register all Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly dataSvc = inject(DashboardDataService);
  private readonly layoutService = inject(DashboardLayoutService);
  private readonly cdr = inject(ChangeDetectorRef);
  private subscriptions = new Subscription();

  sales: SaleRow[] = [];
  activity: ActivityRow[] = [];
  engagement: EngagementRow[] = [];
  products: ProductRow[] = [];

  // Filter states
  dateRange: string = '7d';
  // searchTerm: string = '';
  
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

  // Gridstack
  @ViewChild('gridStack') gridStackRef?: ElementRef<HTMLDivElement>;
  private grid?: GridStack;

  // Store original data for filtering
  originalActivity: ActivityRow[] = [];
  originalEngagement: EngagementRow[] = [];
  originalProducts: ProductRow[] = [];

  // Layout editing state
  isEditMode: boolean = false;

  ngOnInit(): void {
    this.loadData();
    
    // Subscribe to layout service events
    this.subscriptions.add(
      this.layoutService.toggleEditMode$.subscribe(() => {
        this.toggleEditMode();
      })
    );
    
    this.subscriptions.add(
      this.layoutService.saveLayout$.subscribe(() => {
        this.saveLayout();
      })
    );
  }

  ngAfterViewInit(): void {
    // Initialize after view is ready and data is loaded
    this.waitForDataAndInit();
  }
  
  private waitForDataAndInit(): void {
    // Check if data is loaded and DOM elements exist
    if (this.activity.length === 0 || !this.gridStackRef?.nativeElement) {
      setTimeout(() => this.waitForDataAndInit(), 50);
      return;
    }
    
    // Wait a bit more to ensure Angular has fully compiled the template
    setTimeout(() => {
      // Force change detection to ensure DOM is fully rendered
      this.cdr.detectChanges();
      
        // Initialize charts first, then grid after charts are ready
        this.initializeCharts(() => {
          // Force another change detection before initializing grid
          this.cdr.detectChanges();
          this.initializeGridStack();
        });
    }, 100);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if ((this as any).saveTimeout) {
      clearTimeout((this as any).saveTimeout);
    }
    if (this.grid) {
      this.grid.destroy(false);
    }
  }

  initializeGridStack(): void {
    if (!this.gridStackRef) {
      setTimeout(() => this.initializeGridStack(), 100);
      return;
    }

    this.grid = GridStack.init(
      {
        cellHeight: 70,
        margin: 16,
        animate: true,
        float: true,
        column: 12,
        staticGrid: true,
        draggable: {
          handle: '.widget-header, .stat-card',
        },
        resizable: {
          handles: 'e, se, s, sw, w'
        },
      },
      this.gridStackRef.nativeElement
    );

    // Auto-save layout on change (only when in edit mode)
    this.grid.on('change', () => {
      if (this.isEditMode) {
        // Debounce save to avoid too many localStorage writes
        if ((this as any).saveTimeout) {
          clearTimeout((this as any).saveTimeout);
        }
        (this as any).saveTimeout = setTimeout(() => {
          this.saveLayout();
        }, 300);
      }
    });

    // Load saved layout after grid initialization and Angular has rendered content
    // Use setTimeout with longer delay to ensure Angular bindings are fully processed
    setTimeout(() => {
      this.loadGridLayout();
      // Force change detection after loading layout
      this.cdr.detectChanges();
    }, 200);
  }
  
  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
    if (this.grid) {
      if (this.isEditMode) {
        this.grid.setStatic(false);
      } else {
        this.grid.setStatic(true);
      }
    }
  }
  
  saveLayout(): void {
    if (this.grid) {
      // Save only layout positions and sizes, not content (to preserve Angular bindings)
      const layout = this.grid.save(false);
      localStorage.setItem('dashboardLayout', JSON.stringify(layout));
      
      // Show notification
      const btn = document.querySelector('.save-layout-btn');
      if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Saved!';
        btn.classList.add('btn-success');
        btn.classList.remove('btn-primary');
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.classList.remove('btn-success');
          btn.classList.add('btn-primary');
        }, 2000);
      }
    }
  }

  loadGridLayout(): void {
    const savedLayout = localStorage.getItem('dashboardLayout');
    if (savedLayout && this.grid) {
      try {
        const layout = JSON.parse(savedLayout);
        
        // Check if layout contains content (old corrupted format) - if so, filter it
        const cleanLayout = Array.isArray(layout) ? layout.map((item: any) => {
          // Only keep position/size data, remove any content
          const clean: any = {
            id: item.id || item.gsId,
            x: item.x ?? item.gsX,
            y: item.y ?? item.gsY,
            w: item.w ?? item.gsW,
            h: item.h ?? item.gsH
          };
          // Remove undefined/null values
          Object.keys(clean).forEach(key => {
            if (clean[key] === undefined || clean[key] === null || clean[key] === '') {
              delete clean[key];
            }
          });
          return clean;
        }).filter((item: any) => item.id && item.x !== undefined && item.y !== undefined) : layout;
        
        // Manually update positions to preserve Angular bindings
        // Instead of using load() which might manipulate DOM, update each item individually
        if (cleanLayout && Array.isArray(cleanLayout) && cleanLayout.length > 0 && this.gridStackRef) {
          cleanLayout.forEach((item: any) => {
            // Find the grid item by gs-id attribute
            const node = this.gridStackRef?.nativeElement.querySelector(`[gs-id="${item.id}"]`) as HTMLElement;
            if (node && this.grid) {
              // Use GridStack's update method to change position without breaking bindings
              this.grid.update(node, {
                x: item.x,
                y: item.y,
                w: item.w,
                h: item.h
              });
            }
          });
        }
      } catch (e) {
        console.error('Failed to load saved layout:', e);
        // Clear invalid layout
        localStorage.removeItem('dashboardLayout');
      }
    }
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

  initializeCharts(callback?: () => void): void {
    if (!this.lineChartRef || !this.barChartRef || !this.pieChartRef) {
      setTimeout(() => this.initializeCharts(callback), 100);
      return;
    }
    
    this.createLineChart();
    this.createBarChart();
    this.createPieChart();
    
    // Call callback after charts are initialized - give more time for Chart.js to render
    if (callback) {
      setTimeout(callback, 300);
    }
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
    // if (this.searchTerm) {
    //   const search = this.searchTerm.toLowerCase();
    //   filteredActivity = filteredActivity.filter(item => 
    //     item.date.toLowerCase().includes(search) ||
    //     item.activeUsers.toString().includes(search) ||
    //     item.newUsers.toString().includes(search) ||
    //     item.sessions.toString().includes(search)
    //   );
    // }
    
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

  // onSearch(): void {
  //   this.currentPage = 1;
  //   this.applyFilters();
  //   this.updateCharts();
  // }

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
