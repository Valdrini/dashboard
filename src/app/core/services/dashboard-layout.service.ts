import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DashboardLayoutService {
  private toggleEditModeSubject = new Subject<void>();
  private saveLayoutSubject = new Subject<void>();
  private sidebarOpenSubject = new BehaviorSubject<boolean>(false);

  toggleEditMode$ = this.toggleEditModeSubject.asObservable();
  saveLayout$ = this.saveLayoutSubject.asObservable();
  sidebarOpen$ = this.sidebarOpenSubject.asObservable();

  toggleEditMode(): void {
    this.toggleEditModeSubject.next();
  }

  saveLayout(): void {
    this.saveLayoutSubject.next();
  }

  toggleSidebar(): void {
    this.sidebarOpenSubject.next(!this.sidebarOpenSubject.value);
  }

  closeSidebar(): void {
    this.sidebarOpenSubject.next(false);
  }

  get isSidebarOpen(): boolean {
    return this.sidebarOpenSubject.value;
  }
}