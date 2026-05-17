import { CommonModule } from "@angular/common";
import { Component, HostListener, computed, inject } from "@angular/core";
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { AuthService } from "./services/auth.service";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css"
})
export class AppComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly zoomStorageKey = "edusim.page.zoom";

  readonly session = this.authService.session;
  readonly isStudent = computed(() => this.session()?.role === "STUDENT");
  readonly isLecturer = computed(() => this.session()?.role === "LECTURER");
  showUserMenu = false;
  pageZoom = 100;

  constructor() {
    this.loadPageZoom();
  }

  isLoginPage(): boolean {
    return this.router.url.startsWith("/login");
  }

  isTrackerPage(): boolean {
    return this.router.url.startsWith("/tracker");
  }

  headerTitle(): string {
    if (this.router.url.startsWith("/tracker")) {
      return "Personal Tracker";
    }
    if (this.router.url.startsWith("/lecturer/dashboard")) {
      return "Lecturer Dashboard";
    }
    if (this.router.url.startsWith("/lecturer/manage")) {
      return "Course Content";
    }
    if (this.router.url.startsWith("/lecturer/monitoring")) {
      return "Student Monitoring";
    }
    if (this.router.url.startsWith("/lecturer/question-bank")) {
      return "Quiz Builder";
    }
    if (this.router.url.startsWith("/student/dashboard")) {
      return "";
    }
    if (this.router.url.startsWith("/student/history")) {
      return "Attempt History";
    }
    if (this.router.url.startsWith("/student/courses/")) {
      return "Course Learning";
    }
    if (this.router.url.startsWith("/student/quiz/")) {
      return "Quiz Session";
    }
    return "EduSIM Portal";
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.showUserMenu = !this.showUserMenu;
  }

  closeMenus(): void {
    this.showUserMenu = false;
  }

  @HostListener("document:click")
  onDocumentClick(): void {
    this.closeMenus();
  }

  navigateHome(): void {
    this.closeMenus();
    if (this.isLecturer()) {
      this.router.navigateByUrl("/lecturer/dashboard");
      return;
    }
    if (this.isStudent()) {
      this.router.navigateByUrl("/student/dashboard");
      return;
    }
    this.router.navigateByUrl("/login");
  }

  openQuickSearch(): void {
    this.closeMenus();
    if (this.isLecturer()) {
      this.router.navigateByUrl("/lecturer/monitoring");
      return;
    }
    this.router.navigateByUrl("/student/dashboard");
  }

  logout(): void {
    this.closeMenus();
    this.authService.logout();
    this.router.navigateByUrl("/login");
  }

  zoomOut(): void {
    this.setPageZoom(this.pageZoom - 5);
  }

  zoomIn(): void {
    this.setPageZoom(this.pageZoom + 5);
  }

  zoomLabel(): string {
    return `${this.pageZoom}%`;
  }

  private loadPageZoom(): void {
    const raw = localStorage.getItem(this.zoomStorageKey);
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      this.pageZoom = this.clampZoom(parsed);
    }
    this.applyPageZoom();
  }

  private setPageZoom(value: number): void {
    this.pageZoom = this.clampZoom(value);
    localStorage.setItem(this.zoomStorageKey, String(this.pageZoom));
    this.applyPageZoom();
  }

  private clampZoom(value: number): number {
    return Math.max(85, Math.min(125, Math.round(value)));
  }

  private applyPageZoom(): void {
    if (typeof document === "undefined") {
      return;
    }
    document.body.style.zoom = String(this.pageZoom / 100);
  }
}
