import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, NavigationEnd, Router } from '@angular/router';
import { DashboardLayoutService } from '../../core/services/dashboard-layout.service';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-sidenav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss'],
})
export class SidenavComponent implements OnInit, OnDestroy {
  private readonly layoutService = inject(DashboardLayoutService);
  private readonly router = inject(Router);
  private subscriptions = new Subscription();
  
  isOpen = false;

  ngOnInit(): void {
    this.subscriptions.add(
      this.layoutService.sidebarOpen$.subscribe(open => {
        this.isOpen = open;
      })
    );

    // Close sidebar on navigation (mobile)
    this.subscriptions.add(
      this.router.events
        .pipe(filter(event => event instanceof NavigationEnd))
        .subscribe(() => {
          if (window.innerWidth < 768) {
            this.layoutService.closeSidebar();
          }
        })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  closeSidebar(): void {
    this.layoutService.closeSidebar();
  }
}
