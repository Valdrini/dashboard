import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardLayoutService } from '../../core/services/dashboard-layout.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  private readonly layoutService = inject(DashboardLayoutService);
  
  editMode: boolean = false;

  onToggleEditMode(): void {
    this.editMode = !this.editMode;
    this.layoutService.toggleEditMode();
  }

  onSaveLayout(): void {
    this.layoutService.saveLayout();
  }

  onToggleSidebar(): void {
    this.layoutService.toggleSidebar();
  }
}