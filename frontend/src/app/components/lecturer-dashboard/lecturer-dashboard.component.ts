import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { forkJoin } from "rxjs";
import { LecturerService } from "../../services/lecturer.service";

type TimelineEntryType = "EVENT" | "QUIZ_DUE" | "MARKING";

type ManualCalendarEvent = {
  id: string;
  title: string;
  occurredAt: string;
  note: string;
};

type TimelineEntry = {
  id: string;
  type: TimelineEntryType;
  title: string;
  subtitle: string;
  occurredAt: string;
  score?: number;
};

@Component({
  selector: "app-lecturer-dashboard",
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: "./lecturer-dashboard.component.html",
  styleUrl: "./lecturer-dashboard.component.css"
})
export class LecturerDashboardComponent implements OnInit {
  private readonly lecturerService = inject(LecturerService);

  dashboard: any = null;
  courses: any[] = [];
  quizzes: any[] = [];
  loading = true;
  errorMessage = "";
  statusMessage = "";
  courseSearch = "";
  readonly weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  monthLabel = "";
  monthGrid: Array<Array<number | null>> = [];
  showEventForm = false;
  selectedDateKey = "";
  eventForm = {
    title: "",
    date: "",
    time: "09:00",
    note: ""
  };
  private manualEvents: ManualCalendarEvent[] = [];
  private viewingDate = new Date();

  ngOnInit(): void {
    this.selectedDateKey = this.defaultEventDate();
    this.buildCalendar();
    forkJoin({
      dashboard: this.lecturerService.dashboard(),
      courses: this.lecturerService.courses(),
      quizzes: this.lecturerService.quizzes()
    }).subscribe({
      next: ({ dashboard, courses, quizzes }) => {
        this.dashboard = dashboard;
        this.courses = courses;
        this.quizzes = quizzes;
        this.eventForm.date = this.defaultEventDate();
        this.loadManualEvents();
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? "Failed to load lecturer dashboard";
        this.loading = false;
      }
    });
  }

  previousMonth(): void {
    this.viewingDate = new Date(this.viewingDate.getFullYear(), this.viewingDate.getMonth() - 1, 1);
    this.buildCalendar();
  }

  nextMonth(): void {
    this.viewingDate = new Date(this.viewingDate.getFullYear(), this.viewingDate.getMonth() + 1, 1);
    this.buildCalendar();
  }

  selectCalendarDay(day: number | null): void {
    if (!day) {
      return;
    }
    this.selectedDateKey = this.dateForCell(day);
    this.eventForm.date = this.selectedDateKey;
    this.statusMessage = "";
    this.errorMessage = "";
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

  isSelectedDay(day: number | null): boolean {
    if (!day) {
      return false;
    }
    return this.dateForCell(day) === this.selectedDateKey;
  }

  entriesForDay(day: number | null): TimelineEntry[] {
    if (!day) {
      return [];
    }
    const dateKey = this.dateForCell(day);
    return this.buildTimelineEntries()
      .filter((entry) => this.toDateKey(entry.occurredAt) === dateKey)
      .slice(0, 3);
  }

  timelineEntries(): TimelineEntry[] {
    const now = Date.now();
    const allEntries = this.buildTimelineEntries();
    const upcoming = allEntries
      .filter((entry) => this.safeTimestamp(entry.occurredAt) >= now)
      .sort((a, b) => this.safeTimestamp(a.occurredAt) - this.safeTimestamp(b.occurredAt));
    const recentPast = allEntries
      .filter((entry) => this.safeTimestamp(entry.occurredAt) < now)
      .sort((a, b) => this.safeTimestamp(b.occurredAt) - this.safeTimestamp(a.occurredAt));
    return [...upcoming, ...recentPast].slice(0, 10);
  }

  selectedDateLabel(): string {
    if (!this.selectedDateKey) {
      return "Select a date";
    }
    const date = new Date(`${this.selectedDateKey}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return this.selectedDateKey;
    }
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }

  selectedDateEntries(): TimelineEntry[] {
    return this.buildTimelineEntries()
      .filter((entry) => this.toDateKey(entry.occurredAt) === this.selectedDateKey)
      .sort((a, b) => this.safeTimestamp(a.occurredAt) - this.safeTimestamp(b.occurredAt));
  }

  timelineTypeLabel(type: TimelineEntryType): string {
    if (type === "QUIZ_DUE") {
      return "Due";
    }
    if (type === "MARKING") {
      return "Marking";
    }
    return "Event";
  }

  toggleEventForm(): void {
    this.showEventForm = !this.showEventForm;
    this.errorMessage = "";
    this.statusMessage = "";
    if (this.showEventForm) {
      this.eventForm.date = this.selectedDateKey || this.defaultEventDate();
    }
  }

  openEventFormForSelectedDate(): void {
    this.showEventForm = true;
    this.errorMessage = "";
    this.statusMessage = "";
    this.eventForm.date = this.selectedDateKey || this.defaultEventDate();
  }

  addCalendarEvent(): void {
    this.errorMessage = "";
    this.statusMessage = "";
    const title = this.eventForm.title.trim();
    const date = this.eventForm.date.trim();
    const time = this.eventForm.time.trim() || "09:00";
    if (!title || !date) {
      this.errorMessage = "Please fill event title and date.";
      return;
    }
    const occurredAt = `${date}T${time}:00`;
    if (Number.isNaN(new Date(occurredAt).getTime())) {
      this.errorMessage = "Invalid event date or time.";
      return;
    }
    const note = this.eventForm.note.trim();
    const entry: ManualCalendarEvent = {
      id: `evt-${Date.now()}`,
      title,
      occurredAt,
      note
    };
    this.manualEvents = [entry, ...this.manualEvents];
    this.persistManualEvents();
    this.selectedDateKey = date;
    const eventDate = new Date(`${date}T00:00:00`);
    if (!Number.isNaN(eventDate.getTime())) {
      this.viewingDate = new Date(eventDate.getFullYear(), eventDate.getMonth(), 1);
      this.buildCalendar();
    }
    this.statusMessage = "New event added to calendar.";
    this.showEventForm = false;
    this.eventForm = {
      title: "",
      date: this.defaultEventDate(),
      time: "09:00",
      note: ""
    };
  }

  deleteCalendarEvent(eventId: string): void {
    this.errorMessage = "";
    this.statusMessage = "";
    this.manualEvents = this.manualEvents.filter((event) => event.id !== eventId);
    this.persistManualEvents();
    this.statusMessage = "Event removed from calendar.";
  }

  filteredCourses(): any[] {
    const keyword = this.courseSearch.trim().toLowerCase();
    return [...this.courses]
      .filter((course) => !keyword || String(course.title ?? "").toLowerCase().includes(keyword))
      .sort((a, b) => String(a.title ?? "").localeCompare(String(b.title ?? "")));
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
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80"
    ];
    return fallback[index % fallback.length];
  }

  recentSubmissionCount(courseTitle: string): number {
    return this.filteredRecentActivity().filter((item: any) => item.courseTitle === courseTitle).length;
  }

  filteredRecentActivity(): any[] {
    const activity = Array.isArray(this.dashboard?.recentActivity) ? this.dashboard.recentActivity : [];
    if (activity.length === 0) {
      return [];
    }

    const lecturerCourseTitles = new Set(
      (this.courses ?? [])
        .map((course) => String(course?.title ?? "").trim().toLowerCase())
        .filter(Boolean)
    );

    if (lecturerCourseTitles.size === 0) {
      return activity;
    }

    return activity.filter((item: any) =>
      lecturerCourseTitles.has(String(item?.courseTitle ?? "").trim().toLowerCase())
    );
  }

  private buildTimelineEntries(): TimelineEntry[] {
    const dueRows: TimelineEntry[] = this.quizzes
      .filter((quiz) => String(quiz?.closeAt ?? "").trim().length > 0)
      .map((quiz) => ({
        id: `due-${quiz.quizId}`,
        type: "QUIZ_DUE" as TimelineEntryType,
        title: quiz.title,
        subtitle: `${quiz.courseTitle || "Course"} due`,
        occurredAt: quiz.closeAt
      }));

    const markingRows: TimelineEntry[] = this.filteredRecentActivity().map((attempt: any) => ({
      id: `mark-${attempt.attemptId}`,
      type: "MARKING" as TimelineEntryType,
      title: attempt.quizTitle,
      subtitle: `${attempt.studentName} submitted`,
      occurredAt: attempt.submittedAt,
      score: Number(attempt.score ?? 0)
    }));

    const eventRows: TimelineEntry[] = this.manualEvents.map((event) => ({
      id: event.id,
      type: "EVENT" as TimelineEntryType,
      title: event.title,
      subtitle: event.note || "Manual event",
      occurredAt: event.occurredAt
    }));

    return [...dueRows, ...markingRows, ...eventRows]
      .filter((entry) => this.safeTimestamp(entry.occurredAt) > 0);
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
  }

  private dateForCell(day: number): string {
    const year = this.viewingDate.getFullYear();
    const month = String(this.viewingDate.getMonth() + 1).padStart(2, "0");
    const dayValue = String(day).padStart(2, "0");
    return `${year}-${month}-${dayValue}`;
  }

  private toDateKey(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private safeTimestamp(value: string): number {
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : -1;
  }

  private defaultEventDate(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
  }

  private manualEventStorageKey(): string {
    const lecturerId = Number(this.dashboard?.lecturer?.id ?? 0);
    return lecturerId > 0
      ? `edusim.lecturer.${lecturerId}.calendarEvents`
      : "edusim.lecturer.calendarEvents";
  }

  private loadManualEvents(): void {
    try {
      const raw = localStorage.getItem(this.manualEventStorageKey());
      if (!raw) {
        this.manualEvents = [];
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        this.manualEvents = [];
        return;
      }
      this.manualEvents = parsed
        .map((item: any) => ({
          id: String(item?.id ?? `evt-${Date.now()}`),
          title: String(item?.title ?? "").trim(),
          occurredAt: String(item?.occurredAt ?? "").trim(),
          note: String(item?.note ?? "").trim()
        }))
        .filter((item: ManualCalendarEvent) => item.title && item.occurredAt);
    } catch {
      this.manualEvents = [];
    }
  }

  private persistManualEvents(): void {
    try {
      localStorage.setItem(this.manualEventStorageKey(), JSON.stringify(this.manualEvents));
    } catch {
      // ignore local storage errors
    }
  }
}
