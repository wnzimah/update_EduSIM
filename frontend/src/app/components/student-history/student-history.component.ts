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

  allAttempts: any[] = [];
  attempts: any[] = [];
  selectedResult: any = null;
  loading = true;
  errorMessage = "";
  courseFilter = "ALL";
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
        this.allAttempts = sorted;
        this.courseFilter = this.initialCourseFilter(sorted);
        this.applyAttemptFilter();
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

  studentFirstName(): string {
    return this.studentName().trim().split(/\s+/)[0] || this.defaultStudentName;
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

  courseOptions(): Array<{ key: string; title: string; count: number }> {
    const byCourse = new Map<string, { key: string; title: string; count: number }>();
    for (const attempt of this.allAttempts) {
      const title = String(attempt?.courseTitle ?? "Unknown Course").trim() || "Unknown Course";
      const courseId = Number(attempt?.courseId ?? 0);
      const key = courseId > 0 ? `id:${courseId}` : `title:${title.toLowerCase()}`;
      const current = byCourse.get(key) ?? { key, title, count: 0 };
      current.count++;
      byCourse.set(key, current);
    }
    return Array.from(byCourse.values()).sort((left, right) => left.title.localeCompare(right.title));
  }

  onCourseFilterChange(value: string): void {
    this.courseFilter = value || "ALL";
    this.selectedResult = null;
    this.applyAttemptFilter();
  }

  selectedFilterLabel(): string {
    if (this.courseFilter === "ALL") {
      return "Overall attempts";
    }
    const selected = this.courseOptions().find((course) => course.key === this.courseFilter);
    return selected?.title ?? "Selected class";
  }

  releasedAttempts(): any[] {
    return this.attempts.filter((attempt) => attempt.resultReleased !== false);
  }

  latestReleasedAttempt(): any | null {
    return this.releasedAttempts()[0] ?? null;
  }

  recommendationAttempt(): any | null {
    return this.releasedAttempts().find((attempt) => this.attemptRecommendations(attempt).length > 0) ?? null;
  }

  firstRecommendation(): any | null {
    const attempt = this.recommendationAttempt();
    return attempt ? this.attemptRecommendations(attempt)[0] ?? null : null;
  }

  recentAttempts(): any[] {
    return this.attempts.slice(0, 5);
  }

  latestAttempt(): any | null {
    return this.releasedAttempts()[0] ?? this.attempts[0] ?? null;
  }

  passedAttemptsCount(): number {
    return this.releasedAttempts().filter((attempt) => attempt.passed).length;
  }

  passRatePercent(): number {
    const released = this.releasedAttempts();
    if (released.length === 0) {
      return 0;
    }
    return Math.round((this.passedAttemptsCount() / released.length) * 100);
  }

  averageScorePercent(): number {
    const scores = this.releasedAttempts()
      .map((attempt) => Number(attempt.score))
      .filter((score) => Number.isFinite(score));
    if (scores.length === 0) {
      return 0;
    }
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  studentInitial(): string {
    return this.studentName().trim().charAt(0).toUpperCase() || "S";
  }

  studentIdLabel(): string {
    const id = this.authService.session()?.userId;
    if (!id) {
      return "Student ID: -";
    }
    return `Student ID: STU${String(id).padStart(8, "0")}`;
  }

  scorePercentLabel(attempt: any): string {
    if (attempt?.resultReleased === false || attempt?.score === null || attempt?.score === undefined) {
      return "-";
    }
    return `${Math.round(Number(attempt.score))}%`;
  }

  scoreMarksLabel(attempt: any): string {
    if (attempt?.resultReleased === false || attempt?.score === null || attempt?.score === undefined) {
      return "-";
    }
    const maxScore = Number(attempt?.maxScore ?? 0);
    if (maxScore > 0) {
      const awarded = Math.round((Number(attempt.score) / 100) * maxScore);
      return `${awarded} / ${Math.round(maxScore)}`;
    }
    return this.scorePercentLabel(attempt);
  }

  passMarkLabel(attempt: any): string {
    const raw = Number(attempt?.passingMark ?? attempt?.passMark ?? 50);
    return `${Number.isFinite(raw) ? Math.round(raw) : 50}%`;
  }

  timeTakenLabel(attempt: any): string {
    const seconds = Number(attempt?.durationSeconds ?? 0);
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return "-";
    }
    const minutes = Math.floor(seconds / 60);
    const remaining = Math.round(seconds % 60);
    if (minutes <= 0) {
      return `${remaining} sec`;
    }
    return `${minutes} min ${remaining} sec`;
  }

  resultStatusLabel(attempt: any): string {
    if (attempt?.resultReleased === false) {
      return "Pending";
    }
    if (attempt?.passed === null || attempt?.passed === undefined) {
      return "Completed";
    }
    return attempt.passed ? "Passed" : "Failed";
  }

  resultPillClass(attempt: any): string {
    if (attempt?.resultReleased === false) {
      return "pending";
    }
    return attempt?.passed ? "passed" : "failed";
  }

  latestRecommendations(): any[] {
    const latest = this.latestAttempt();
    const fromLatest = latest ? this.attemptRecommendations(latest) : [];
    if (fromLatest.length > 0) {
      return fromLatest.slice(0, 3);
    }
    const recommended = this.recommendationAttempt();
    return recommended ? this.attemptRecommendations(recommended).slice(0, 3) : [];
  }

  recommendationCards(): Array<{ type: string; title: string; subtitle: string; route: string | any[] }> {
    const latest = this.latestAttempt();
    const attemptId = latest?.attemptId ?? this.recommendationAttempt()?.attemptId ?? 0;
    const recommendations = this.latestRecommendations();
    const first = recommendations[0] ?? {};
    const topic = String(first?.weakTopic ?? first?.topicTag ?? "Core Concept");
    const materials = this.recommendationMaterials(first);
    const materialTitle = String(materials[0]?.title ?? first?.recommendedNotes?.title ?? first?.recommendedVideo?.title ?? `${topic} Materials`);
    const practiceTitle = String(first?.practiceQuiz?.title ?? `${topic} Practice Quiz`);
    return [
      {
        type: "topic",
        title: topic,
        subtitle: "Strengthen your understanding of normalization concepts.",
        route: attemptId ? ["/student/attempts", attemptId, "recommendation"] : "/student/history"
      },
      {
        type: "material",
        title: materialTitle,
        subtitle: "Read the material to improve your knowledge.",
        route: attemptId ? ["/student/attempts", attemptId, "recommendation"] : "/student/history"
      },
      {
        type: "practice",
        title: practiceTitle,
        subtitle: "Try this quiz to test your understanding.",
        route: attemptId ? ["/student/attempts", attemptId, "improvement"] : "/student/history"
      }
    ];
  }

  scoreLabel(attempt: any): string {
    if (attempt?.resultReleased === false || attempt?.score === null || attempt?.score === undefined) {
      return "-";
    }
    return `${Math.round(Number(attempt.score))}%`;
  }

  completionStatusLabel(attempt: any): string {
    if (attempt?.resultReleased === false) {
      return "Pending";
    }
    if (attempt?.passed === null || attempt?.passed === undefined) {
      return "Completed";
    }
    return attempt.passed ? "Completed" : "Review";
  }

  attemptRecommendations(attempt: any): any[] {
    const rows = attempt?.recommendations;
    return Array.isArray(rows) ? rows : [];
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

  selectedRecommendations(): any[] {
    const rows = this.selectedResult?.summary?.recommendations;
    return Array.isArray(rows) ? rows : [];
  }

  feedbackSettings(): any {
    return this.selectedResult?.feedbackSettings ?? this.selectedResult?.summary?.feedbackSettings ?? {};
  }

  canShowScoreFeedback(): boolean {
    return this.feedbackSettings().showScoreAfterSubmission !== false;
  }

  canShowCorrectAnswer(): boolean {
    return this.feedbackSettings().showCorrectAnswer !== false;
  }

  canShowExplanation(): boolean {
    return this.feedbackSettings().showExplanation !== false;
  }

  canShowRelatedConcept(): boolean {
    return this.feedbackSettings().showRelatedConcept !== false;
  }

  canShowLearningRecommendation(): boolean {
    return this.feedbackSettings().showLearningRecommendation !== false;
  }

  canShowStudentAnswerReview(): boolean {
    return this.feedbackSettings().showStudentAnswerReview !== false;
  }

  recommendationMaterials(item: any): any[] {
    if (Array.isArray(item?.learningMaterials)) {
      return item.learningMaterials;
    }
    if (Array.isArray(item?.materials)) {
      return item.materials;
    }
    return [];
  }

  learningMaterialLabel(material: any): string {
    const type = String(material?.type ?? material?.materialType ?? "MATERIAL").toUpperCase();
    if (type.includes("VIDEO")) {
      return "Video";
    }
    if (type.includes("PDF") || type.includes("NOTE")) {
      return "Notes";
    }
    if (type.includes("SLIDE")) {
      return "Slides";
    }
    return "Material";
  }

  answerRelatedConcept(answer: any): string {
    const inferred = this.inferConceptFromAnswer(answer);
    const topic = String(answer?.topicTag ?? "General").trim() || "General";
    const concept = String(answer?.learningConcept ?? inferred.concept).trim() || inferred.concept;
    const effectiveTopic = topic === "General" && inferred.topic !== "General" ? inferred.topic : topic;
    return concept.toLowerCase() === effectiveTopic.toLowerCase() ? effectiveTopic : `${effectiveTopic} -> ${concept}`;
  }

  answerFeedbackDetail(answer: any): string {
    const feedback = String(answer?.feedbackDetail ?? answer?.explanation ?? "").trim();
    if (feedback && feedback !== "-") {
      return feedback;
    }
    if (answer?.correct) {
      return "Your answer matches the expected concept. Keep using the same reasoning in similar questions.";
    }
    return `Compare your answer with the correct answer and focus on ${this.answerRelatedConcept(answer)}.`;
  }

  optionFeedbackRows(answer: any): any[] {
    const rows = Array.isArray(answer?.optionFeedback) ? answer.optionFeedback : [];
    const questionType = String(answer?.questionType ?? "").toUpperCase();
    if (questionType === "MATCHING") {
      return rows.filter((row: any) => !row?.correctOption);
    }
    if (questionType === "SHORT_ANSWER") {
      return rows.filter((row: any) => !row?.selected);
    }
    if (questionType === "MULTI_SELECT" && !answer?.correct) {
      return rows.filter((row: any) => !row?.correctOption || (row?.correctOption && !row?.selected));
    }
    return rows.filter((row: any) => !row?.correctOption);
  }

  optionFeedbackTitle(answer: any): string {
    const questionType = String(answer?.questionType ?? "").toUpperCase();
    if (questionType === "MATCHING") {
      return "Which matches need correction?";
    }
    if (questionType === "SHORT_ANSWER") {
      return "Which keywords were missing?";
    }
    return "Why other options are wrong?";
  }

  firstReviewMaterial(answer: any): any | null {
    const inferred = this.inferConceptFromAnswer(answer);
    const rawTopic = String(answer?.topicTag ?? "General").trim() || "General";
    const topic = (rawTopic === "General" ? inferred.topic : rawTopic).toLowerCase();
    const concept = String(answer?.learningConcept ?? inferred.concept).toLowerCase();
    for (const item of this.selectedRecommendations()) {
      const itemTopic = String(item?.topicTag ?? item?.weakTopic ?? "").toLowerCase();
      const concepts = Array.isArray(item?.concepts) ? item.concepts.map((value: any) => String(value).toLowerCase()) : [];
      const topicMatches = topic && itemTopic && (topic === itemTopic || itemTopic.includes(topic) || topic.includes(itemTopic));
      const conceptMatches = concept && concepts.some((value: string) => value === concept || value.includes(concept) || concept.includes(value));
      if (topicMatches || conceptMatches) {
        return this.recommendationMaterials(item)[0] ?? item;
      }
    }
    return null;
  }

  private inferConceptFromAnswer(answer: any): { topic: string; concept: string } {
    const source = `${answer?.prompt ?? ""} ${answer?.explanation ?? ""} ${answer?.feedbackDetail ?? ""}`.toLowerCase();
    if (source.includes("data management")) {
      return { topic: "Data Management", concept: "Data Organization and Storage" };
    }
    if (source.includes("structured data") || source.includes("store structured")) {
      return { topic: "Database", concept: "Structured Data Storage" };
    }
    if (source.includes("etl")) {
      return { topic: "Data Integration", concept: "ETL Process" };
    }
    if (source.includes("database") || source.includes("sql")) {
      return { topic: "Database", concept: "Database Basics" };
    }
    if (source.includes("api")) {
      return { topic: "API", concept: "API Basics" };
    }
    return { topic: "General", concept: "General Revision" };
  }

  private csvCell(value: unknown): string {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, "\"\"")}"`;
  }

  private applyAttemptFilter(): void {
    if (this.courseFilter === "ALL") {
      this.attempts = this.allAttempts;
      return;
    }
    this.attempts = this.allAttempts.filter((row) => {
      const rowCourseId = Number(row?.courseId ?? 0);
      const rowCourseTitle = String(row?.courseTitle ?? "").trim().toLowerCase();
      if (this.courseFilter.startsWith("id:")) {
        return rowCourseId === Number(this.courseFilter.slice(3));
      }
      if (this.courseFilter.startsWith("title:")) {
        return rowCourseTitle === this.courseFilter.slice(6);
      }
      return false;
    });
  }

  private initialCourseFilter(rows: any[]): string {
    if (!this.scopedCourseId && !this.scopedCourseTitle) {
      return "ALL";
    }
    const scoped = rows.find((row) => {
      const rowCourseId = Number(row?.courseId ?? 0);
      const rowCourseTitle = String(row?.courseTitle ?? "").trim().toLowerCase();
      if (this.scopedCourseId && rowCourseId === this.scopedCourseId) {
        return true;
      }
      return !!this.scopedCourseTitle && rowCourseTitle === this.scopedCourseTitle;
    });
    if (!scoped) {
      return "ALL";
    }
    const courseId = Number(scoped?.courseId ?? 0);
    const courseTitle = String(scoped?.courseTitle ?? "").trim().toLowerCase();
    return courseId > 0 ? `id:${courseId}` : `title:${courseTitle}`;
  }
}
