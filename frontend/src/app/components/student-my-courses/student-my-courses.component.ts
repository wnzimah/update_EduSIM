import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit, inject } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { StudentService } from "../../services/student.service";

type PlannerCategory = "QUIZ" | "VIDEO" | "TASK" | "STUDY";

type PlannerEvent = {
  id: number;
  title: string;
  date: string;
  category: PlannerCategory;
  courseId: number | null;
  quizId?: number;
  videoId?: number;
  auto?: boolean;
  dateLabel?: string;
};

type DisplayCourse = {
  courseId: number;
  title: string;
  description?: string;
  progress?: number;
  demo?: boolean;
  status?: string;
  quizTotal?: number;
  accent?: string;
};

@Component({
  selector: "app-student-my-courses",
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: "./student-my-courses.component.html",
  styleUrl: "./student-my-courses.component.css"
})
export class StudentMyCoursesComponent implements OnInit, OnDestroy {
  private readonly studentService = inject(StudentService);
  private readonly router = inject(Router);
  private readonly eventStorageKey = "edusim.student.dashboard.events";

  dashboard: any = null;
  loading = true;
  errorMessage = "";
  searchText = "";
  courseTab: "all" | "inProgress" | "completed" = "all";
  courseSort: "name" | "progressDesc" | "progressAsc" = "name";
  courseViewMode: "grid" | "list" = "grid";
  recentCourseIndex = 0;
  timelineSearch = "";
  calendarCourseFilter = "all";
  showEventModal = false;
  selectedDay: number | null = null;

  readonly weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  readonly bannerSlides = [
    {
      imageUrl: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=2200&q=80",
      title: "Open and Distance Learning Experience",
      subtitle: "Learn anytime with guided lessons, video activities, and self-paced study flow."
    },
    {
      imageUrl: "https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=2200&q=80",
      title: "Video Lessons and Digital Materials",
      subtitle: "Access course videos, slides, and references from one place without switching platforms."
    },
    {
      imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=2200&q=80",
      title: "Self-Assessment with Instant Feedback",
      subtitle: "Complete quizzes, unlock results quickly, and track your progress throughout the semester."
    }
  ];

  courseCountLabel(count: number): string {
    return count === 1 ? "1 course" : `${count} courses`;
  }

  readonly extraSubjects: DisplayCourse[] = [
    {
      courseId: -101,
      title: "Interactive Web Design",
      description: "Build clean interfaces, responsive layouts, and small UI challenges with guided practice.",
      progress: 42,
      demo: true,
      status: "IN PROGRESS",
      quizTotal: 3,
      accent: "violet"
    },
    {
      courseId: -102,
      title: "Cybersecurity Fundamentals",
      description: "Explore safe passwords, network threats, access control, and mini incident-response cases.",
      progress: 18,
      demo: true,
      status: "NEW",
      quizTotal: 4,
      accent: "coral"
    },
    {
      courseId: -103,
      title: "AI and Smart Systems",
      description: "Learn how data, models, and automation work together through simple real-world examples.",
      progress: 0,
      demo: true,
      status: "COMING SOON",
      quizTotal: 2,
      accent: "amber"
    }
  ];

  activeBannerIndex = 0;
  monthLabel = "";
  monthGrid: Array<Array<number | null>> = [];
  plannerEvents: PlannerEvent[] = [];
  private userEvents: PlannerEvent[] = [];
  private viewingDate = new Date();
  private bannerTimer: ReturnType<typeof setInterval> | null = null;
  private readonly bannerIntervalMs = 4500;

  eventForm: {
    title: string;
    date: string;
    courseId: string;
    category: PlannerCategory;
  } = {
    title: "",
    date: "",
    courseId: "all",
    category: "TASK"
  };

  ngOnInit(): void {
    this.buildCalendar();
    this.loadStoredEvents();
    this.startBannerAutoplay();
    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this.stopBannerAutoplay();
  }

  loadDashboard(): void {
    this.loading = true;
    this.studentService.dashboard().subscribe({
      next: (data) => {
        this.dashboard = data;
        this.recentCourseIndex = 0;
        this.generateAutoPlannerEvents();
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? "Failed to load dashboard";
        this.loading = false;
      }
    });
  }

  completeVideo(videoId: number): void {
    this.studentService.completeVideo(videoId).subscribe({
      next: () => this.loadDashboard()
    });
  }

  startQuiz(quizId: number, locked: boolean, courseId?: number): void {
    if (locked) {
      return;
    }
    this.router.navigate(["/student/quiz", quizId], {
      queryParams: courseId ? { courseId } : {}
    });
  }

  previousMonth(): void {
    this.viewingDate = new Date(this.viewingDate.getFullYear(), this.viewingDate.getMonth() - 1, 1);
    this.buildCalendar();
    this.generateAutoPlannerEvents();
  }

  nextMonth(): void {
    this.viewingDate = new Date(this.viewingDate.getFullYear(), this.viewingDate.getMonth() + 1, 1);
    this.buildCalendar();
    this.generateAutoPlannerEvents();
  }

  goToToday(): void {
    const today = new Date();
    this.viewingDate = new Date(today.getFullYear(), today.getMonth(), 1);
    this.buildCalendar();
    this.selectedDay = today.getDate();
    this.generateAutoPlannerEvents();
  }

  isToday(day: number | null): boolean {
    if (!day) {
      return false;
    }
    const today = new Date();
    return (
      day === today.getDate() &&
      this.viewingDate.getMonth() === today.getMonth() &&
      this.viewingDate.getFullYear() === today.getFullYear()
    );
  }

  displayCourses(): DisplayCourse[] {
    const realCourses = Array.isArray(this.dashboard?.courses) ? this.dashboard.courses : [];
    return [...realCourses, ...this.extraSubjects];
  }

  filteredCourses(): DisplayCourse[] {
    if (!this.dashboard?.courses) {
      return this.extraSubjects;
    }
    const keyword = this.searchText.trim().toLowerCase();
    const filtered = this.displayCourses()
      .filter((course: any) => !keyword || String(course.title ?? "").toLowerCase().includes(keyword))
      .filter((course: any) => {
        if (course.demo && this.courseTab !== "all") {
          return this.courseTab === "inProgress" && Number(course.progress ?? 0) > 0;
        }
        if (this.courseTab === "completed") {
          return Number(course.progress ?? 0) >= 100;
        }
        if (this.courseTab === "inProgress") {
          const progress = Number(course.progress ?? 0);
          return progress > 0 && progress < 100;
        }
        return true;
      });

    if (this.courseSort === "progressDesc") {
      return filtered.sort((a: any, b: any) => Number(b.progress ?? 0) - Number(a.progress ?? 0));
    }
    if (this.courseSort === "progressAsc") {
      return filtered.sort((a: any, b: any) => Number(a.progress ?? 0) - Number(b.progress ?? 0));
    }
    return filtered.sort((a: any, b: any) => String(a.title ?? "").localeCompare(String(b.title ?? "")));
  }

  courseProgress(course: any): number {
    const value = Number(course?.progress ?? 0);
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  setCourseTab(tab: "all" | "inProgress" | "completed"): void {
    this.courseTab = tab;
  }

  setCourseViewMode(mode: "grid" | "list"): void {
    this.courseViewMode = mode;
  }

  recentCourses(): any[] {
    if (!this.dashboard?.courses?.length) {
      return [];
    }

    const courses = [...this.dashboard.courses];
    const byId = new Map<number, any>();
    for (const course of courses) {
      byId.set(Number(course?.courseId ?? 0), course);
    }

    const orderedRecentIds = (this.dashboard?.latestResults ?? [])
      .slice()
      .sort((a: any, b: any) => {
        const aTime = new Date(a?.submittedAt ?? 0).getTime();
        const bTime = new Date(b?.submittedAt ?? 0).getTime();
        return bTime - aTime;
      })
      .map((row: any) => Number(row?.courseId ?? 0));

    const seen = new Set<number>();
    const recent: any[] = [];

    for (const courseId of orderedRecentIds) {
      if (!courseId || seen.has(courseId)) {
        continue;
      }
      const matched = byId.get(courseId);
      if (matched) {
        recent.push(matched);
        seen.add(courseId);
      }
    }

    for (const course of courses) {
      const courseId = Number(course?.courseId ?? 0);
      if (!seen.has(courseId)) {
        recent.push(course);
      }
    }

    return recent;
  }

  activeRecentCourse(): any | null {
    const recent = this.recentCourses();
    if (!recent.length) {
      this.recentCourseIndex = 0;
      return null;
    }

    if (this.recentCourseIndex < 0) {
      this.recentCourseIndex = 0;
    }
    if (this.recentCourseIndex >= recent.length) {
      this.recentCourseIndex = recent.length - 1;
    }
    return recent[this.recentCourseIndex];
  }

  previousRecentCourse(): void {
    const recent = this.recentCourses();
    if (recent.length <= 1) {
      return;
    }
    this.recentCourseIndex = (this.recentCourseIndex - 1 + recent.length) % recent.length;
  }

  nextRecentCourse(): void {
    const recent = this.recentCourses();
    if (recent.length <= 1) {
      return;
    }
    this.recentCourseIndex = (this.recentCourseIndex + 1) % recent.length;
  }

  hasMultipleRecentCourses(): boolean {
    return this.recentCourses().length > 1;
  }

  recentCourseCode(course: any): string {
    const title = String(course?.title ?? "").trim();
    if (!title) {
      return "Course";
    }
    const firstToken = title.split(/\s+/)[0] ?? "";
    return firstToken || "Course";
  }

  courseImage(course: any, index: number): string {
    const imageUrl = String(course?.imageUrl ?? "").trim();
    if (imageUrl) {
      return imageUrl;
    }
    const title = String(course?.title ?? "").toLowerCase();
    if (title.includes("cyber")) {
      return "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1400&q=80";
    }
    if (title.includes("ai") || title.includes("smart")) {
      return "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1400&q=80";
    }
    if (title.includes("interactive") || title.includes("design")) {
      return "https://images.unsplash.com/photo-1559028012-481c04fa702d?auto=format&fit=crop&w=1400&q=80";
    }
    if (title.includes("data")) {
      return "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1400&q=80";
    }
    if (title.includes("web")) {
      return "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1400&q=80";
    }
    if (title.includes("database")) {
      return "https://images.unsplash.com/photo-1484417894907-623942c8ee29?auto=format&fit=crop&w=1400&q=80";
    }
    const fallback = [
      "https://images.unsplash.com/photo-1531498860502-7c67cf02f657?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1484417894907-623942c8ee29?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=1200&q=80"
    ];
    return fallback[index % fallback.length];
  }

  courseDescription(course: any): string {
    const text = String(course?.description ?? "").trim();
    if (text) {
      return text;
    }
    return "Structured learning resources and guided activities for this course.";
  }

  quizCountForCourse(course: any): number {
    if (course?.demo) {
      return Number(course?.quizTotal ?? 0);
    }
    const courseId = Number(course?.courseId ?? 0);
    const title = String(course?.title ?? "").trim().toLowerCase();
    const ids = new Set<string>();

    for (const quiz of this.dashboard?.availableQuizzes ?? []) {
      if (Number(quiz?.courseId ?? 0) === courseId || String(quiz?.courseTitle ?? "").trim().toLowerCase() === title) {
        const key = quiz?.quizId ? `q-${quiz.quizId}` : `t-${String(quiz?.title ?? "").trim().toLowerCase()}`;
        ids.add(key);
      }
    }

    for (const attempt of this.dashboard?.latestResults ?? []) {
      const sameCourse =
        Number(attempt?.courseId ?? 0) === courseId ||
        String(attempt?.courseTitle ?? "").trim().toLowerCase() === title;
      if (sameCourse) {
        const key = attempt?.quizId
          ? `q-${attempt.quizId}`
          : `t-${String(attempt?.quizTitle ?? "").trim().toLowerCase()}`;
        ids.add(key);
      }
    }

    return ids.size;
  }

  submissionCountForCourse(course: any): number {
    const courseId = Number(course?.courseId ?? 0);
    const title = String(course?.title ?? "").trim().toLowerCase();
    return (this.dashboard?.latestResults ?? []).filter((attempt: any) =>
      Number(attempt?.courseId ?? 0) === courseId ||
      String(attempt?.courseTitle ?? "").trim().toLowerCase() === title
    ).length;
  }

  goToPerformance(course: any): void {
    this.router.navigate(["/student/history"], {
      queryParams: {
        courseId: course?.courseId ?? null,
        courseTitle: course?.title ?? null
      }
    });
  }

  timelineEntries(): Array<any> {
    if (!this.dashboard) {
      return [];
    }

    const entries: Array<any> = [];

    for (const quiz of this.dashboard.availableQuizzes ?? []) {
      const status = this.quizTimelineStatus(quiz);
      const scheduleDetail = this.formatScheduleDetail(quiz.openAt, quiz.closeAt);
      const activityDate = this.parseDate(quiz.closeAt) ?? this.parseDate(quiz.openAt);
      entries.push({
        type: "quiz",
        title: quiz.title,
        detail: scheduleDetail,
        actionLabel: status.kind === "ready" ? "Open quiz" : status.label,
        disabled: status.kind !== "ready",
        statusKind: status.kind,
        statusLabel: status.label,
        activityAt: activityDate,
        timeLabel: activityDate ? this.formatTimeOnlyFromDate(activityDate) : "--:--",
        quizId: quiz.quizId,
        courseId: quiz.courseId
      });
    }

    for (const video of this.dashboard.pendingVideos ?? []) {
      const activityDate = new Date();
      entries.push({
        type: "video",
        title: video.title,
        detail: `${video.courseTitle} - ${video.durationMinutes} min`,
        actionLabel: "Mark complete",
        disabled: false,
        statusKind: "ready",
        statusLabel: "Pending",
        activityAt: activityDate,
        timeLabel: this.formatTimeOnlyFromDate(activityDate),
        videoId: video.videoId
      });
    }

    for (const result of this.dashboard.latestResults ?? []) {
      const released = result.resultReleased !== false;
      const activityDate = this.parseDate(result.submittedAt);
      const resultTitle = released
        ? (result.passed ? `${result.quizTitle} (${result.score}%)` : `${result.quizTitle}`)
        : `${result.quizTitle} (Pending)`;
      const scheduleDetail = this.resultScheduleDetail(result);
      entries.push({
        type: "result",
        title: resultTitle,
        detail: scheduleDetail,
        actionLabel: "View history",
        disabled: false,
        statusKind: released ? "completed" : "locked",
        statusLabel: released ? "Answered" : "Pending",
        activityAt: activityDate,
        timeLabel: activityDate ? this.formatTimeOnlyFromDate(activityDate) : "--:--",
        attemptId: result.attemptId
      });
    }

    for (const notice of this.dashboard.resultNotifications ?? []) {
      const activityDate = this.parseDate(notice.releaseAt);
      entries.push({
        type: "notification",
        title: `Result available: ${notice.quizTitle}`,
        detail: notice.message ?? "Your scheduled result is now available.",
        actionLabel: "View result",
        disabled: false,
        statusKind: "completed",
        statusLabel: "Released",
        activityAt: activityDate,
        timeLabel: activityDate ? this.formatTimeOnlyFromDate(activityDate) : "--:--",
        attemptId: notice.attemptId
      });
    }

    return entries.slice(0, 14);
  }

  filteredTimelineEntries(): Array<any> {
    const keyword = this.timelineSearch.trim().toLowerCase();
    if (!keyword) {
      return this.timelineEntries().slice(0, 8);
    }

    return this.timelineEntries()
      .filter((entry) =>
        String(entry.title ?? "").toLowerCase().includes(keyword) ||
        String(entry.detail ?? "").toLowerCase().includes(keyword)
      )
      .slice(0, 8);
  }

  handleTimelineAction(entry: any): void {
    if (entry.disabled) {
      return;
    }
    if (entry.type === "quiz" && entry.quizId) {
      this.startQuiz(entry.quizId, false, entry.courseId);
      return;
    }
    if (entry.type === "video" && entry.videoId) {
      this.completeVideo(entry.videoId);
      return;
    }
    if (entry.type === "result") {
      this.router.navigate(["/student/history"], {
        queryParams: entry.attemptId ? { attemptId: entry.attemptId } : {}
      });
      return;
    }
    if (entry.type === "notification" && entry.attemptId) {
      this.router.navigate(["/student/history"], {
        queryParams: { attemptId: entry.attemptId }
      });
    }
  }

  latestAttemptRows(): any[] {
    return (this.dashboard?.latestResults ?? []).slice(0, 6);
  }

  completedCoursesCount(): number {
    return (this.dashboard?.courses ?? []).filter((course: any) => Number(course.progress ?? 0) >= 100).length;
  }

  activitiesCompletedCount(): number {
    const mandatoryDone = (this.dashboard?.courses ?? []).reduce(
      (sum: number, course: any) => sum + Number(course.mandatoryCompleted ?? 0),
      0
    );
    const attempts = (this.dashboard?.latestResults ?? []).length;
    return mandatoryDone + attempts;
  }

  activitiesDueCount(): number {
    const openQuiz = (this.dashboard?.availableQuizzes ?? []).filter((quiz: any) => !quiz.locked).length;
    const pendingVideo = (this.dashboard?.pendingVideos ?? []).length;
    return openQuiz + pendingVideo;
  }

  completionHeadline(): string {
    const courses = this.dashboard?.courses ?? [];
    if (courses.length === 0) {
      return "Start your first course to see your progress.";
    }
    const total = courses.reduce((sum: number, course: any) => sum + Number(course.progress ?? 0), 0);
    const average = Math.round(total / courses.length);
    return `${average}% of your learning targets are completed. Keep going.`;
  }

  upcomingPlannerEvents(limit = 6): PlannerEvent[] {
    const today = new Date();
    const events = this.plannerEvents
      .filter((event) => this.matchesCourseFilter(event))
      .filter((event) => new Date(event.date) >= new Date(today.getFullYear(), today.getMonth(), today.getDate()))
      .sort((a, b) => a.date.localeCompare(b.date));
    return events.slice(0, limit);
  }

  plannerEventMeta(event: PlannerEvent): string {
    return `${event.dateLabel ?? this.formatPlannerDate(event.date)} | ${this.plannerCategoryLabel(event.category)}`;
  }

  nextBanner(): void {
    this.activeBannerIndex = (this.activeBannerIndex + 1) % this.bannerSlides.length;
  }

  goToBanner(index: number): void {
    this.activeBannerIndex = index;
    this.restartBannerAutoplay();
  }

  pauseBanner(): void {
    this.stopBannerAutoplay();
  }

  resumeBanner(): void {
    this.startBannerAutoplay();
  }

  openEventModal(day: number | null = null): void {
    this.showEventModal = true;
    this.eventForm = {
      title: "",
      date: day ? this.dateForCell(day) : this.defaultEventDate(),
      courseId: this.calendarCourseFilter,
      category: "TASK"
    };
  }

  selectDay(day: number | null): void {
    if (!day) {
      return;
    }
    this.selectedDay = day;
  }

  selectedDayLabel(): string {
    if (!this.selectedDay) {
      return "Selected day";
    }
    const selectedDate = new Date(this.dateForCell(this.selectedDay));
    return selectedDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  selectedDayEvents(): PlannerEvent[] {
    return this.eventsForDay(this.selectedDay);
  }

  canOpenPlannerEvent(event: PlannerEvent): boolean {
    return Boolean(
      (event.category === "QUIZ" && event.quizId) ||
      (event.category === "VIDEO" && event.videoId) ||
      event.courseId
    );
  }

  openPlannerEvent(event: PlannerEvent): void {
    if (event.category === "QUIZ" && event.quizId) {
      const quiz = (this.dashboard?.availableQuizzes ?? []).find(
        (item: any) => Number(item?.quizId ?? 0) === Number(event.quizId)
      );

      if (quiz) {
        this.startQuiz(quiz.quizId, Boolean(quiz.locked), quiz.courseId);
        return;
      }
    }

    if (event.category === "VIDEO" && event.videoId) {
      this.completeVideo(event.videoId);
      return;
    }

    if (event.courseId) {
      this.router.navigate(["/student/courses", event.courseId]);
    }
  }

  closeEventModal(): void {
    this.showEventModal = false;
  }

  addPlannerEvent(): void {
    const title = this.eventForm.title.trim();
    const date = this.eventForm.date;
    if (!title || !date) {
      return;
    }

    const event: PlannerEvent = {
      id: Date.now(),
      title,
      date,
      category: this.eventForm.category,
      courseId: this.eventForm.courseId === "all" ? null : Number(this.eventForm.courseId),
      auto: false
    };

    this.userEvents = [...this.userEvents, event];
    this.saveStoredEvents();
    this.generateAutoPlannerEvents();
    this.closeEventModal();
  }

  removePlannerEvent(eventId: number, domEvent: Event): void {
    domEvent.stopPropagation();
    this.userEvents = this.userEvents.filter((event) => event.id !== eventId);
    this.saveStoredEvents();
    this.generateAutoPlannerEvents();
  }

  eventsForDay(day: number | null): PlannerEvent[] {
    if (!day) {
      return [];
    }

    const dateKey = this.dateForCell(day);
    return this.plannerEvents
      .filter((event) => event.date === dateKey)
      .filter((event) => this.matchesCourseFilter(event))
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  visibleEventsForDay(day: number | null): PlannerEvent[] {
    return this.eventsForDay(day).slice(0, 3);
  }

  extraEventsCount(day: number | null): number {
    const count = this.eventsForDay(day).length;
    return Math.max(0, count - 3);
  }

  eventClass(event: PlannerEvent): string {
    if (event.category === "QUIZ") {
      return "event-quiz";
    }
    if (event.category === "VIDEO") {
      return "event-video";
    }
    if (event.category === "STUDY") {
      return "event-study";
    }
    return "event-task";
  }

  timelineStatusClass(entry: any): string {
    const kind = String(entry?.statusKind ?? "locked").toLowerCase();
    if (kind === "ready") {
      return "ready";
    }
    if (kind === "completed") {
      return "completed";
    }
    if (kind === "overdue") {
      return "overdue";
    }
    return "locked";
  }

  timelineGroups(): Array<{ dateKey: string; dateLabel: string; items: any[] }> {
    const entries = [...this.filteredTimelineEntries()].sort((a, b) => {
      const aTime = a?.activityAt instanceof Date ? a.activityAt.getTime() : 0;
      const bTime = b?.activityAt instanceof Date ? b.activityAt.getTime() : 0;
      return aTime - bTime;
    });

    const groupsMap = new Map<string, { dateKey: string; dateLabel: string; items: any[] }>();
    for (const entry of entries) {
      const date = entry?.activityAt instanceof Date ? entry.activityAt : null;
      const key = date ? this.dateGroupKey(date) : "undated";
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          dateKey: key,
          dateLabel: date ? this.dateGroupLabel(date) : "No specific date",
          items: []
        });
      }
      groupsMap.get(key)?.items.push(entry);
    }

    return Array.from(groupsMap.values());
  }

  private quizTimelineStatus(quiz: any): { kind: "ready" | "completed" | "overdue" | "locked"; label: string } {
    if (quiz?.alreadySubmitted) {
      return { kind: "completed", label: "Completed" };
    }
    if (this.isQuizOverdue(quiz)) {
      return { kind: "overdue", label: "Overdue" };
    }
    if (quiz?.locked || Number(quiz?.attemptsRemaining ?? 0) <= 0) {
      return { kind: "locked", label: "Locked" };
    }
    return { kind: "ready", label: "Ready" };
  }

  private isQuizOverdue(quiz: any): boolean {
    if (!quiz?.closeAt || quiz?.alreadySubmitted) {
      return false;
    }
    const closeAt = new Date(quiz.closeAt).getTime();
    if (Number.isNaN(closeAt)) {
      return false;
    }
    return Date.now() > closeAt;
  }

  private parseDate(value: unknown): Date | null {
    if (!value) {
      return null;
    }
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed;
  }

  private dateGroupKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private dateGroupLabel(date: Date): string {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  private formatDateOnlyFromDate(date: Date): string {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  private formatTimeOnlyFromDate(date: Date): string {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  }

  private formatScheduleDetail(openAt: unknown, closeAt: unknown): string {
    const openDate = this.parseDate(openAt);
    const dueDate = this.parseDate(closeAt);
    const openLabel = openDate ? this.formatDateOnlyFromDate(openDate) : "-";
    const dueDateLabel = dueDate ? this.formatDateOnlyFromDate(dueDate) : "-";
    const timeLabel = dueDate ? this.formatTimeOnlyFromDate(dueDate) : "-";
    return `Open: ${openLabel} | Due date: ${dueDateLabel} | Time: ${timeLabel}`;
  }

  private resultScheduleDetail(result: any): string {
    const quizMeta = (this.dashboard?.availableQuizzes ?? []).find((quiz: any) =>
      Number(quiz?.quizId ?? 0) === Number(result?.quizId ?? 0)
    );
    const openAt = result?.openAt ?? quizMeta?.openAt;
    const closeAt = result?.closeAt ?? quizMeta?.closeAt;
    return this.formatScheduleDetail(openAt, closeAt);
  }

  private buildCalendar(): void {
    this.monthLabel = new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric"
    }).format(this.viewingDate);

    const year = this.viewingDate.getFullYear();
    const month = this.viewingDate.getMonth();
    const firstDate = new Date(year, month, 1);
    const totalDays = new Date(year, month + 1, 0).getDate();

    let firstWeekDay = firstDate.getDay();
    firstWeekDay = firstWeekDay === 0 ? 7 : firstWeekDay;

    const rows: Array<Array<number | null>> = [];
    let week: Array<number | null> = new Array(firstWeekDay - 1).fill(null);

    for (let day = 1; day <= totalDays; day++) {
      week.push(day);
      if (week.length === 7) {
        rows.push(week);
        week = [];
      }
    }

    if (week.length > 0) {
      while (week.length < 7) {
        week.push(null);
      }
      rows.push(week);
    }

    this.monthGrid = rows;
    this.ensureSelectedDay();
  }

  private generateAutoPlannerEvents(): void {
    if (!this.dashboard) {
      this.plannerEvents = [...this.userEvents];
      return;
    }

    const autoEvents: PlannerEvent[] = [];
    let autoId = -1;
    const todayKey = this.todayDateKey();

    for (const quiz of this.dashboard.availableQuizzes ?? []) {
      if (quiz?.alreadySubmitted) {
        continue;
      }
      const quizDate = this.toDateKey(quiz?.closeAt) ?? this.toDateKey(quiz?.openAt);
      if (!quizDate) {
        continue;
      }
      autoEvents.push({
        id: autoId--,
        title: `Quiz: ${quiz.title}`,
        date: quizDate,
        category: "QUIZ",
        courseId: quiz.courseId ?? null,
        quizId: quiz.quizId ?? undefined,
        dateLabel: this.quizPlannerDateLabel(quiz),
        auto: true
      });
    }

    for (const video of this.dashboard.pendingVideos ?? []) {
      autoEvents.push({
        id: autoId--,
        title: `Watch: ${video.title}`,
        date: todayKey,
        category: "VIDEO",
        courseId: video.courseId ?? null,
        videoId: video.videoId ?? undefined,
        dateLabel: "Today",
        auto: true
      });
    }

    this.plannerEvents = [...autoEvents, ...this.userEvents];
  }

  private matchesCourseFilter(event: PlannerEvent): boolean {
    if (this.calendarCourseFilter === "all") {
      return true;
    }
    return event.courseId === Number(this.calendarCourseFilter);
  }

  private dateForCell(day: number): string {
    const year = this.viewingDate.getFullYear();
    const month = String(this.viewingDate.getMonth() + 1).padStart(2, "0");
    const dayValue = String(day).padStart(2, "0");
    return `${year}-${month}-${dayValue}`;
  }

  private todayDateKey(): string {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${today.getFullYear()}-${month}-${day}`;
  }

  private toDateKey(value: unknown): string | null {
    const date = this.parseDate(value);
    if (!date) {
      return null;
    }
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  }

  private quizPlannerDateLabel(quiz: any): string {
    const closeDate = this.toDateKey(quiz?.closeAt);
    if (closeDate) {
      return `Due ${this.formatPlannerDate(closeDate)}`;
    }
    const openDate = this.toDateKey(quiz?.openAt);
    return openDate ? `Open ${this.formatPlannerDate(openDate)}` : "No date";
  }

  private formatPlannerDate(dateKey: string): string {
    const date = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return dateKey;
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  private plannerCategoryLabel(category: PlannerCategory): string {
    const labels: Record<PlannerCategory, string> = {
      QUIZ: "Quiz",
      VIDEO: "Video",
      TASK: "Task",
      STUDY: "Study"
    };
    return labels[category] ?? category;
  }

  private defaultEventDate(): string {
    if (this.selectedDay) {
      return this.dateForCell(this.selectedDay);
    }

    const today = new Date();
    if (
      today.getFullYear() === this.viewingDate.getFullYear() &&
      today.getMonth() === this.viewingDate.getMonth()
    ) {
      return this.dateForCell(today.getDate());
    }
    return this.dateForCell(1);
  }

  private ensureSelectedDay(): void {
    const maxDay = new Date(this.viewingDate.getFullYear(), this.viewingDate.getMonth() + 1, 0).getDate();
    if (this.selectedDay && this.selectedDay >= 1 && this.selectedDay <= maxDay) {
      return;
    }

    const today = new Date();
    if (
      today.getFullYear() === this.viewingDate.getFullYear() &&
      today.getMonth() === this.viewingDate.getMonth()
    ) {
      this.selectedDay = today.getDate();
      return;
    }

    this.selectedDay = 1;
  }

  private loadStoredEvents(): void {
    try {
      const raw = localStorage.getItem(this.eventStorageKey);
      if (!raw) {
        this.userEvents = [];
        return;
      }

      const parsed = JSON.parse(raw) as PlannerEvent[];
      this.userEvents = parsed
        .filter((event) => !!event?.title && !!event?.date)
        .map((event) => ({
          id: Number(event.id),
          title: String(event.title),
          date: String(event.date),
          category: event.category ?? "TASK",
          courseId: event.courseId == null ? null : Number(event.courseId),
          quizId: event.quizId == null ? undefined : Number(event.quizId),
          videoId: event.videoId == null ? undefined : Number(event.videoId),
          auto: false
        }));
    } catch {
      this.userEvents = [];
    }
  }

  private saveStoredEvents(): void {
    localStorage.setItem(this.eventStorageKey, JSON.stringify(this.userEvents));
  }

  private startBannerAutoplay(): void {
    this.stopBannerAutoplay();
    if (this.bannerSlides.length < 2) {
      return;
    }
    this.bannerTimer = setInterval(() => this.nextBanner(), this.bannerIntervalMs);
  }

  private stopBannerAutoplay(): void {
    if (!this.bannerTimer) {
      return;
    }
    clearInterval(this.bannerTimer);
    this.bannerTimer = null;
  }

  private restartBannerAutoplay(): void {
    this.stopBannerAutoplay();
    this.startBannerAutoplay();
  }

  private formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
}

