import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DashboardLayoutService {
  private toggleEditModeSubject = new Subject<void>();
  private saveLayoutSubject = new Subject<void>();

  toggleEditMode$ = this.toggleEditModeSubject.asObservable();
  saveLayout$ = this.saveLayoutSubject.asObservable();

  toggleEditMode(): void {
    this.toggleEditModeSubject.next();
  }

  saveLayout(): void {
    this.saveLayoutSubject.next();
  }
}