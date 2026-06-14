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
  insights: any = null;
  showResultDetailModal = false;
  adjustingAnswerId: number | null = null;
  resultQuizId: number | null = null;
  studentFilter = "";
  resultSearch = "";
  statusFilter = "ALL";
  dateFrom = "";
  dateTo = "";
  selectedAttemptId: number | null = null;
  attemptsPage = 1;
  attemptsPageSize = 10;
  adjustingDraft: Record<number, string> = {};
  adjustReasonDraft: Record<number, string> = {};
  loading = true;
  statusMessage = "";
  errorMessage = "";
  scopedCourseId: number | null = null;
  scopedCourseTitle = "";
  revealedHardestAnswers = new Set<number>();
  readonly attemptsPageSizes = [10, 20, 50];

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
      this.loadInsights();
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
        this.selectedAttemptId = this.results[0]?.attemptId ?? null;
        this.attemptsPage = 1;
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? "Failed to load results";
        this.loading = false;
      }
    });
  }

  loadInsights(): void {
    this.lecturerService.assessmentInsights(this.resultQuizId ?? undefined, this.scopedCourseId ?? undefined).subscribe({
      next: (data) => {
        this.insights = data;
        this.revealedHardestAnswers.clear();
      },
      error: () => this.insights = null
    });
  }

  onResultQuizFilter(raw: string): void {
    this.resultQuizId = raw ? Number(raw) : null;
    this.selectedAttemptId = null;
    this.attemptsPage = 1;
    this.loadResults();
    this.loadInsights();
  }

  onStudentFilterChange(raw: string): void {
    this.studentFilter = raw?.trim() ?? "";
    this.attemptsPage = 1;
  }

  onResultSearchChange(raw: string): void {
    this.resultSearch = raw?.trim() ?? "";
    this.attemptsPage = 1;
  }

  onStatusFilterChange(raw: string): void {
    this.statusFilter = raw || "ALL";
    this.attemptsPage = 1;
  }

  onDateFilterChange(): void {
    this.attemptsPage = 1;
  }

  clearCourseScope(): void {
    this.router.navigate(["/lecturer/quiz-overview"], {
      queryParams: this.scopedCourseId ? { courseId: this.scopedCourseId } : undefined
    });
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
    const searchKey = this.resultSearch.trim().toLowerCase();
    const statusKey = this.statusFilter;
    return this.results.filter((item) => {
      const matchesStudent = !studentKey || String(item.studentName ?? "").toLowerCase().includes(studentKey);
      const matchesSearch = !searchKey
        || String(item.studentName ?? "").toLowerCase().includes(searchKey)
        || String(item.studentId ?? "").toLowerCase().includes(searchKey)
        || String(item.quizTitle ?? "").toLowerCase().includes(searchKey);
      const matchesStatus = statusKey === "ALL"
        || (statusKey === "COMPLETED" && !!item.submittedAt)
        || (statusKey === "LOCKED" && item.resultReleased === false)
        || (statusKey === "RELEASED" && item.resultReleased !== false);
      const submittedAt = item.submittedAt ? new Date(item.submittedAt) : null;
      const from = this.dateFrom ? new Date(`${this.dateFrom}T00:00:00`) : null;
      const to = this.dateTo ? new Date(`${this.dateTo}T23:59:59`) : null;
      const matchesDate = !submittedAt || ((!from || submittedAt >= from) && (!to || submittedAt <= to));
      return matchesStudent && matchesSearch && matchesStatus && matchesDate;
    });
  }

  pagedResults(): any[] {
    const rows = this.filteredResults();
    const page = Math.min(Math.max(this.attemptsPage, 1), this.attemptsTotalPages(rows.length));
    const start = (page - 1) * this.attemptsPageSize;
    return rows.slice(start, start + this.attemptsPageSize);
  }

  attemptsTotalPages(total = this.filteredResults().length): number {
    return Math.max(1, Math.ceil(total / this.attemptsPageSize));
  }

  attemptsPageNumbers(): number[] {
    const totalPages = this.attemptsTotalPages();
    const maxVisible = 5;
    const half = Math.floor(maxVisible / 2);
    let start = Math.max(1, this.attemptsPage - half);
    const end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  setAttemptsPage(page: number): void {
    this.attemptsPage = Math.min(Math.max(page, 1), this.attemptsTotalPages());
  }

  onAttemptsPageSizeChange(): void {
    this.attemptsPage = 1;
  }

  attemptsShowingLabel(): string {
    const total = this.filteredResults().length;
    if (total === 0) {
      return "Showing 0 attempts";
    }
    const page = Math.min(Math.max(this.attemptsPage, 1), this.attemptsTotalPages(total));
    const start = (page - 1) * this.attemptsPageSize + 1;
    const end = Math.min(start + this.attemptsPageSize - 1, total);
    return `Showing ${start} to ${end} of ${total} attempts`;
  }

  selectAttempt(item: any): void {
    this.selectedAttemptId = Number(item?.attemptId ?? 0) || null;
  }

  selectedResult(): any {
    const rows = this.filteredResults();
    if (rows.length === 0) {
      return null;
    }
    return rows.find((item) => Number(item.attemptId) === Number(this.selectedAttemptId)) ?? rows[0];
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

  completedAttemptsCount(): number {
    return this.filteredResults().filter((item) => !!item.submittedAt).length;
  }

  releasedAttemptsCount(): number {
    return this.filteredResults().filter((item) => item.resultReleased !== false).length;
  }

  lockedAttemptsCount(): number {
    return this.filteredResults().filter((item) => item.resultReleased === false).length;
  }

  inProgressAttemptsCount(): number {
    return this.filteredResults().filter((item) => !item.submittedAt).length;
  }

  notAttemptedCount(): number {
    return 0;
  }

  metricPercent(count: number): string {
    const total = this.displayedAttemptsCount();
    if (total === 0) {
      return "0%";
    }
    return `${Math.round((count / total) * 100)}%`;
  }

  displayedAverageScore(): string {
    const rows = this.filteredResults();
    if (rows.length === 0) {
      return "0.00%";
    }
    const total = rows.reduce((sum, item) => sum + Number(item.score ?? 0), 0);
    return `${(total / rows.length).toFixed(2)}%`;
  }

  displayedTopScore(): string {
    const rows = this.filteredResults();
    if (rows.length === 0) {
      return "0.00%";
    }
    const top = Math.max(...rows.map((item) => Number(item.score ?? 0)));
    return `${top.toFixed(2)}%`;
  }

  displayedTopScoreValue(): number {
    const rows = this.filteredResults();
    if (rows.length === 0) {
      return 0;
    }
    return Math.max(...rows.map((item) => Number(item.score ?? 0)));
  }

  displayedAverageScoreValue(): number {
    const rows = this.filteredResults();
    if (rows.length === 0) {
      return 0;
    }
    const total = rows.reduce((sum, item) => sum + Number(item.score ?? 0), 0);
    return total / rows.length;
  }

  displayedPassRate(): number {
    const rows = this.filteredResults();
    if (rows.length === 0) {
      return 0;
    }
    const passCount = rows.filter((item) => item.passed).length;
    return Math.round((passCount / rows.length) * 100);
  }

  weakTopics(): any[] {
    return Array.isArray(this.insights?.weakTopics) ? this.insights.weakTopics : [];
  }

  hardestQuestions(): any[] {
    return Array.isArray(this.insights?.hardestQuestions) ? this.insights.hardestQuestions : [];
  }

  totalCorrectAnswers(): number {
    return Number(this.insights?.correctAnswerCount ?? 0);
  }

  totalWrongAnswers(): number {
    return Number(this.insights?.wrongAnswerCount ?? 0);
  }

  scoreRingStyle(score: number): string {
    const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
    return `conic-gradient(#28c98b 0 ${safeScore}%, #d94b70 ${safeScore}% 100%)`;
  }

  toggleHardestAnswer(questionId: number): void {
    if (this.revealedHardestAnswers.has(questionId)) {
      this.revealedHardestAnswers.delete(questionId);
      return;
    }
    this.revealedHardestAnswers.add(questionId);
  }

  isHardestAnswerVisible(questionId: number): boolean {
    return this.revealedHardestAnswers.has(questionId);
  }

  revealAllHardestAnswers(): void {
    for (const question of this.hardestQuestions()) {
      const questionId = Number(question.questionId);
      if (Number.isFinite(questionId)) {
        this.revealedHardestAnswers.add(questionId);
      }
    }
  }

  confidenceRiskMessage(): string {
    return String(this.insights?.confidenceRisk?.message ?? "No confidence insight yet.");
  }

  timeRiskMessage(): string {
    return String(this.insights?.timeRisk?.message ?? "No timing insight yet.");
  }

  scorePointsLabel(item: any): string {
    const points = Math.round((Number(item?.score ?? 0) / 100) * 20);
    return `${points} / 20`;
  }

  selectedScorePointsLabel(): string {
    return this.scorePointsLabel(this.selectedResult());
  }

  incorrectPercent(item: any): number {
    return Math.max(0, 100 - Math.min(100, Math.max(0, Number(item?.score ?? 0))));
  }

  weakTopicStudentsLabel(topic: any): string {
    const wrong = Number(topic?.wrongCount ?? 0);
    const total = Math.max(1, this.displayedAttemptsCount());
    return `${wrong} (${Math.round((wrong / total) * 100)}%)`;
  }

  studentInitials(name: string): string {
    const parts = String(name ?? "Student")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) {
      return "ST";
    }
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  }

  formatDuration(seconds: unknown): string {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const minutes = Math.floor(total / 60);
    const remainingSeconds = total % 60;
    if (minutes <= 0) {
      return `${remainingSeconds}s`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  }

  resultReleaseLabel(item: any): string {
    if (item?.resultReleased === false) {
      return "Locked";
    }
    if (item?.resultReleaseAt) {
      return `Released ${new Date(item.resultReleaseAt).toLocaleDateString()}`;
    }
    return "Released";
  }

  scoreBandLabel(score: unknown): string {
    const value = Number(score ?? 0);
    if (value >= 80) {
      return "High";
    }
    if (value >= 50) {
      return "Medium";
    }
    return "Low";
  }

  scoreBandCount(min: number, max: number): number {
    return this.filteredResults().filter((item) => {
      const score = Number(item.score ?? 0);
      return score >= min && score <= max;
    }).length;
  }

  confidenceSummary(): Array<{ label: string; value: number; tone: string }> {
    const risk = this.insights?.confidenceRisk ?? {};
    return [
      { label: "High", value: Number(risk.highConfidenceWrong ?? 0), tone: "high" },
      { label: "Medium", value: Number(risk.mediumConfidenceWrong ?? 0), tone: "medium" },
      { label: "Low", value: Number(risk.lowConfidenceWrong ?? 0), tone: "low" }
    ];
  }

  downloadScoreReport(): void {
    const rowsToExport = this.filteredResults();
    if (rowsToExport.length === 0) {
      this.errorMessage = "No score records to download for the current filters.";
      return;
    }

    const rows: string[] = [];
    rows.push("Report Type,Student Attempt Records");
    rows.push(`Course Scope,${this.csvCell(this.scopedCourseTitle || (this.scopedCourseId ? `Course ID ${this.scopedCourseId}` : "All Courses"))}`);
    rows.push(`Quiz Filter,${this.csvCell(this.quizFilterLabel())}`);
    rows.push(`Student Filter,${this.csvCell(this.studentFilterLabel())}`);
    rows.push(`Generated At,${this.csvCell(new Date().toISOString())}`);
    rows.push("");
    rows.push("Student ID,Student Name,Course,Quiz,Attempt,Score (%),Status,Time Taken (s),Submitted At,Result Released");

    for (const item of rowsToExport) {
      rows.push([
        this.csvCell(item.studentId),
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
    this.statusMessage = "Student record export downloaded.";
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
        this.loadInsights();
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

  quizFilterLabel(): string {
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
    return `edusim-student-records-${scope}-${quiz}-${stamp}.csv`;
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
