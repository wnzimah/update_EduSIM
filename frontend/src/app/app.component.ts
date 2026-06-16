import { CommonModule } from "@angular/common";
import { Component, HostListener, computed, inject } from "@angular/core";
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { AuthService } from "./services/auth.service";
import { LecturerService } from "./services/lecturer.service";
import { StudentService } from "./services/student.service";

type AppNotification = {
  id: string;
  title: string;
  detail: string;
  route: string;
  createdAt?: string;
  tone?: "info" | "warning" | "success";
};

type LanguageCode = "EN" | "BM";
type LecturerMenuKey = "dashboard" | "courses" | "quizzes" | "students" | "questionBank" | "reports" | "messages" | "settings";
type StudentMenuKey = "dashboard" | "courses" | "quizzes" | "attempts" | "messages" | "settings";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css"
})
export class AppComponent {
  private readonly authService = inject(AuthService);
  private readonly lecturerService = inject(LecturerService);
  private readonly studentService = inject(StudentService);
  private readonly router = inject(Router);
  private readonly zoomStorageKey = "edusim.page.zoom.v2";
  private readonly languageStorageKey = "edusim.language";
  private routeHistory: string[] = [];
  private isBackNavigation = false;
  private hasOpenedAuthenticatedShell = false;

  readonly session = this.authService.session;
  readonly isStudent = computed(() => this.session()?.role === "STUDENT");
  readonly isLecturer = computed(() => this.session()?.role === "LECTURER");
  readonly currentYear = new Date().getFullYear();
  showUserMenu = false;
  showMainMenu = false;
  showStudentDashboardMenu = false;
  showNotifications = false;
  showLanguageMenu = false;
  showHelpMenu = false;
  isSidebarOpen = false;
  notificationLoading = false;
  notificationError = "";
  notifications: AppNotification[] = [];
  pageZoom = 90;
  currentLanguage: LanguageCode = "EN";

  constructor() {
    this.loadLanguage();
    this.loadPageZoom();
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const nextUrl = event.urlAfterRedirects;
        if (this.isBackNavigation) {
          this.isBackNavigation = false;
        } else if (this.routeHistory.at(-1) !== nextUrl) {
          this.routeHistory.push(nextUrl);
        }
        this.applyPageZoom();
        this.showMainMenu = false;
        this.showNotifications = false;
        this.showLanguageMenu = false;
        this.showHelpMenu = false;
        if (this.isLoginPage() || this.isTrackerPage()) {
          this.isSidebarOpen = false;
          this.hasOpenedAuthenticatedShell = false;
        } else if (this.session() && !this.hasOpenedAuthenticatedShell) {
          this.isSidebarOpen = false;
          this.hasOpenedAuthenticatedShell = true;
        }
      }
    });
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
    if (this.router.url.startsWith("/lecturer/quiz-overview")) {
      return "Quizzes";
    }
    if (this.router.url.startsWith("/lecturer/quiz-settings")) {
      return "Quiz Settings";
    }
    if (this.router.url.startsWith("/lecturer/quiz-builder")) {
      return "Question Builder";
    }
    if (this.router.url.startsWith("/lecturer/quizzes/")) {
      return "Quiz Preview";
    }
    if (this.router.url.startsWith("/lecturer/question-bank")) {
      return "Question Bank";
    }
    if (this.router.url.startsWith("/lecturer/student-attempts") || this.router.url.startsWith("/lecturer/monitoring")) {
      return "Student Attempts";
    }
    if (this.router.url.startsWith("/lecturer/quiz-performance") || this.router.url.startsWith("/lecturer/quiz-results")) {
      return "Quiz Performance";
    }
    if (this.router.url.startsWith("/lecturer/reset-requests")) {
      return "Reset Requests";
    }
    if (this.router.url.startsWith("/student/dashboard/grades")) {
      return "Attempt History";
    }
    if (this.router.url.startsWith("/student/dashboard")) {
      return "Student Dashboard";
    }
    if (this.router.url.startsWith("/student/courses/")) {
      return "Course Learning";
    }
    if (this.router.url.startsWith("/student/quiz/")) {
      return "Quiz Session";
    }
    if (this.router.url.startsWith("/student/my-courses")) {
      return "My Courses";
    }
    if (this.router.url.startsWith("/student/history")) {
      return "Attempt History";
    }
    if (this.router.url.startsWith("/student/attempts/")) {
      return "Attempt Review";
    }
    return "EduSIM Portal";
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.showUserMenu = !this.showUserMenu;
    this.showMainMenu = false;
    this.showStudentDashboardMenu = false;
    this.showNotifications = false;
    this.showLanguageMenu = false;
    this.showHelpMenu = false;
  }

  toggleStudentDashboardMenu(event: Event): void {
    event.stopPropagation();
    this.showStudentDashboardMenu = !this.showStudentDashboardMenu;
    this.showMainMenu = false;
    this.showUserMenu = false;
    this.showNotifications = false;
    this.showLanguageMenu = false;
    this.showHelpMenu = false;
  }

  openStudentDashboardMenu(): void {
    this.showStudentDashboardMenu = true;
    this.showMainMenu = false;
    this.showUserMenu = false;
    this.showNotifications = false;
    this.showLanguageMenu = false;
    this.showHelpMenu = false;
  }

  closeStudentDashboardMenu(): void {
    this.showStudentDashboardMenu = false;
  }

  closeMenus(): void {
    this.showMainMenu = false;
    this.showUserMenu = false;
    this.showStudentDashboardMenu = false;
    this.showNotifications = false;
    this.showLanguageMenu = false;
    this.showHelpMenu = false;
  }

  toggleSidebar(event: Event): void {
    event.stopPropagation();
    this.closeMenus();
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  toggleMainMenu(event: Event): void {
    event.stopPropagation();
    this.showMainMenu = !this.showMainMenu;
    this.showUserMenu = false;
    this.showStudentDashboardMenu = false;
    this.showNotifications = false;
    this.showLanguageMenu = false;
    this.showHelpMenu = false;
  }

  showSidebar(): boolean {
    return !this.isLoginPage() && !this.isTrackerPage() && !!this.session();
  }

  showBackButton(): boolean {
    return !this.isLoginPage() && !this.isTrackerPage() && !!this.session();
  }

  goBack(event: Event): void {
    event.stopPropagation();
    this.closeMenus();
    const fallback = this.isLecturer() ? "/lecturer/dashboard" : "/student/dashboard";
    this.routeHistory.pop();
    while (this.routeHistory.length > 0) {
      const targetUrl = this.routeHistory.at(-1) ?? "";
      if (!targetUrl.startsWith("/login") && !targetUrl.startsWith("/tracker")) {
        this.isBackNavigation = true;
        this.router.navigateByUrl(targetUrl);
        return;
      }
      this.routeHistory.pop();
    }
    this.routeHistory = [fallback];
    this.router.navigateByUrl(fallback);
  }

  isCurrentRoute(...paths: string[]): boolean {
    return paths.some((path) => this.router.url.startsWith(path));
  }

  isExactRoute(path: string): boolean {
    const current = this.router.url.split("?")[0].split("#")[0];
    return current === path;
  }

  isLecturerMenuActive(key: LecturerMenuKey): boolean {
    const current = this.currentPath();
    const checks: Record<LecturerMenuKey, boolean> = {
      dashboard: current === "/lecturer/dashboard",
      courses: current.startsWith("/lecturer/manage"),
      quizzes: current.startsWith("/lecturer/quiz-overview") ||
        current.startsWith("/lecturer/quiz-builder") ||
        current.startsWith("/lecturer/quizzes/"),
      students: current.startsWith("/lecturer/student-attempts") || current.startsWith("/lecturer/monitoring"),
      questionBank: current.startsWith("/lecturer/question-bank"),
      reports: current.startsWith("/lecturer/quiz-performance") || current.startsWith("/lecturer/quiz-results"),
      messages: current.startsWith("/lecturer/reset-requests"),
      settings: current.startsWith("/lecturer/quiz-settings")
    };
    return checks[key];
  }

  isStudentMenuActive(key: StudentMenuKey): boolean {
    const current = this.currentPath();
    const checks: Record<StudentMenuKey, boolean> = {
      dashboard: current === "/student/dashboard",
      courses: current === "/student/my-courses" || current.startsWith("/student/courses/"),
      quizzes: current.startsWith("/student/quiz/"),
      attempts: current === "/student/history" ||
        current.startsWith("/student/attempts/") ||
        current.startsWith("/student/dashboard/grades"),
      messages: false,
      settings: false
    };
    return checks[key];
  }

  @HostListener("document:click")
  onDocumentClick(): void {
    this.closeMenus();
  }

  navigateHome(): void {
    this.closeMenus();
    this.isSidebarOpen = false;
    this.authService.logout();
    this.router.navigateByUrl("/login");
  }

  openQuickSearch(): void {
    this.closeMenus();
    if (this.isLecturer()) {
      this.router.navigateByUrl("/lecturer/student-attempts");
      return;
    }
    this.router.navigateByUrl("/student/history");
  }

  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
    this.showMainMenu = false;
    this.showUserMenu = false;
    this.showStudentDashboardMenu = false;
    this.showLanguageMenu = false;
    this.showHelpMenu = false;
    if (this.showNotifications) {
      this.loadNotifications();
    }
  }

  toggleLanguageMenu(event: Event): void {
    event.stopPropagation();
    this.showLanguageMenu = !this.showLanguageMenu;
    this.showHelpMenu = false;
    this.showNotifications = false;
    this.showMainMenu = false;
    this.showUserMenu = false;
    this.showStudentDashboardMenu = false;
  }

  toggleHelpMenu(event: Event): void {
    event.stopPropagation();
    this.showHelpMenu = !this.showHelpMenu;
    this.showLanguageMenu = false;
    this.showNotifications = false;
    this.showMainMenu = false;
    this.showUserMenu = false;
    this.showStudentDashboardMenu = false;
  }

  setLanguage(language: LanguageCode): void {
    this.currentLanguage = language;
    localStorage.setItem(this.languageStorageKey, language);
    this.applyDocumentLanguage();
    this.showLanguageMenu = false;
  }

  languageName(): string {
    return this.currentLanguage === "BM" ? "Bahasa Melayu" : "English";
  }

  openHelpTarget(target: "home" | "courses" | "monitoring" | "questions" | "history"): void {
    this.closeMenus();
    if (target === "home") {
      this.navigateHome();
      return;
    }
    if (target === "courses") {
      this.router.navigateByUrl(this.isLecturer() ? "/lecturer/manage" : "/student/my-courses");
      return;
    }
    if (target === "monitoring") {
      this.router.navigateByUrl("/lecturer/student-attempts");
      return;
    }
    if (target === "questions") {
      this.router.navigateByUrl("/lecturer/question-bank");
      return;
    }
    this.router.navigateByUrl("/student/history");
  }

  notificationCount(): number {
    return this.notifications.length;
  }

  openNotification(item: AppNotification): void {
    this.closeMenus();
    this.router.navigateByUrl(item.route);
  }

  notificationTimeLabel(item: AppNotification): string {
    if (!item.createdAt) {
      return "Just now";
    }
    const date = new Date(item.createdAt);
    if (Number.isNaN(date.getTime())) {
      return String(item.createdAt);
    }
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  isStudentDashboardActive(): boolean {
    if (!this.isStudent()) {
      return false;
    }
    return (
      this.router.url.startsWith("/student/dashboard") ||
      this.router.url.startsWith("/student/history") ||
      this.router.url.startsWith("/student/courses/")
    );
  }

  logout(): void {
    this.closeMenus();
    this.isSidebarOpen = false;
    this.authService.logout();
    this.router.navigateByUrl("/login");
  }

  loadNotifications(): void {
    this.notificationLoading = true;
    this.notificationError = "";

    const request$ = this.isLecturer()
      ? this.lecturerService.dashboard()
      : this.studentService.dashboard();

    request$.subscribe({
      next: (dashboard) => {
        this.notifications = this.isLecturer()
          ? this.lecturerNotifications(dashboard)
          : this.studentNotifications(dashboard);
        this.notificationLoading = false;
      },
      error: (error) => {
        this.notificationError = error?.error?.message ?? "Unable to load notifications";
        this.notifications = [];
        this.notificationLoading = false;
      }
    });
  }

  private lecturerNotifications(dashboard: any): AppNotification[] {
    const recent = Array.isArray(dashboard?.recentActivity) ? dashboard.recentActivity : [];
    const submissions = recent.map((item: any) => ({
      id: `submission-${item.attemptId}`,
      title: "New quiz submission",
      detail: `${item.studentName} submitted ${item.quizTitle}`,
      route: "/lecturer/student-attempts",
      createdAt: item.submittedAt,
      tone: item.passed ? "success" : "warning"
    }));
    const recentQuizzes = Array.isArray(dashboard?.recentQuizzes) ? dashboard.recentQuizzes : [];
    const quizzes = recentQuizzes.map((item: any) => ({
      id: `quiz-${item.quizId}`,
      title: item.published ? "Quiz published" : "Quiz created",
      detail: `${item.quizTitle} in ${item.courseTitle}`,
      route: `/lecturer/quiz-overview?courseId=${item.courseId}`,
      createdAt: item.createdAt,
      tone: "info" as const
    }));
    return [...quizzes, ...submissions]
      .sort((a, b) => this.notificationTimestamp(b.createdAt) - this.notificationTimestamp(a.createdAt))
      .slice(0, 6);
  }

  private notificationTimestamp(value: unknown): number {
    const timestamp = new Date(String(value ?? "")).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  private studentNotifications(dashboard: any): AppNotification[] {
    const resultNotifications = Array.isArray(dashboard?.resultNotifications)
      ? dashboard.resultNotifications
      : [];
    const pendingVideos = Array.isArray(dashboard?.pendingVideos) ? dashboard.pendingVideos : [];
    const availableQuizzes = Array.isArray(dashboard?.availableQuizzes)
      ? dashboard.availableQuizzes
      : [];
    const results = resultNotifications.slice(0, 5).map((item: any) => ({
      id: `result-${item.attemptId}`,
      title: "Result available",
      detail: `${item.quizTitle} feedback is ready`,
      route: "/student/history",
      createdAt: item.releaseAt ?? item.submittedAt,
      tone: "success" as const
    }));
    const quizzes = availableQuizzes
      .filter((item: any) => !item.alreadySubmitted)
      .slice(0, Math.max(0, 6 - results.length))
      .map((item: any) => ({
        id: `quiz-${item.quizId}`,
        title: "New quiz available",
        detail: `${item.title} in ${item.courseTitle}`,
        route: `/student/courses/${item.courseId}`,
        createdAt: item.openAt ?? item.closeAt,
        tone: item.locked ? "warning" as const : "info" as const
      }));
    const videos = pendingVideos.slice(0, Math.max(0, 6 - results.length - quizzes.length)).map((item: any) => ({
      id: `video-${item.videoId}`,
      title: "Lesson pending",
      detail: `${item.title} in ${item.courseTitle}`,
      route: `/student/courses/${item.courseId}`,
      tone: "info" as const
    }));
    return [...results, ...quizzes, ...videos]
      .sort((a, b) => this.notificationTimestamp(b.createdAt) - this.notificationTimestamp(a.createdAt))
      .slice(0, 6);
  }

  openSettings(): void {
    this.closeMenus();
    if (this.isLecturer()) {
      this.router.navigateByUrl("/lecturer/quiz-settings");
      return;
    }
    if (this.isStudent()) {
      this.router.navigateByUrl("/student/history");
      return;
    }
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

  private loadLanguage(): void {
    const saved = localStorage.getItem(this.languageStorageKey);
    this.currentLanguage = saved === "BM" ? "BM" : "EN";
    this.applyDocumentLanguage();
  }

  private applyDocumentLanguage(): void {
    if (typeof document === "undefined") {
      return;
    }
    document.documentElement.lang = this.currentLanguage === "BM" ? "ms" : "en";
  }

  private currentPath(): string {
    return this.router.url.split("?")[0].split("#")[0];
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
    const path = typeof window !== "undefined" ? window.location.pathname : this.router.url;
    const isLoginRoute = path.startsWith("/login");
    document.body.style.zoom = "1";
    document.documentElement.style.setProperty("--edusim-content-zoom", isLoginRoute ? "1" : String(this.pageZoom / 100));
  }
}
