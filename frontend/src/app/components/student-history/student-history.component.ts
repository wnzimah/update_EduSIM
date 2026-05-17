import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { RouterLink } from "@angular/router";
import { AuthService } from "../../services/auth.service";
import { StudentService } from "../../services/student.service";

@Component({
  selector: "app-student-history",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./student-history.component.html",
  styleUrl: "./student-history.component.css"
})
export class StudentHistoryComponent implements OnInit {
  private readonly studentService = inject(StudentService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  attempts: any[] = [];
  selectedResult: any = null;
  loading = true;
  errorMessage = "";
  private readonly defaultStudentName = "Student";
  private pendingAttemptId: number | null = null;
  private scopedCourseId: number | null = null;
  private scopedCourseTitle = "";

  ngOnInit(): void {
    const attemptIdParam = Number(this.route.snapshot.queryParamMap.get("attemptId"));
    this.pendingAttemptId = Number.isFinite(attemptIdParam) && attemptIdParam > 0 ? attemptIdParam : null;
    const courseIdParam = Number(this.route.snapshot.queryParamMap.get("courseId"));
    this.scopedCourseId = Number.isFinite(courseIdParam) && courseIdParam > 0 ? courseIdParam : null;
    this.scopedCourseTitle = String(this.route.snapshot.queryParamMap.get("courseTitle") ?? "").trim().toLowerCase();
    this.loadAttempts();
  }

  loadAttempts(): void {
    this.loading = true;
    this.studentService.attempts().subscribe({
      next: (data) => {
        const sorted = [...data].sort((a, b) => {
          const aTime = new Date(a.submittedAt ?? 0).getTime();
          const bTime = new Date(b.submittedAt ?? 0).getTime();
          return bTime - aTime;
        });
        this.attempts = this.applyCourseScope(sorted);
        if (this.pendingAttemptId) {
          this.openResult(this.pendingAttemptId);
          this.pendingAttemptId = null;
        }
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? "Failed to load history";
        this.loading = false;
      }
    });
  }

  openResult(attemptId: number): void {
    this.studentService.attemptResult(attemptId).subscribe({
      next: (data) => {
        this.selectedResult = data;
      }
    });
  }

  downloadReport(): void {
    if (!this.selectedResult?.summary) {
      return;
    }

    const summary = this.selectedResult.summary;
    const rows: string[] = [];
    rows.push("Quiz Title,Course,Attempt,Submitted At,Score,Status,Feedback");
    rows.push([
      this.csvCell(summary.quizTitle),
      this.csvCell(summary.courseTitle),
      this.csvCell(summary.attemptNumber),
      this.csvCell(summary.submittedAt),
      this.csvCell(summary.score),
      this.csvCell(summary.passed ? "PASS" : "FAIL"),
      this.csvCell(summary.feedback)
    ].join(","));
    rows.push("");
    rows.push("Question,Type,Student Answer,Correct Answer,Correct,Awarded Points,Max Points");

    const answers: any[] = this.selectedResult.answers ?? [];
    for (const answer of answers) {
      rows.push([
        this.csvCell(answer.prompt),
        this.csvCell(answer.questionType),
        this.csvCell(JSON.stringify(answer.studentAnswer ?? "")),
        this.csvCell(JSON.stringify(answer.correctAnswer ?? "")),
        this.csvCell(answer.correct ? "Yes" : "No"),
        this.csvCell(answer.awardedPoints),
        this.csvCell(answer.maxPoints)
      ].join(","));
    }

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileName = `edusim-attempt-${summary.attemptId}.csv`;
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  studentName(): string {
    const fromSession = this.authService.session()?.fullName;
    if (fromSession) {
      return fromSession;
    }
    const fromSelected = this.selectedResult?.summary?.studentName;
    if (fromSelected) {
      return String(fromSelected);
    }
    return this.defaultStudentName;
  }

  passRateLabel(): string {
    const releasedAttempts = this.attempts.filter((attempt) => attempt.resultReleased !== false);
    if (releasedAttempts.length === 0) {
      return "No released result yet";
    }
    const passCount = releasedAttempts.filter((attempt) => attempt.passed).length;
    const rate = Math.round((passCount / releasedAttempts.length) * 100);
    return `${rate}% pass rate`;
  }

  formatAnswer(value: unknown): string {
    if (value === null || value === undefined) {
      return "-";
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed || "-";
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.formatAnswer(item)).join(", ");
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  }

  private csvCell(value: unknown): string {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, "\"\"")}"`;
  }

  private applyCourseScope(rows: any[]): any[] {
    if (!this.scopedCourseId && !this.scopedCourseTitle) {
      return rows;
    }
    return rows.filter((row) => {
      const rowCourseId = Number(row?.courseId ?? 0);
      const rowCourseTitle = String(row?.courseTitle ?? "").trim().toLowerCase();
      if (this.scopedCourseId && rowCourseId === this.scopedCourseId) {
        return true;
      }
      if (this.scopedCourseTitle && rowCourseTitle === this.scopedCourseTitle) {
        return true;
      }
      return false;
    });
  }
}
