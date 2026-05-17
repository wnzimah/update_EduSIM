import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { LecturerService } from "../../services/lecturer.service";

@Component({
  selector: "app-lecturer-monitoring",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: "./lecturer-monitoring.component.html",
  styleUrl: "./lecturer-monitoring.component.css"
})
export class LecturerMonitoringComponent implements OnInit {
  private readonly lecturerService = inject(LecturerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  quizzes: any[] = [];
  results: any[] = [];
  resultDetail: any = null;
  showResultDetailModal = false;
  adjustingAnswerId: number | null = null;
  resultQuizId: number | null = null;
  studentFilter = "";
  adjustingDraft: Record<number, string> = {};
  adjustReasonDraft: Record<number, string> = {};
  loading = true;
  statusMessage = "";
  errorMessage = "";
  scopedCourseId: number | null = null;
  scopedCourseTitle = "";

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const rawCourseId = params.get("courseId");
      const parsedCourseId = rawCourseId ? Number(rawCourseId) : NaN;
      const rawQuizId = params.get("quizId");
      const parsedQuizId = rawQuizId ? Number(rawQuizId) : NaN;
      this.scopedCourseId = Number.isFinite(parsedCourseId) ? parsedCourseId : null;
      this.scopedCourseTitle = (params.get("courseTitle") ?? "").trim();
      this.resultQuizId = Number.isFinite(parsedQuizId) ? parsedQuizId : null;
      this.studentFilter = "";
      this.loadQuizzes();
      this.loadResults();
    });
  }

  loadQuizzes(): void {
    this.lecturerService.quizzes(this.scopedCourseId ?? undefined).subscribe({
      next: (data) => this.quizzes = data,
      error: (error) => this.errorMessage = error?.error?.message ?? "Failed to load quizzes"
    });
  }

  loadResults(): void {
    this.loading = true;
    this.lecturerService.results(this.resultQuizId ?? undefined, this.scopedCourseId ?? undefined).subscribe({
      next: (data) => {
        this.results = data;
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? "Failed to load results";
        this.loading = false;
      }
    });
  }

  onResultQuizFilter(raw: string): void {
    this.resultQuizId = raw ? Number(raw) : null;
    this.loadResults();
  }

  onStudentFilterChange(raw: string): void {
    this.studentFilter = raw?.trim() ?? "";
  }

  clearCourseScope(): void {
    this.router.navigate(["/lecturer/monitoring"]);
  }

  availableStudents(): string[] {
    const unique = new Set(
      this.results
        .map((item) => String(item.studentName ?? "").trim())
        .filter((name) => !!name)
    );
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }

  filteredResults(): any[] {
    const studentKey = this.studentFilter.trim().toLowerCase();
    if (!studentKey) {
      return this.results;
    }
    return this.results.filter((item) =>
      String(item.studentName ?? "").toLowerCase().includes(studentKey)
    );
  }

  displayedAttemptsCount(): number {
    return this.filteredResults().length;
  }

  displayedPassCount(): number {
    return this.filteredResults().filter((item) => item.passed).length;
  }

  displayedFailCount(): number {
    return this.filteredResults().filter((item) => !item.passed).length;
  }

  displayedAverageScore(): string {
    const rows = this.filteredResults();
    if (rows.length === 0) {
      return "0.00%";
    }
    const total = rows.reduce((sum, item) => sum + Number(item.score ?? 0), 0);
    return `${(total / rows.length).toFixed(2)}%`;
  }

  displayedPassRate(): number {
    const rows = this.filteredResults();
    if (rows.length === 0) {
      return 0;
    }
    const passCount = rows.filter((item) => item.passed).length;
    return Math.round((passCount / rows.length) * 100);
  }

  downloadScoreReport(): void {
    const rowsToExport = this.filteredResults();
    if (rowsToExport.length === 0) {
      this.errorMessage = "No score records to download for the current filters.";
      return;
    }

    const rows: string[] = [];
    rows.push("Report Type,Student Result Monitoring");
    rows.push(`Course Scope,${this.csvCell(this.scopedCourseTitle || (this.scopedCourseId ? `Course ID ${this.scopedCourseId}` : "All Courses"))}`);
    rows.push(`Quiz Filter,${this.csvCell(this.quizFilterLabel())}`);
    rows.push(`Student Filter,${this.csvCell(this.studentFilterLabel())}`);
    rows.push(`Generated At,${this.csvCell(new Date().toISOString())}`);
    rows.push("");
    rows.push("Student,Course,Quiz,Attempt,Score (%),Status,Time Taken (s),Submitted At,Result Released");

    for (const item of rowsToExport) {
      rows.push([
        this.csvCell(item.studentName),
        this.csvCell(item.courseTitle),
        this.csvCell(item.quizTitle),
        this.csvCell(item.attemptNumber),
        this.csvCell(item.score),
        this.csvCell(item.passed ? "PASS" : "FAIL"),
        this.csvCell(item.durationSeconds || 0),
        this.csvCell(item.submittedAt),
        this.csvCell(item.resultReleased === false ? "No" : "Yes")
      ].join(","));
    }

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = this.reportFileName();
    link.click();
    URL.revokeObjectURL(url);
    this.statusMessage = "Score report downloaded.";
  }

  openResultDetail(attemptId: number): void {
    this.clearMessages();
    this.lecturerService.resultDetail(attemptId).subscribe({
      next: (data) => {
        this.resultDetail = data;
        this.adjustingDraft = {};
        this.adjustReasonDraft = {};
        this.showResultDetailModal = true;
      },
      error: (error) => this.errorMessage = error?.error?.message ?? "Failed to load attempt detail"
    });
  }

  closeResultDetail(): void {
    this.showResultDetailModal = false;
    this.resultDetail = null;
    this.adjustingAnswerId = null;
    this.adjustingDraft = {};
    this.adjustReasonDraft = {};
  }

  getAdjustScore(answer: any): string {
    const answerId = Number(answer.answerId);
    if (!(answerId in this.adjustingDraft)) {
      this.adjustingDraft[answerId] = String(answer.awardedPoints ?? 0);
    }
    return this.adjustingDraft[answerId];
  }

  getAdjustReason(answer: any): string {
    const answerId = Number(answer.answerId);
    if (!(answerId in this.adjustReasonDraft)) {
      this.adjustReasonDraft[answerId] = "";
    }
    return this.adjustReasonDraft[answerId];
  }

  setAdjustScore(answerId: number, value: string): void {
    this.adjustingDraft[answerId] = value;
  }

  setAdjustReason(answerId: number, value: string): void {
    this.adjustReasonDraft[answerId] = value;
  }

  adjustAnswerScore(answer: any): void {
    this.clearMessages();
    const answerId = Number(answer.answerId);
    const current = Number(answer.awardedPoints ?? 0);
    const maxPoints = Number(answer.maxPoints ?? 0);
    const rawScore = this.adjustingDraft[answerId] ?? String(current);
    const awardedPoints = Number(rawScore);
    if (Number.isNaN(awardedPoints)) {
      this.errorMessage = "Invalid score value.";
      return;
    }
    const reason = (this.adjustReasonDraft[answerId] ?? "").trim();

    this.adjustingAnswerId = answerId;
    this.lecturerService.adjustAnswerScore(answerId, { awardedPoints, reason }).subscribe({
      next: () => {
        this.statusMessage = "Score adjusted and recalculated.";
        const attemptId = this.resultDetail?.attempt?.attemptId;
        if (attemptId) {
          this.openResultDetail(attemptId);
        }
        this.loadResults();
        this.adjustingAnswerId = null;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? "Failed to adjust score";
        this.adjustingAnswerId = null;
      }
    });
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

  private quizFilterLabel(): string {
    if (!this.resultQuizId) {
      return "All Quiz";
    }
    const selected = this.quizzes.find((quiz) => Number(quiz.quizId) === Number(this.resultQuizId));
    return selected?.title ? String(selected.title) : `Quiz ID ${this.resultQuizId}`;
  }

  private studentFilterLabel(): string {
    return this.studentFilter.trim() || "All Students";
  }

  private reportFileName(): string {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const scope = this.scopedCourseId ? `course-${this.scopedCourseId}` : "all-courses";
    const quiz = this.resultQuizId ? `quiz-${this.resultQuizId}` : "all-quiz";
    return `edusim-score-report-${scope}-${quiz}-${stamp}.csv`;
  }

  private csvCell(value: unknown): string {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, "\"\"")}"`;
  }

  private clearMessages(): void {
    this.statusMessage = "";
    this.errorMessage = "";
  }
}
