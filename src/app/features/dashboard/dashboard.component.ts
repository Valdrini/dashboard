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
import zoomPlugin from 'chartjs-plugin-zoom';
import { GridStack } from 'gridstack';
import { Subscription } from 'rxjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Register all Chart.js components
Chart.register(...registerables, zoomPlugin);

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

  // Export modal state
  showExportModal: boolean = false;

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
      setTimeout(() => this.waitForDataAndInit(), 150);
      return;
    }

    setTimeout(() => {
      // Force change detection to ensure DOM is fully rendered
      this.cdr.detectChanges();

      // Initialize charts first, then grid after charts are ready
      this.initializeCharts(() => {
        // Detection before initializing grid
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

    // Determine column count based on screen size
    const getColumnCount = (): number => {
      if (window.innerWidth < 576) return 1;
      if (window.innerWidth < 768) return 2;
      if (window.innerWidth < 992) return 6;
      return 12;
    };

    // Determine cell height based on screen size
    const getCellHeight = (): number => {
      if (window.innerWidth < 576) return 80;
      if (window.innerWidth < 768) return 75;
      return 70;
    };

    // Determine margin based on screen size
    const getMargin = (): number => {
      if (window.innerWidth < 576) return 8;
      if (window.innerWidth < 768) return 12;
      return 15; // Default 15px gap for rows and columns
    };

    this.grid = GridStack.init(
      {
        cellHeight: getCellHeight(),
        margin: getMargin(),
        marginUnit: 'px',
        animate: true,
        float: true,
        column: getColumnCount(),
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

    const currentMargin = getMargin();
    this.grid.margin(currentMargin);

    const handleResize = (): void => {
      if (this.grid) {
        const newColumns = getColumnCount();
        const newCellHeight = getCellHeight();
        const newMargin = getMargin();

        const currentColumns = (this.grid as any).column();
        if (currentColumns !== newColumns) {
          this.grid.column(newColumns, 'none');
        }
        if ((this.grid as any).opts.cellHeight !== newCellHeight) {
          this.grid.cellHeight(newCellHeight);
        }
        if ((this.grid as any).opts.margin !== newMargin) {
          this.grid.margin(newMargin);
        }
      }
    };

    window.addEventListener('resize', handleResize);

    // Clean up event listener on destroy
    this.subscriptions.add({
      unsubscribe: () => window.removeEventListener('resize', handleResize)
    });

    // Auto-save layout on change
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

    // Load saved layout after grid initialization 
    setTimeout(() => {
      this.loadGridLayout();
      const currentMargin = getMargin();
      if (this.grid) {
        this.grid.margin(currentMargin);
      }
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
      // Save only layout positions and sizes
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

        // Check if layout contains content
        const cleanLayout = Array.isArray(layout) ? layout.map((item: any) => {
          const clean: any = {
            id: item.id || item.gsId,
            x: item.x ?? item.gsX,
            y: item.y ?? item.gsY,
            w: item.w ?? item.gsW,
            h: item.h ?? item.gsH
          };
          Object.keys(clean).forEach(key => {
            if (clean[key] === undefined || clean[key] === null || clean[key] === '') {
              delete clean[key];
            }
          });
          return clean;
        }).filter((item: any) => item.id && item.x !== undefined && item.y !== undefined) : layout;

        // Manually update positions to preserve bindings 
        if (cleanLayout && Array.isArray(cleanLayout) && cleanLayout.length > 0 && this.gridStackRef) {
          cleanLayout.forEach((item: any) => {
            const node = this.gridStackRef?.nativeElement.querySelector(`[gs-id="${item.id}"]`) as HTMLElement;
            if (node && this.grid) {
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

    // Call callback after charts are initialized
    if (callback) {
      setTimeout(callback, 300);
    }
  }

  applyFilters(): void {
    // Apply date range filter
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
          },
          tooltip: {
            enabled: true,
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#667eea',
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = (context.parsed.y ?? 0).toLocaleString();
                return `${label}: ${value}`;
              }
            }
          },
          zoom: {
            pan: {
              enabled: true,
              mode: 'xy',
            },
            zoom: {
              wheel: {
                enabled: true,
              },
              pinch: {
                enabled: true
              },
              mode: 'xy',
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
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
          },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#667eea',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: (context) => {
                const value = (context.parsed.y ?? 0).toLocaleString();
                return `Page Views: ${value}`;
              }
            }
          },
          zoom: {
            pan: {
              enabled: true,
              mode: 'x',
            },
            zoom: {
              wheel: {
                enabled: true,
              },
              pinch: {
                enabled: true
              },
              mode: 'x',
            }
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
          },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#667eea',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed.toLocaleString();
                const dataset = context.dataset;
                const total = (dataset.data as number[]).reduce((acc, val) => acc + val, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${label}: $${value} (${percentage}%)`;
              }
            }
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

  sortTable(column: string): void {
    if (this.sortedColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortedColumn = column;
      this.sortDirection = 'asc';
    }

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

  // Export functionality
  openExportModal(): void {
    this.showExportModal = true;
  }

  closeExportModal(): void {
    this.showExportModal = false;
  }

  exportAsCSV(): void {
    // Build comprehensive CSV content
    let csvContent = '';

    // Add title and metadata
    csvContent += 'Dashboard Report\n';
    csvContent += `Date Range: ${this.dateRange}\n`;
    csvContent += '\n';

    // Add summary statistics
    csvContent += 'Summary Statistics\n';
    csvContent += `Total Revenue,$${this.getTotalRevenue().toLocaleString()}\n`;
    csvContent += `Average Active Users,${Math.round(this.getTotalUsers()).toLocaleString()}\n`;
    csvContent += `Total Sessions,${this.getTotalSessions().toLocaleString()}\n`;
    csvContent += `Average Session Duration,${this.getAvgSessionDuration()} min\n`;
    csvContent += '\n';

    // Add User Activity Details
    csvContent += 'User Activity Details\n';
    csvContent += 'Date,Active Users,New Users,Sessions\n';
    this.activity.forEach(row => {
      csvContent += `${row.date},${row.activeUsers},${row.newUsers},${row.sessions}\n`;
    });
    csvContent += '\n';

    // Add Platform Engagement
    csvContent += 'Platform Engagement\n';
    csvContent += 'Platform,Page Views,Bounce Rate (%)\n';
    this.engagement.forEach(row => {
      csvContent += `${row.platform},${row.pageViews},${row.bounceRate}\n`;
    });
    csvContent += '\n';

    // Add Top Products
    csvContent += 'Top Products\n';
    csvContent += 'Product,Revenue\n';
    this.products.forEach(row => {
      csvContent += `${row.product},$${row.revenue.toLocaleString()}\n`;
    });

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `dashboard-report-${this.dateRange}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.closeExportModal();
  }

  exportAsPDF(): void {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.text('Dashboard Report', 14, 20);

    // Add date range
    doc.setFontSize(12);
    doc.text(`Date Range: ${this.dateRange}`, 14, 30);

    // Add summary statistics
    doc.setFontSize(14);
    doc.text('Summary Statistics', 14, 45);
    doc.setFontSize(10);
    doc.text(`Total Revenue: $${this.getTotalRevenue().toLocaleString()}`, 14, 55);
    doc.text(`Average Active Users: ${Math.round(this.getTotalUsers()).toLocaleString()}`, 14, 62);
    doc.text(`Total Sessions: ${this.getTotalSessions().toLocaleString()}`, 14, 69);
    doc.text(`Average Session Duration: ${this.getAvgSessionDuration()} min`, 14, 76);

    // Add User Activity Table
    doc.setFontSize(14);
    doc.text('User Activity Details', 14, 90);

    autoTable(doc, {
      startY: 95,
      head: [['Date', 'Active Users', 'New Users', 'Sessions']],
      body: this.activity.map(row => [
        row.date,
        row.activeUsers.toString(),
        row.newUsers.toString(),
        row.sessions.toString()
      ]),
      theme: 'striped',
      headStyles: { fillColor: [102, 126, 234] },
      margin: { top: 95 }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 95;
    if (finalY > 200) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Platform Engagement', 14, 20);
      autoTable(doc, {
        startY: 25,
        head: [['Platform', 'Page Views', 'Bounce Rate (%)']],
        body: this.engagement.map(row => [
          row.platform,
          row.pageViews.toString(),
          row.bounceRate.toString()
        ]),
        theme: 'striped',
        headStyles: { fillColor: [102, 126, 234] }
      });
    } else {
      doc.setFontSize(14);
      doc.text('Platform Engagement', 14, finalY + 15);
      autoTable(doc, {
        startY: finalY + 20,
        head: [['Platform', 'Page Views', 'Bounce Rate (%)']],
        body: this.engagement.map(row => [
          row.platform,
          row.pageViews.toString(),
          row.bounceRate.toString()
        ]),
        theme: 'striped',
        headStyles: { fillColor: [102, 126, 234] }
      });
    }

    doc.save(`dashboard-report-${this.dateRange}.pdf`);
    this.closeExportModal();
  }
}
