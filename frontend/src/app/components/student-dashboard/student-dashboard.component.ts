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

@Component({
  selector: "app-student-dashboard",
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: "./student-dashboard.component.html",
  styleUrl: "./student-dashboard.component.css"
})
export class StudentDashboardComponent implements OnInit, OnDestroy {
  private readonly studentService = inject(StudentService);
  private readonly router = inject(Router);
  private readonly eventStorageKey = "edusim.student.dashboard.events";

  dashboard: any = null;
  loading = true;
  errorMessage = "";
  searchText = "";
  courseTab: "all" | "inProgress" | "completed" = "all";
  courseSort: "name" | "progressDesc" | "progressAsc" = "name";
  coursePage = 1;
  readonly coursesPerPage = 2;
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
        this.coursePage = 1;
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

  primaryCourse(): any | null {
    const courses = [...(this.dashboard?.courses ?? [])];
    if (courses.length === 0) {
      return null;
    }
    const inProgress = courses
      .filter((course: any) => Number(course?.progress ?? 0) < 100)
      .sort((a: any, b: any) => Number(b?.progress ?? 0) - Number(a?.progress ?? 0));
    return inProgress[0] ?? courses[0];
  }

  dashboardCourses(): any[] {
    return [...(this.dashboard?.courses ?? [])]
      .sort((a: any, b: any) => Number(b?.progress ?? 0) - Number(a?.progress ?? 0))
      .slice(0, 3);
  }

  overallProgress(): number {
    const courses = this.dashboard?.courses ?? [];
    if (courses.length === 0) {
      return 0;
    }
    const total = courses.reduce((sum: number, course: any) => sum + Number(course?.progress ?? 0), 0);
    return Math.round(total / courses.length);
  }

  progressRingBackground(): string {
    const degrees = Math.max(0, Math.min(100, this.overallProgress())) * 3.6;
    return `conic-gradient(#4f46e5 0deg ${degrees}deg, #e7e9f2 ${degrees}deg 360deg)`;
  }

  courseProgressLabel(course: any): string {
    return `${Math.round(Number(course?.progress ?? 0))}%`;
  }

  currentCourseStatus(course: any): string {
    const progress = Number(course?.progress ?? 0);
    if (progress >= 100) {
      return "Completed";
    }
    if (progress > 0) {
      return "In progress";
    }
    return "Ready to start";
  }

  nextLessonLabel(course: any): string {
    const courseId = Number(course?.courseId ?? 0);
    const video = (this.dashboard?.pendingVideos ?? []).find((item: any) => Number(item?.courseId ?? 0) === courseId);
    if (video) {
      return `${video.title} (${video.durationMinutes} min)`;
    }
    const quiz = (this.dashboard?.availableQuizzes ?? []).find((item: any) => Number(item?.courseId ?? 0) === courseId && !item?.locked);
    if (quiz) {
      return `Quiz ready: ${quiz.title}`;
    }
    return "All required lessons are up to date.";
  }

  focusMessage(): string {
    const recommendation = this.recommendationsPreview()[0];
    if (recommendation) {
      return recommendation.title;
    }
    if (this.activitiesDueCount() > 0) {
      return `${this.activitiesDueCount()} learning activity needs attention.`;
    }
    return "Review your latest feedback before the next quiz.";
  }

  latestFeedback(): any | null {
    const rows = this.dashboard?.latestResults ?? [];
    return rows[0] ?? null;
  }

  studentFirstName(): string {
    return String(this.dashboard?.student?.name ?? "Student").trim().split(/\s+/)[0] || "Student";
  }

  studentInitial(): string {
    return this.studentFirstName().charAt(0).toUpperCase() || "S";
  }

  studentIdentifier(): string {
    const id = this.dashboard?.student?.studentId ?? this.dashboard?.student?.id;
    return id ? String(id) : "STU000002";
  }

  recentAttempts(): any[] {
    return Array.isArray(this.dashboard?.latestResults) ? this.dashboard.latestResults : [];
  }

  attemptCount(): number {
    return this.recentAttempts().length;
  }

  passedCount(): number {
    return this.recentAttempts().filter((attempt: any) => attempt?.passed === true).length;
  }

  passRate(): number {
    const attempts = this.recentAttempts().filter((attempt: any) => attempt?.resultReleased !== false);
    if (attempts.length === 0) {
      return 0;
    }
    return Math.round((attempts.filter((attempt: any) => attempt?.passed === true).length / attempts.length) * 100);
  }

  averageScore(): number {
    const scores = this.recentAttempts()
      .filter((attempt: any) => attempt?.resultReleased !== false && attempt?.score !== null && attempt?.score !== undefined)
      .map((attempt: any) => Number(attempt.score))
      .filter((score: number) => Number.isFinite(score));
    if (scores.length === 0) {
      return 0;
    }
    return Math.round(scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length);
  }

  scoreText(attempt: any): string {
    if (attempt?.score === null || attempt?.score === undefined) {
      return "-";
    }
    return `${Math.round(Number(attempt.score))}%`;
  }

  feedbackScoreLabel(feedback: any): string {
    if (feedback?.resultReleased === false) {
      return "-";
    }
    if (feedback?.score === null || feedback?.score === undefined) {
      return "Hidden";
    }
    return `${Math.round(Number(feedback.score ?? 0))}%`;
  }

  feedbackStatusLabel(feedback: any): string {
    if (feedback?.resultReleased === false) {
      return "Pending release";
    }
    if (feedback?.passed === true) {
      return "Pass";
    }
    if (feedback?.passed === false) {
      return "Need revision";
    }
    return "Released";
  }

  feedbackFeedbackText(feedback: any): string {
    const text = String(feedback?.feedback ?? "").trim();
    if (text) {
      return text;
    }
    return "Open detailed feedback to review question-by-question explanation and learning recommendations.";
  }

  openFeedback(feedback: any): void {
    this.router.navigate(["/student/history"], {
      queryParams: feedback?.attemptId ? { attemptId: feedback.attemptId } : {}
    });
  }

  recommendationsPreview(): Array<{
    badge: string;
    title: string;
    reason: string;
    action: string;
    link?: string;
    courseId?: number;
  }> {
    const rows: Array<{
      badge: string;
      title: string;
      reason: string;
      action: string;
      link?: string;
      courseId?: number;
    }> = [];
    const seen = new Set<string>();

    for (const result of this.dashboard?.latestResults ?? []) {
      const recommendations = Array.isArray(result?.recommendations) ? result.recommendations : [];
      for (const item of recommendations) {
        const material = this.firstRecommendationMaterial(item);
        const title = String(item?.title ?? item?.weakTopic ?? item?.topicTag ?? "Recommended revision").trim();
        const key = title.toLowerCase();
        if (!title || seen.has(key)) {
          continue;
        }
        seen.add(key);
        rows.push({
          badge: "Topic",
          title,
          reason: String(item?.reason ?? "Review this topic to strengthen your next quiz attempt.").trim(),
          action: material ? `Open ${this.learningMaterialLabel(material)}` : String(item?.actionLabel ?? "View feedback").trim(),
          link: material?.resourceUrl,
          courseId: Number(result?.courseId ?? 0) || undefined
        });
        if (rows.length >= 3) {
          return rows;
        }
      }
    }

    for (const video of this.dashboard?.pendingVideos ?? []) {
      rows.push({
        badge: "Lesson",
        title: `Watch ${video.title}`,
        reason: `${video.courseTitle} has a pending ${video.durationMinutes}-minute lesson.`,
        action: "Continue course",
        courseId: Number(video.courseId ?? 0)
      });
      if (rows.length >= 3) {
        return rows;
      }
    }

    for (const quiz of this.dashboard?.availableQuizzes ?? []) {
      if (quiz?.locked) {
        continue;
      }
      rows.push({
        badge: "Quiz",
        title: quiz.title,
        reason: `${quiz.courseTitle} quiz is open for practice and assessment.`,
        action: "Start quiz",
        courseId: Number(quiz.courseId ?? 0)
      });
      if (rows.length >= 3) {
        return rows;
      }
    }

    const course = this.primaryCourse();
    if (course) {
      rows.push({
        badge: "Course",
        title: `Continue ${course.title}`,
        reason: `${this.courseProgressLabel(course)} completed. Keep the learning path moving.`,
        action: "Open course",
        courseId: Number(course.courseId ?? 0)
      });
    } else {
      rows.push({
        badge: "Feedback",
        title: "Review learning history",
        reason: "Once quizzes are completed, detailed feedback and learning recommendations will appear here.",
        action: "Open history"
      });
    }

    return rows.slice(0, 3);
  }

  streakDays(): Array<{ label: string; done: boolean }> {
    const submittedDates = new Set(
      (this.dashboard?.latestResults ?? [])
        .map((row: any) => this.toDateKey(row?.submittedAt))
        .filter((value: string | null): value is string => !!value)
    );
    const today = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      return {
        label: date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 3),
        done: submittedDates.has(this.toDateKey(date) ?? "")
      };
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

  filteredCourses(): any[] {
    const courses = this.filteredCoursesAll();
    if (courses.length === 0) {
      this.coursePage = 1;
      return [];
    }

    const totalPages = Math.max(1, Math.ceil(courses.length / this.coursesPerPage));
    if (this.coursePage > totalPages) {
      this.coursePage = totalPages;
    }

    const start = (this.coursePage - 1) * this.coursesPerPage;
    return courses.slice(start, start + this.coursesPerPage);
  }

  totalCoursePages(): number {
    const total = Math.ceil(this.filteredCoursesAll().length / this.coursesPerPage);
    return Math.max(1, total);
  }

  coursePageNumbers(): number[] {
    return Array.from({ length: this.totalCoursePages() }, (_, index) => index + 1);
  }

  setCoursePage(page: number): void {
    if (page < 1 || page > this.totalCoursePages()) {
      return;
    }
    this.coursePage = page;
  }

  nextCoursePage(): void {
    if (this.coursePage >= this.totalCoursePages()) {
      return;
    }
    this.coursePage += 1;
  }

  resetCoursePage(): void {
    this.coursePage = 1;
  }

  private filteredCoursesAll(): any[] {
    if (!this.dashboard?.courses) {
      return [];
    }
    const keyword = this.searchText.trim().toLowerCase();
    const filtered = [...this.dashboard.courses]
      .filter((course: any) => !keyword || String(course.title ?? "").toLowerCase().includes(keyword))
      .filter((course: any) => {
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

  setCourseTab(tab: "all" | "inProgress" | "completed"): void {
    this.courseTab = tab;
    this.coursePage = 1;
  }

  courseImage(course: any, index: number): string {
    const imageUrl = String(course?.imageUrl ?? "").trim();
    if (imageUrl) {
      return imageUrl;
    }
    const title = String(course?.title ?? "").toLowerCase();
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
      const scheduleDetail = this.formatScheduleDetail(quiz.openAt, quiz.closeAt);
      const actionLabel = quiz.locked
        ? (quiz.alreadySubmitted ? "Completed" : "Locked")
        : "Open quiz";
      entries.push({
        type: "quiz",
        title: quiz.title,
        detail: scheduleDetail,
        actionLabel,
        disabled: quiz.locked,
        quizId: quiz.quizId,
        courseId: quiz.courseId
      });
    }

    for (const video of this.dashboard.pendingVideos ?? []) {
      entries.push({
        type: "video",
        title: video.title,
        detail: `${video.courseTitle} - ${video.durationMinutes} min`,
        actionLabel: "Mark complete",
        disabled: false,
        videoId: video.videoId
      });
    }

    for (const result of this.dashboard.latestResults ?? []) {
      const released = result.resultReleased !== false;
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
        attemptId: result.attemptId
      });
    }

    for (const notice of this.dashboard.resultNotifications ?? []) {
      entries.push({
        type: "notification",
        title: `Result available: ${notice.quizTitle}`,
        detail: notice.message ?? "Your scheduled result is now available.",
        actionLabel: "View result",
        disabled: false,
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

  gradeCardHeadline(): string {
    const released = this.releasedResults();
    if (released.length === 0) {
      return "No Grade Yet";
    }

    const total = released.reduce((sum, row) => sum + Number(row?.score ?? 0), 0);
    const average = Math.round(total / released.length);
    return `Avg ${average}%`;
  }

  gradeCardSummary(): string {
    const released = this.releasedResults();
    if (released.length === 0) {
      return "Awaiting released quiz results";
    }

    const passed = released.filter((row) => Boolean(row?.passed)).length;
    const latest = released[0];
    const latestTitle = String(latest?.quizTitle ?? "Latest quiz").trim() || "Latest quiz";
    const latestScore = Number(latest?.score ?? 0);
    return `${released.length} released results, ${passed} pass. Latest: ${latestTitle} (${latestScore}%).`;
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

  private firstRecommendationMaterial(item: any): any | null {
    const materials = Array.isArray(item?.learningMaterials)
      ? item.learningMaterials
      : (Array.isArray(item?.materials) ? item.materials : []);
    return materials.find((material: any) => String(material?.resourceUrl ?? "").trim()) ?? null;
  }

  private learningMaterialLabel(material: any): string {
    const type = String(material?.type ?? material?.materialType ?? "material").toLowerCase();
    if (type.includes("video")) {
      return "video";
    }
    if (type.includes("slide")) {
      return "slides";
    }
    if (type.includes("pdf") || type.includes("note")) {
      return "notes";
    }
    return "material";
  }

  private toDateKey(value: unknown): string | null {
    if (!value) {
      return null;
    }
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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

  private releasedResults(): any[] {
    const rows = this.dashboard?.latestResults ?? [];
    return rows.filter((row: any) =>
      row?.resultReleased !== false &&
      Number.isFinite(Number(row?.score))
    );
  }

  private parseDateValue(value: unknown): Date | null {
    if (!value) {
      return null;
    }
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed;
  }

  private formatDateOnly(date: Date): string {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  private formatTimeOnly(date: Date): string {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  }

  private formatScheduleDetail(openAt: unknown, closeAt: unknown): string {
    const openDate = this.parseDateValue(openAt);
    const dueDate = this.parseDateValue(closeAt);
    const openLabel = openDate ? this.formatDateOnly(openDate) : "-";
    const dueDateLabel = dueDate ? this.formatDateOnly(dueDate) : "-";
    const timeLabel = dueDate ? this.formatTimeOnly(dueDate) : "-";
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
