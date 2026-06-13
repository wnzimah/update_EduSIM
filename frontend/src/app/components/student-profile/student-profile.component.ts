import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { AuthService } from "../../services/auth.service";
import { StudentService } from "../../services/student.service";

type ProfileSection = {
  title: string;
  detail: string;
  open?: boolean;
};

@Component({
  selector: "app-student-profile",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./student-profile.component.html",
  styleUrl: "./student-profile.component.css"
})
export class StudentProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly studentService = inject(StudentService);
  private readonly firstAccessStorageKey = "edusim.student.firstAccessAt";
  private readonly lastAccessStorageKey = "edusim.student.lastAccessAt";

  readonly session = this.authService.session;
  readonly profileSections: ProfileSection[] = [
    {
      title: "Privacy and policies",
      detail: "Review platform rules, data protection notice, and classroom conduct policy."
    },
    {
      title: "Course details",
      detail: "Check your enrollment details, completion status, and available course materials.",
      open: true
    },
    {
      title: "Miscellaneous",
      detail: "Personalization tools, notification preferences, and learner support resources."
    },
    {
      title: "Reports",
      detail: "Track assessment outcome, progress history, and feedback release records."
    },
    {
      title: "Mobile app",
      detail: "Use EduSIM on mobile devices for faster access to learning activities."
    }
  ];

  dashboard: any = null;
  loading = true;
  errorMessage = "";

  ngOnInit(): void {
    this.rememberAccessTimestamps();
    this.loadDashboard();
  }

  studentName(): string {
    return this.session()?.fullName ?? "Student";
  }

  studentEmail(): string {
    return this.session()?.email ?? "-";
  }

  studentIdLabel(): string {
    const id = this.session()?.userId;
    if (!id) {
      return "-";
    }
    return `STU-${String(id).padStart(4, "0")}`;
  }

  completionLabel(): string {
    const courses = this.dashboard?.courses ?? [];
    if (courses.length === 0) {
      return "No courses enrolled yet.";
    }
    const total = courses.reduce((sum: number, course: any) => sum + Number(course.progress ?? 0), 0);
    const average = Math.round(total / courses.length);
    return `${average}% average progress`;
  }

  overallProgressPercent(): number {
    const courses = this.dashboard?.courses ?? [];
    if (courses.length === 0) {
      return 0;
    }
    const total = courses.reduce((sum: number, course: any) => sum + Number(course.progress ?? 0), 0);
    return Math.round(total / courses.length);
  }

  enrolledCoursesCount(): number {
    return (this.dashboard?.courses ?? []).length;
  }

  openQuizCount(): number {
    return (this.dashboard?.availableQuizzes ?? []).filter((quiz: any) => !quiz?.locked).length;
  }

  pendingResultCount(): number {
    return (this.dashboard?.latestResults ?? []).filter((attempt: any) => attempt?.resultReleased === false).length;
  }

  firstAccessLabel(): string {
    const value = localStorage.getItem(this.firstAccessStorageKey);
    if (!value) {
      return "-";
    }
    return this.formatDateTime(value);
  }

  lastAccessLabel(): string {
    const value = localStorage.getItem(this.lastAccessStorageKey);
    if (!value) {
      return "-";
    }
    return this.formatDateTime(value);
  }

  lastAccessedCourses(limit = 3): any[] {
    const courses = [...(this.dashboard?.courses ?? [])];
    return courses.slice(0, limit);
  }

  courseImage(course: any, index: number): string {
    const title = String(course?.title ?? "").toLowerCase();
    if (title.includes("data")) {
      return "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1400&q=80";
    }
    if (title.includes("web")) {
      return "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1400&q=80";
    }
    if (title.includes("entrepreneur")) {
      return "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1400&q=80";
    }
    if (title.includes("kenegaraan") || title.includes("malaysia")) {
      return "https://images.unsplash.com/photo-1560840067-ddcaeb7831d2?auto=format&fit=crop&w=1400&q=80";
    }
    const fallback = [
      "https://images.unsplash.com/photo-1531498860502-7c67cf02f657?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1484417894907-623942c8ee29?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=1200&q=80"
    ];
    return fallback[index % fallback.length];
  }

  recentActivities(limit = 4): any[] {
    return [...(this.dashboard?.latestResults ?? [])]
      .sort((a: any, b: any) => {
        const aTime = new Date(a?.submittedAt ?? 0).getTime();
        const bTime = new Date(b?.submittedAt ?? 0).getTime();
        return bTime - aTime;
      })
      .slice(0, limit);
  }

  activityStatusLabel(attempt: any): string {
    if (attempt?.resultReleased === false) {
      return "Pending";
    }
    return attempt?.passed ? "Pass" : "Fail";
  }

  activityStatusClass(attempt: any): string {
    const label = this.activityStatusLabel(attempt);
    if (label === "Pass") {
      return "pass";
    }
    if (label === "Fail") {
      return "fail";
    }
    return "pending";
  }

  profileFacts(): Array<{ label: string; value: string }> {
    return [
      { label: "Full name", value: this.studentName() },
      { label: "Student ID", value: this.studentIdLabel() },
      { label: "Preferred language", value: "English" },
      { label: "First access to site", value: this.firstAccessLabel() },
      { label: "Last access to site", value: this.lastAccessLabel() },
      { label: "Email address", value: this.studentEmail() }
    ];
  }

  private loadDashboard(): void {
    this.loading = true;
    this.studentService.dashboard().subscribe({
      next: (data) => {
        this.dashboard = data;
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? "Failed to load profile.";
        this.loading = false;
      }
    });
  }

  private rememberAccessTimestamps(): void {
    const now = new Date().toISOString();
    if (!localStorage.getItem(this.firstAccessStorageKey)) {
      localStorage.setItem(this.firstAccessStorageKey, now);
    }
    localStorage.setItem(this.lastAccessStorageKey, now);
  }

  private formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }
}
