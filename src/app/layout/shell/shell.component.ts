import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SidenavComponent } from '../sidenav/sidenav.component';
import { DashboardLayoutService } from '../../core/services/dashboard-layout.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, SidenavComponent],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss'],
})
export class ShellComponent implements OnInit, OnDestroy {
  private readonly layoutService = inject(DashboardLayoutService);
  private subscriptions = new Subscription();
  
  isSidebarOpen = false;

  ngOnInit(): void {
    this.subscriptions.add(
      this.layoutService.sidebarOpen$.subscribe(open => {
        this.isSidebarOpen = open;
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
