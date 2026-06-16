import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { StudentService } from "../../services/student.service";

@Component({
  selector: "app-student-quiz",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: "./student-quiz.component.html",
  styleUrl: "./student-quiz.component.css"
})
export class StudentQuizComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly studentService = inject(StudentService);
  private countdownRef: ReturnType<typeof setInterval> | null = null;

  quizData: any = null;
  quizPreview: any = null;
  loading = true;
  errorMessage = "";
  currentIndex = 0;
  remainingSeconds = 0;
  answers: Record<string, unknown> = {};
  confidence: Record<string, string> = {};
  timeSpentSeconds: Record<string, number> = {};
  private questionSeenAt: Record<string, number> = {};
  result: any = null;
  aiFeedback: any = null;
  aiFeedbackLoading = false;
  aiFeedbackError = "";
  blockedSummary: any = null;
  submitting = false;
  startingQuiz = false;
  resetRequesting = false;
  resetRequestMessage = "";
  resetRequestError = "";
  showTimer = true;
  showQuizNavigation = true;
  showSubmitConfirm = false;
  submitConfirmMessage = "";
  reviewFilter: "all" | "mistakes" = "all";
  reflection = "";
  courseId: number | null = null;
  quizId: number | null = null;

  get currentQuestion(): any {
    return this.quizData?.questions?.[this.currentIndex];
  }

  get isAllAtOnce(): boolean {
    return this.quizData?.displayMode === "ALL_AT_ONCE";
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const quizId = Number(params["quizId"]);
      if (!quizId) {
        this.router.navigateByUrl("/student/dashboard");
        return;
      }
      const courseIdParam = Number(this.route.snapshot.queryParamMap.get("courseId"));
      this.courseId = Number.isFinite(courseIdParam) && courseIdParam > 0 ? courseIdParam : null;
      this.loadQuizPreview(quizId);
    });
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  beginQuiz(): void {
    if (!this.quizId || this.startingQuiz) {
      return;
    }
    this.startingQuiz = true;
    this.startQuiz(this.quizId);
  }

  startQuiz(quizId: number): void {
    this.quizId = quizId;
    this.loading = true;
    this.errorMessage = "";
    this.result = null;
    this.aiFeedback = null;
    this.aiFeedbackError = "";
    this.aiFeedbackLoading = false;
    this.blockedSummary = null;
    this.resetRequestMessage = "";
    this.resetRequestError = "";
    this.quizPreview = null;
    this.answers = {};
    this.confidence = {};
    this.timeSpentSeconds = {};
    this.questionSeenAt = {};
    this.reflection = "";
    this.currentIndex = 0;
    this.showTimer = true;
    this.studentService.startQuiz(quizId).subscribe({
      next: (data) => {
        this.startingQuiz = false;
        const questions = Array.isArray(data?.questions) ? data.questions : [];
        if (questions.length === 0) {
          this.quizData = null;
          this.errorMessage = "This quiz has no questions yet. Please contact your lecturer.";
          this.loading = false;
          return;
        }
        this.quizData = { ...data, questions };
        this.loadSavedAnswers();
        this.markQuestionSeen(this.currentQuestion?.questionId);
        const timeLimitMinutes = Math.max(0, Math.floor(Number(data?.timeLimitMinutes ?? 0)));
        this.remainingSeconds = timeLimitMinutes * 60;
        this.beginTimer();
        this.loading = false;
      },
      error: (error) => {
        this.startingQuiz = false;
        const backendMessage = String(error?.error?.message ?? "");
        const lower = backendMessage.toLowerCase();
        const shouldShowSummary =
          lower.includes("already answered") ||
          lower.includes("maximum attempts") ||
          lower.includes("already closed") ||
          lower.includes("not open yet") ||
          lower.includes("mandatory videos");

        if (shouldShowSummary) {
          this.loadBlockedSummary(quizId, backendMessage);
          return;
        }

        if (lower.includes("no questions")) {
          this.errorMessage = "This quiz has no questions yet. Please contact your lecturer.";
        } else {
          this.errorMessage = backendMessage || "Unable to start quiz";
        }
        this.loading = false;
      }
    });
  }

  previousQuestion(): void {
    if (this.currentIndex > 0) {
      this.recordCurrentQuestionTime();
      this.currentIndex--;
      this.markQuestionSeen(this.currentQuestion?.questionId);
    }
  }

  nextQuestion(): void {
    if (this.currentIndex < this.quizData.questions.length - 1) {
      this.recordCurrentQuestionTime();
      this.currentIndex++;
      this.markQuestionSeen(this.currentQuestion?.questionId);
    }
  }

  goToQuestion(index: number): void {
    if (!this.quizData?.questions || index < 0 || index >= this.quizData.questions.length) {
      return;
    }
    this.recordCurrentQuestionTime();
    this.currentIndex = index;
    this.markQuestionSeen(this.currentQuestion?.questionId);
  }

  skipQuestion(): void {
    if (!this.quizData?.questions || this.isCurrentLastQuestion()) {
      return;
    }
    this.nextQuestion();
  }

  skipAll(): void {
    if (!this.quizData?.questions?.length) {
      return;
    }
    this.recordCurrentQuestionTime();
    this.currentIndex = this.quizData.questions.length - 1;
    this.markQuestionSeen(this.currentQuestion?.questionId);
  }

  updateAnswer(questionId: number, value: unknown): void {
    this.markQuestionSeen(questionId);
    this.answers[String(questionId)] = value;
    this.recordQuestionTime(questionId);
    this.persistAnswers();
  }

  toggleMulti(questionId: number, option: string, checked: boolean): void {
    this.markQuestionSeen(questionId);
    const key = String(questionId);
    const list = Array.isArray(this.answers[key]) ? [...(this.answers[key] as string[])] : [];
    const index = list.indexOf(option);
    if (checked && index === -1) {
      list.push(option);
    }
    if (!checked && index >= 0) {
      list.splice(index, 1);
    }
    this.answers[key] = list;
    this.recordQuestionTime(questionId);
    this.persistAnswers();
  }

  updateMatching(questionId: number, left: string, selected: string): void {
    this.markQuestionSeen(questionId);
    const key = String(questionId);
    const current = (this.answers[key] as Record<string, string> | undefined) ?? {};
    this.answers[key] = { ...current, [left]: selected };
    this.recordQuestionTime(questionId);
    this.persistAnswers();
  }

  updateConfidence(questionId: number, level: string): void {
    this.markQuestionSeen(questionId);
    this.confidence[String(questionId)] = level;
    this.persistAnswers();
  }

  submitQuiz(force = false): void {
    if (!this.quizData || this.submitting || this.result) {
      return;
    }
    if (!force) {
      const total = Array.isArray(this.quizData?.questions) ? this.quizData.questions.length : 0;
      const unanswered = Math.max(0, total - this.answeredCount());
      this.submitConfirmMessage = unanswered > 0
        ? `Are you sure to submit? You still have ${unanswered} unanswered question(s).`
        : "Are you sure to submit?";
      this.showSubmitConfirm = true;
      return;
    }
    this.showSubmitConfirm = false;
    this.errorMessage = "";
    this.submitting = true;
    this.recordAllQuestionTimes();
    this.studentService.submitQuiz(this.quizData.quizId, {
      attemptId: this.quizData.attemptId,
      answers: this.answers,
      confidence: this.confidence,
      timeSpentSeconds: this.timeSpentSeconds,
      reflection: this.reflection
    }).subscribe({
      next: (data) => {
        this.result = data;
        this.aiFeedback = null;
        this.aiFeedbackError = "";
        this.aiFeedbackLoading = false;
        this.submitting = false;
        this.clearTimer();
        this.clearSavedAnswers();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? "Failed to submit quiz";
        this.submitting = false;
      }
    });
  }

  cancelSubmitConfirm(): void {
    this.showSubmitConfirm = false;
  }

  confirmSubmitQuiz(): void {
    this.submitQuiz(true);
  }

  optionsArray(question: any): string[] {
    const options = this.parseOptionContainer(question?.options);
    if (Array.isArray(options)) {
      return options.map((option) => this.optionValue(option)).filter(Boolean);
    }
    return [];
  }

  matchingLeft(question: any): string[] {
    const options = this.parseOptionContainer(question?.options);
    if (!options || typeof options !== "object") {
      return [];
    }
    return Array.isArray((options as any).left)
      ? (options as any).left.map((option: unknown) => this.optionValue(option)).filter(Boolean)
      : [];
  }

  matchingRight(question: any): string[] {
    const options = this.parseOptionContainer(question?.options);
    if (!options || typeof options !== "object") {
      return [];
    }
    return Array.isArray((options as any).right)
      ? (options as any).right.map((option: unknown) => this.optionValue(option)).filter(Boolean)
      : [];
  }

  optionDisplay(value: unknown): string {
    const parsed = this.parseDisplayValue(value);
    return this.formatDisplayValue(parsed);
  }

  answerText(questionId: number): string {
    const value = this.answers[String(questionId)];
    return typeof value === "string" ? value : "";
  }

  isMultiChecked(questionId: number, option: string): boolean {
    const value = this.answers[String(questionId)];
    return Array.isArray(value) && value.includes(option);
  }

  matchingValue(questionId: number, left: string): string {
    const value = this.answers[String(questionId)] as Record<string, string> | undefined;
    return value?.[left] ?? "";
  }

  confidenceValue(questionId: number): string {
    return this.confidence[String(questionId)] ?? "";
  }

  confidenceOptions(): Array<{ value: string; label: string }> {
    return [
      { value: "LOW", label: "Low" },
      { value: "MEDIUM", label: "Medium" },
      { value: "HIGH", label: "High" }
    ];
  }

  timeLabel(): string {
    const min = Math.floor(this.remainingSeconds / 60).toString().padStart(2, "0");
    const sec = Math.floor(this.remainingSeconds % 60).toString().padStart(2, "0");
    return `${min}:${sec}`;
  }

  toggleTimerVisibility(): void {
    this.showTimer = !this.showTimer;
  }

  backRoute(): any[] {
    if (this.courseId) {
      return ["/student/courses", this.courseId];
    }
    return ["/student/dashboard"];
  }

  optionLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }

  questionTypeInstruction(question: any): string {
    const type = String(question?.questionType ?? "").toUpperCase();
    if (type === "MULTI_SELECT") {
      return "Select all correct answers";
    }
    if (type === "MATCHING") {
      return "Choose one answer for each row";
    }
    if (type === "SHORT_ANSWER") {
      return "Type your answer";
    }
    return "Select one correct answer";
  }

  questionMarks(question: any): string {
    const points = Number(question?.points ?? question?.maxPoints ?? 1);
    const safePoints = Number.isFinite(points) && points > 0 ? points : 1;
    return safePoints.toFixed(2);
  }

  previewPrimaryActionLabel(): string {
    if (this.startingQuiz) {
      return "Opening...";
    }
    if (this.quizPreview?.hasOpenAttempt) {
      return "Continue your attempt";
    }
    if (this.quizPreview?.locked) {
      return "Attempt unavailable";
    }
    return "Start your attempt";
  }

  previewAttemptStatus(): string {
    if (this.quizPreview?.hasOpenAttempt) {
      return "In progress";
    }
    if (this.quizPreview?.locked) {
      return "Not available";
    }
    return Number(this.quizPreview?.attemptsUsed ?? 0) > 0 ? "Completed" : "Not started";
  }

  previewStartedLabel(): string {
    if (this.quizPreview?.hasOpenAttempt) {
      return "Saved attempt available";
    }
    if (Number(this.quizPreview?.attemptsUsed ?? 0) > 0) {
      return "No active attempt";
    }
    return "Start when ready";
  }

  isQuestionAnswered(index: number): boolean {
    const question = this.quizData?.questions?.[index];
    if (!question) {
      return false;
    }
    const answer = this.answers[String(question.questionId)];
    if (question.questionType === "MULTI_SELECT") {
      return Array.isArray(answer) && answer.length > 0;
    }
    if (question.questionType === "MATCHING") {
      return !!answer && typeof answer === "object" && Object.keys(answer as Record<string, string>).length > 0;
    }
    return typeof answer === "string" && answer.trim().length > 0;
  }

  answeredCount(): number {
    if (!this.quizData?.questions) {
      return 0;
    }
    return this.quizData.questions.filter((_: any, index: number) => this.isQuestionAnswered(index)).length;
  }

  answeredPercent(): number {
    const total = Number(this.quizData?.questions?.length ?? 0);
    if (!total) {
      return 0;
    }
    return Math.round((this.answeredCount() / total) * 100);
  }

  isCurrentLastQuestion(): boolean {
    return this.quizData?.questions ? this.currentIndex === this.quizData.questions.length - 1 : false;
  }

  allQuestions(): any[] {
    return this.quizData?.questions ?? [];
  }

  reviewAnswers(): any[] {
    return Array.isArray(this.result?.answers) ? this.result.answers : [];
  }

  submittedAnswerRows(): any[] {
    const questions = Array.isArray(this.quizData?.questions) ? this.quizData.questions : [];
    return questions.map((question: any, index: number) => {
      const gradedAnswer = this.reviewAnswers().find(
        (answer) => Number(answer?.questionId ?? 0) === Number(question?.questionId ?? 0)
      );
      return {
        questionId: question?.questionId,
        sortOrder: question?.sortOrder ?? index + 1,
        prompt: question?.prompt,
        questionType: question?.questionType,
        studentAnswer: this.answers[String(question?.questionId)],
        correct: gradedAnswer?.correct,
        awardedPoints: gradedAnswer?.awardedPoints,
        maxPoints: gradedAnswer?.maxPoints
      };
    });
  }

  postSubmitStatusLabel(): string {
    if (this.result?.resultReleased === false) {
      return "Waiting for release";
    }
    if (!this.canShowScoreFeedback()) {
      return "Submitted";
    }
    return this.result?.passed ? "Passed" : "Needs review";
  }

  postSubmitScoreLabel(): string {
    if (this.result?.resultReleased === false) {
      return "Pending";
    }
    if (!this.canShowScoreFeedback() || this.result?.score === null || this.result?.score === undefined) {
      return "Hidden";
    }
    return `${this.resultScore()}%`;
  }

  postSubmitReleaseMessage(): string {
    if (this.result?.resultReleased === false) {
      return this.result?.resultNote ?? "Quiz review is currently unavailable. Please wait for lecturer release.";
    }
    return "Feedback is released. Continue with detailed feedback, learning recommendation, and performance improvement on separate pages.";
  }

  attemptInsightRoute(mode: "feedback" | "recommendation" | "improvement"): any[] {
    return ["/student/attempts", this.result?.attemptId, mode];
  }

  masteryRows(): any[] {
    return Array.isArray(this.result?.mastery) ? this.result.mastery : [];
  }

  effectiveMasteryRows(): any[] {
    const rows = this.masteryRows();
    if (rows.length > 0) {
      return rows.map((row) => this.normalizeMasteryRow(row));
    }
    const grouped = new Map<string, { topicTag: string; earned: number; max: number; correct: number; total: number }>();
    for (const answer of this.reviewAnswers()) {
      const topicTag = this.answerTopic(answer);
      const current = grouped.get(topicTag) ?? { topicTag, earned: 0, max: 0, correct: 0, total: 0 };
      const maxPoints = Math.max(1, Number(answer?.maxPoints ?? answer?.points ?? 1));
      const awardedPoints = Math.max(0, Number(answer?.awardedPoints ?? (answer?.correct ? maxPoints : 0)));
      current.earned += awardedPoints;
      current.max += maxPoints;
      current.correct += answer?.correct ? 1 : 0;
      current.total += 1;
      grouped.set(topicTag, current);
    }
    return Array.from(grouped.values()).map((item) => {
      const score = item.max > 0 ? Math.round((item.earned / item.max) * 100) : 0;
      return {
        topicTag: item.topicTag,
        score,
        status: this.masteryStatus(score),
        correct: item.correct,
        total: item.total
      };
    });
  }

  recommendations(): any[] {
    return Array.isArray(this.result?.recommendations) ? this.result.recommendations : [];
  }

  recommendationConcepts(item: any): string[] {
    return Array.isArray(item?.concepts) ? item.concepts : [];
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

  primaryRecommendations(): any[] {
    return this.effectiveRecommendations().slice(0, 3);
  }

  coachWeakTopics(): string {
    const topics = this.primaryRecommendations()
      .map((item) => String(item?.weakTopic ?? item?.topicTag ?? "").trim())
      .filter(Boolean);
    return topics.length > 0 ? topics.join(", ") : "No weak topic detected";
  }

  materialStatus(item: any): any {
    return item?.materialCompletionStatus ?? {};
  }

  materialStatusLine(item: any): string {
    const status = this.materialStatus(item);
    const video = Math.max(0, Math.min(100, Math.round(Number(status.videoProgress ?? 0))));
    const notesOpened = Boolean(status.notesOpened);
    const notesCompletion = Math.max(0, Math.min(100, Math.round(Number(status.notesCompletion ?? 0))));
    return `Video watched: ${video}% | Notes: ${notesOpened ? notesCompletion + "% complete" : "not opened"}`;
  }

  engagementMessages(item: any): string[] {
    return Array.isArray(item?.engagementMessages) ? item.engagementMessages : [];
  }

  confidenceReflections(item: any): string[] {
    return Array.isArray(item?.confidenceReflections) ? item.confidenceReflections : [];
  }

  suggestedLearningPath(item: any): string[] {
    return Array.isArray(item?.suggestedLearningPath) ? item.suggestedLearningPath : [];
  }

  topicMasteryLabel(item: any): string {
    const mastery = Number(item?.topicMastery ?? 0);
    return Number.isFinite(mastery) ? `${Math.round(mastery)}%` : "-";
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

  effectiveRecommendations(): any[] {
    const rows = this.recommendations();
    if (rows.length > 0) {
      return rows;
    }
    const weakAnswers = this.reviewAnswers().filter((answer) => !answer?.correct);
    const byTopic = new Map<string, any>();
    for (const answer of weakAnswers) {
      const topicTag = this.answerTopic(answer);
      if (!byTopic.has(topicTag)) {
        byTopic.set(topicTag, {
          topicTag,
          weakTopic: topicTag,
          title: `Revise ${topicTag}`,
          reason: this.answerFeedbackDetail(answer),
          actionLabel: this.answerRecommendation(answer),
          concepts: [String(answer?.learningConcept ?? topicTag)],
          learningMaterials: []
        });
      }
    }
    if (byTopic.size === 0 && this.reviewAnswers().length > 0) {
      return [{
        topicTag: "Next Challenge",
        weakTopic: "Next Challenge",
        title: "Move to deeper practice",
        reason: "No weak topic detected in this attempt.",
        actionLabel: "Try a harder quiz or simulation",
        concepts: [],
        learningMaterials: []
      }];
    }
    return Array.from(byTopic.values());
  }

  retakeQuestions(): any[] {
    return Array.isArray(this.result?.retakePlan?.questions) ? this.result.retakePlan.questions : [];
  }

  effectiveRetakeQuestions(): any[] {
    const rows = this.retakeQuestions();
    if (rows.length > 0) {
      return rows;
    }
    return this.reviewAnswers()
      .filter((answer) => !answer?.correct)
      .slice(0, 5)
      .map((answer) => ({
        questionId: answer?.questionId,
        topicTag: this.answerTopic(answer),
        focus: this.answerLearningTip(answer)
      }));
  }

  retakeMessage(): string {
    return String(this.result?.retakePlan?.message ?? "Use your review cards to plan the next attempt.");
  }

  confidenceMessage(): string {
    return String(this.result?.confidenceSummary?.message ?? "Confidence data will appear after submission.");
  }

  timeMessage(): string {
    return String(this.result?.timeAnalysis?.message ?? "Timing data will appear after submission.");
  }

  confidenceStats(): { highWrong: number; lowCorrect: number; totalRated: number } {
    const summary = this.result?.confidenceSummary ?? {};
    let highWrong = Number(summary.highWrong ?? 0);
    let lowCorrect = Number(summary.lowCorrect ?? 0);
    let totalRated = Number(summary.totalRated ?? summary.total ?? 0);
    if (totalRated > 0) {
      return { highWrong, lowCorrect, totalRated };
    }
    for (const answer of this.reviewAnswers()) {
      const level = String(answer?.confidenceLevel ?? "").toUpperCase();
      if (!level || level === "UNSET") {
        continue;
      }
      totalRated++;
      if (level === "HIGH" && !answer?.correct) {
        highWrong++;
      }
      if (level === "LOW" && answer?.correct) {
        lowCorrect++;
      }
    }
    return { highWrong, lowCorrect, totalRated };
  }

  timeStats(): { averageSeconds: number; slowCount: number; fastWrong: number } {
    const analysis = this.result?.timeAnalysis ?? {};
    let averageSeconds = Number(analysis.averageSeconds ?? 0);
    let slowCount = Number(analysis.slowCount ?? 0);
    let fastWrong = Number(analysis.fastWrong ?? 0);
    const timedAnswers = this.reviewAnswers().filter((answer) => Number(answer?.timeSpentSeconds ?? 0) > 0);
    if (!timedAnswers.length) {
      return { averageSeconds, slowCount, fastWrong };
    }
    if (!averageSeconds) {
      averageSeconds = Math.round(timedAnswers.reduce((sum, answer) => sum + Number(answer.timeSpentSeconds ?? 0), 0) / timedAnswers.length);
    }
    if (!slowCount) {
      slowCount = timedAnswers.filter((answer) => String(answer?.timeSignal ?? "").toUpperCase().includes("SLOW")).length;
    }
    if (!fastWrong) {
      fastWrong = timedAnswers.filter((answer) => !answer?.correct && String(answer?.timeSignal ?? "").toUpperCase().includes("FAST")).length;
    }
    return { averageSeconds, slowCount, fastWrong };
  }

  lecturerSignalCards(): Array<{ label: string; value: string; note: string }> {
    const confidence = this.confidenceStats();
    const time = this.timeStats();
    return [
      {
        label: "Weak topics",
        value: String(this.effectiveMasteryRows().filter((row) => Number(row.score) < 60).length),
        note: "Appears in lecturer insight dashboard"
      },
      {
        label: "Confidence risk",
        value: String(confidence.highWrong),
        note: "Helps lecturer find overconfident mistakes"
      },
      {
        label: "Reflection",
        value: this.result?.reflection || this.reflection ? "Shared" : "Optional",
        note: "Supports manual review and feedback"
      },
      {
        label: "Pacing",
        value: `${time.averageSeconds || 0}s avg`,
        note: "Used for time-risk analysis"
      }
    ];
  }

  filteredReviewAnswers(): any[] {
    const answers = this.reviewAnswers();
    if (this.reviewFilter === "mistakes" && this.canShowScoreFeedback()) {
      return answers.filter((answer) => !answer?.correct);
    }
    return answers;
  }

  setReviewFilter(filter: "all" | "mistakes"): void {
    this.reviewFilter = filter;
  }

  feedbackSettings(): any {
    return this.result?.feedbackSettings ?? this.result?.summary?.feedbackSettings ?? {};
  }

  canShowScoreFeedback(): boolean {
    return this.feedbackSettings().showScoreBreakdown !== false && this.feedbackSettings().showScoreAfterSubmission !== false;
  }

  canShowSelectedAnswer(): boolean {
    return this.feedbackSettings().showSelectedAnswer !== false && this.feedbackSettings().showStudentAnswerReview !== false;
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

  canShowConfidence(): boolean {
    return this.feedbackSettings().showConfidence !== false;
  }

  canShowStudentAnswerReview(): boolean {
    return this.reviewAnswers().length > 0;
  }

  canShowSubmittedAnswerList(): boolean {
    return this.result?.resultReleased !== false && this.canShowSelectedAnswer();
  }

  resultScore(): number {
    const score = Number(this.result?.score ?? 0);
    if (!Number.isFinite(score)) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  resultStreak(): number {
    const streak = Number(this.result?.streak ?? 0);
    if (Number.isFinite(streak) && streak > 0) {
      return Math.round(streak);
    }
    let best = 0;
    let current = 0;
    for (const answer of this.reviewAnswers()) {
      if (answer?.correct) {
        current++;
        best = Math.max(best, current);
      } else {
        current = 0;
      }
    }
    return best;
  }

  resultAchievement(): string {
    return String(this.result?.achievement ?? (this.result?.passed ? "Steady Learner" : "Comeback Builder"));
  }

  resultHeadline(): string {
    if (!this.result?.resultReleased) {
      return "Submitted successfully";
    }
    if (!this.canShowScoreFeedback()) {
      return "Submitted successfully";
    }
    if (this.resultScore() >= 85) {
      return "Excellent assessment run";
    }
    if (this.result?.passed) {
      return "Good pass, keep polishing";
    }
    return "Review, retry, and bounce back";
  }

  resultSummaryPoints(): string[] {
    if (!this.canShowScoreFeedback()) {
      return [];
    }
    if (Array.isArray(this.result?.summaryPoints) && this.result.summaryPoints.length > 0) {
      return this.result.summaryPoints;
    }
    return [
      `You answered ${this.result?.correctCount ?? 0} out of ${this.result?.totalQuestions ?? 0} correctly.`,
      this.result?.passed ? "You passed this attempt." : "Review the incorrect cards before retrying.",
      "Use the explanation and simulation impact notes to understand each mistake."
    ];
  }

  resultWeakCount(): number {
    return this.reviewAnswers().filter((answer) => !answer?.correct).length;
  }

  resultStrongCount(): number {
    return this.reviewAnswers().filter((answer) => answer?.correct).length;
  }

  nextBestAction(): string {
    if (!this.result?.resultReleased) {
      return "Wait for lecturer release, then review your answer cards.";
    }
    if (!this.canShowScoreFeedback()) {
      return "Review the visible feedback items and continue with the next learning activity.";
    }
    if (this.resultWeakCount() === 0) {
      return "Continue to the next lesson or try a challenge quiz.";
    }
    const firstWeakTopic = this.effectiveMasteryRows()
      .filter((row) => Number(row.score) < 70)
      .sort((a, b) => Number(a.score) - Number(b.score))[0]?.topicTag;
    return firstWeakTopic
      ? `Start with ${firstWeakTopic}, then retry similar questions.`
      : "Review mistakes first, then retry similar questions.";
  }

  reviewFilterCount(): number {
    return this.filteredReviewAnswers().length;
  }

  coachMessage(): string {
    if (!this.result?.resultReleased) {
      return "Your attempt is saved. Come back after the release time to study the detailed review.";
    }
    if (!this.canShowScoreFeedback()) {
      return "Your attempt is saved and released. Some feedback items are hidden by lecturer settings.";
    }
    if (this.resultWeakCount() === 0) {
      return "Perfect review deck. You can move to a harder practice scenario next.";
    }
    if (this.result?.passed) {
      return "Nice pass. Open Mistakes only first, fix the weak spots, then continue the lesson.";
    }
    return "Small comeback plan: review mistakes, revisit the related note, then retry with calmer pacing.";
  }

  loadAiFeedback(): void {
    const attemptId = Number(this.result?.attemptId ?? this.result?.summary?.attemptId ?? 0);
    if (!attemptId || this.aiFeedbackLoading) {
      return;
    }
    this.aiFeedbackLoading = true;
    this.aiFeedbackError = "";
    this.studentService.aiFeedback(attemptId).subscribe({
      next: (data) => {
        this.aiFeedback = data?.coach ?? data;
        this.aiFeedbackLoading = false;
      },
      error: (error) => {
        this.aiFeedbackError = error?.error?.message ?? "Unable to load AI feedback";
        this.aiFeedbackLoading = false;
      }
    });
  }

  aiFeedbackReady(): boolean {
    return !!this.aiFeedback;
  }

  aiFeedbackHeadline(): string {
    return String(this.aiFeedback?.headline ?? "AI learning coach");
  }

  aiFeedbackSummary(): string {
    return String(this.aiFeedback?.summary ?? "Generate a personalized explanation and revision plan from this attempt.");
  }

  aiFeedbackSourceLabel(): string {
    const source = String(this.aiFeedback?.source ?? "").toLowerCase();
    if (source === "ai") {
      return String(this.aiFeedback?.provider ?? "AI");
    }
    if (this.aiFeedbackReady()) {
      return "Fallback coach";
    }
    return "Gemini-ready";
  }

  aiPriorityTopics(): any[] {
    return Array.isArray(this.aiFeedback?.priorityTopics) ? this.aiFeedback.priorityTopics : [];
  }

  aiAnswerExplanations(): any[] {
    return Array.isArray(this.aiFeedback?.answerExplanations) ? this.aiFeedback.answerExplanations : [];
  }

  aiStudyPlan(): any[] {
    return Array.isArray(this.aiFeedback?.studyPlan) ? this.aiFeedback.studyPlan : [];
  }

  aiApiStatus(): string {
    return String(this.aiFeedback?.apiStatus ?? "");
  }

  masteryStatus(score: number): string {
    if (score >= 85) {
      return "Mastered";
    }
    if (score >= 60) {
      return "Developing";
    }
    return "Needs support";
  }

  masteryClass(score: number): string {
    if (score >= 85) {
      return "strong";
    }
    if (score >= 60) {
      return "developing";
    }
    return "weak";
  }

  normalizeMasteryRow(row: any): any {
    const score = Math.max(0, Math.min(100, Math.round(Number(row?.score ?? 0))));
    return {
      ...row,
      score,
      status: row?.status ?? this.masteryStatus(score),
      correct: Number(row?.correct ?? row?.correctCount ?? 0),
      total: Number(row?.total ?? row?.totalQuestions ?? 0)
    };
  }

  answerStatusLabel(answer: any): string {
    if (!this.canShowScoreFeedback()) {
      return "Submitted";
    }
    if (answer?.correct) {
      return "Correct";
    }
    const earned = Number(answer?.awardedPoints ?? 0);
    if (earned > 0) {
      return "Partial";
    }
    return "Needs review";
  }

  isPartiallyCorrect(answer: any): boolean {
    if (!this.canShowScoreFeedback() || answer?.correct) {
      return false;
    }
    const earned = Number(answer?.awardedPoints ?? 0);
    const maxPoints = Number(answer?.maxPoints ?? 0);
    return Number.isFinite(earned) && earned > 0 && (!Number.isFinite(maxPoints) || earned < maxPoints);
  }

  answerFeedbackTitle(answer: any): string {
    return String(answer?.feedbackTitle ?? (answer?.correct ? "Correct decision" : "Review this concept"));
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

  answerLearningTip(answer: any): string {
    return String(answer?.learningTip ?? "Look for the key idea, not just the exact wording.");
  }

  answerSimulationImpact(answer: any): string {
    return String(answer?.simulationImpact ?? (
      answer?.correct
        ? "Simulation impact: your decision keeps the scenario stable."
        : "Simulation impact: this mistake could affect the next scenario step."
    ));
  }

  answerTopic(answer: any): string {
    const topic = String(answer?.topicTag ?? "General").trim() || "General";
    const inferred = this.inferConceptFromAnswer(answer);
    return topic === "General" && inferred.topic !== "General" ? inferred.topic : topic;
  }

  answerMeta(answer: any): string {
    const confidence = String(answer?.confidenceLevel ?? "UNSET").toLowerCase();
    const seconds = Number(answer?.timeSpentSeconds ?? 0);
    const time = seconds > 0 ? `${seconds}s` : "not tracked";
    return `Topic: ${this.answerTopic(answer)} | Confidence: ${confidence} | Time: ${time}`;
  }

  answerRecommendation(answer: any): string {
    return String(answer?.recommendation?.actionLabel ?? "Review related material");
  }

  answerRelatedConcept(answer: any): string {
    const inferred = this.inferConceptFromAnswer(answer);
    const topic = this.answerTopic(answer);
    const concept = String(answer?.learningConcept ?? inferred.concept).trim() || inferred.concept;
    const effectiveTopic = topic === "General" && inferred.topic !== "General" ? inferred.topic : topic;
    if (concept.toLowerCase() === effectiveTopic.toLowerCase()) {
      return effectiveTopic;
    }
    if (concept.toLowerCase() === topic.toLowerCase()) {
      return topic;
    }
    return `${effectiveTopic} -> ${concept}`;
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
    const topic = this.answerTopic(answer).toLowerCase();
    const concept = String(answer?.learningConcept ?? inferred.concept).toLowerCase();
    for (const item of this.effectiveRecommendations()) {
      const itemTopic = String(item?.topicTag ?? item?.weakTopic ?? "").toLowerCase();
      const concepts = this.recommendationConcepts(item).map((value) => String(value).toLowerCase());
      const topicMatches = topic && itemTopic && (topic === itemTopic || itemTopic.includes(topic) || topic.includes(itemTopic));
      const conceptMatches = concept && concepts.some((value) => value === concept || value.includes(concept) || concept.includes(value));
      if (topicMatches || conceptMatches) {
        return this.recommendationMaterials(item)[0] ?? item;
      }
    }
    return null;
  }

  reviewMaterialLabel(answer: any): string {
    const material = this.firstReviewMaterial(answer);
    return String(material?.actionLabel ?? "Review Material");
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

  quizDifficultyLabel(): string {
    const total = Number(this.quizData?.questions?.length ?? this.quizPreview?.totalQuestions ?? 0);
    const minutes = Number(this.quizData?.timeLimitMinutes ?? this.quizPreview?.timeLimitMinutes ?? 0);
    if (total >= 10 || (minutes > 0 && minutes <= 15)) {
      return "Challenge";
    }
    if (total >= 5 || (minutes > 0 && minutes <= 30)) {
      return "Standard";
    }
    return "Warm-up";
  }

  formatAnswer(value: unknown): string {
    if (value === null || value === undefined) {
      return "-";
    }
    if (typeof value === "string") {
      const formatted = this.optionDisplay(value).trim();
      return formatted || "-";
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.formatAnswer(item)).join(", ");
    }
    if (typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 0) {
        return "-";
      }
      return entries
        .map(([key, item]) => `${key} -> ${this.formatAnswer(item)}`)
        .join("; ");
    }
    return String(value);
  }

  private parseOptionContainer(value: unknown): unknown {
    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();
    if (!this.looksLikeJson(trimmed)) {
      return value;
    }
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  private parseDisplayValue(value: unknown): unknown {
    let current = value;
    for (let depth = 0; depth < 3; depth++) {
      if (typeof current !== "string") {
        return current;
      }
      const trimmed = current.trim();
      if (!this.looksLikeJson(trimmed)) {
        return current;
      }
      try {
        current = JSON.parse(trimmed);
      } catch {
        return current;
      }
    }
    return current;
  }

  private optionValue(value: unknown): string {
    if (value === null || value === undefined) {
      return "";
    }
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      const text = record["text"] ?? record["value"] ?? record["label"];
      if (text !== null && text !== undefined && typeof text !== "object") {
        return String(text);
      }
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  }

  private formatDisplayValue(value: unknown): string {
    if (value === null || value === undefined) {
      return "";
    }
    if (typeof value === "string") {
      return value.trim();
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.formatDisplayValue(this.parseDisplayValue(item))).filter(Boolean).join(", ");
    }
    if (typeof value === "object") {
      return Object.entries(value as Record<string, unknown>)
        .map(([key, item]) => `${key} -> ${this.formatDisplayValue(this.parseDisplayValue(item))}`)
        .join("\n");
    }
    return String(value);
  }

  private looksLikeJson(value: string): boolean {
    return (value.startsWith("{") && value.endsWith("}")) || (value.startsWith("[") && value.endsWith("]"));
  }

  blockedStateLabel(attempt: any): string {
    return attempt?.submittedAt ? "Finished" : "Pending";
  }

  blockedSubmittedLabel(attempt: any): string {
    if (!attempt?.submittedAt) {
      return "-";
    }
    const date = new Date(attempt.submittedAt);
    if (Number.isNaN(date.getTime())) {
      return String(attempt.submittedAt);
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

  attemptMarksLabel(attempt: any): string {
    const score = Number(attempt?.score);
    const maxScore = Number(attempt?.maxScore);
    if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) {
      return "-";
    }
    const marks = (score / 100) * maxScore;
    return `${marks.toFixed(2)} / ${maxScore.toFixed(2)}`;
  }

  attemptGrade10Label(attempt: any): string {
    const score = Number(attempt?.score);
    if (!Number.isFinite(score)) {
      return "-";
    }
    return `${(score / 10).toFixed(2)} / 10.00`;
  }

  finalGrade10Label(): string {
    const latest = this.blockedSummary?.attempts?.[0];
    if (!latest) {
      return "-";
    }
    return this.attemptGrade10Label(latest);
  }

  bestBlockedAttempt(): any {
    const attempts = Array.isArray(this.blockedSummary?.attempts) ? this.blockedSummary.attempts : [];
    return attempts.reduce((best: any, attempt: any) => {
      if (!best) {
        return attempt;
      }
      return Number(attempt?.score ?? 0) > Number(best?.score ?? 0) ? attempt : best;
    }, null);
  }

  bestBlockedGrade10Label(): string {
    const best = this.bestBlockedAttempt();
    return best ? this.attemptGrade10Label(best) : "-";
  }

  blockedAttemptProgressPercent(): number {
    const allowed = Number(this.blockedSummary?.attemptsAllowed ?? 0);
    const used = Number(this.blockedSummary?.attemptsUsed ?? this.blockedSummary?.attempts?.length ?? 0);
    if (!Number.isFinite(allowed) || allowed <= 0) {
      return used > 0 ? 100 : 0;
    }
    return Math.max(0, Math.min(100, Math.round((used / allowed) * 100)));
  }

  blockedAttemptUsageLabel(): string {
    const allowed = Number(this.blockedSummary?.attemptsAllowed ?? 0);
    const used = Number(this.blockedSummary?.attemptsUsed ?? this.blockedSummary?.attempts?.length ?? 0);
    return allowed > 0 ? `${used} / ${allowed} used` : `${used} used`;
  }

  blockedScorePercent(attempt: any): number {
    const score = Number(attempt?.score ?? 0);
    return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
  }

  blockedAttemptStatusClass(attempt: any): string {
    if (attempt?.passed) {
      return "pass";
    }
    return "fail";
  }

  blockedCoachMessage(): string {
    const bestScore = this.blockedScorePercent(this.bestBlockedAttempt());
    if (bestScore >= 80) {
      return "Strong attempt recorded. Use history to review explanations before the next lesson.";
    }
    if (bestScore >= 50) {
      return "You are close. Review weak topics in history and revisit the related lesson material.";
    }
    return "Start with the answer review, note the misunderstood concept, then ask your lecturer for targeted support.";
  }

  blockedSummaryMessage(): string {
    const totalAllowed = Number(this.blockedSummary?.attemptsAllowed ?? 0);
    const used = Number(this.blockedSummary?.attemptsUsed ?? 0);
    if (totalAllowed > 0 && used >= totalAllowed) {
      return "No more attempts are allowed.";
    }
    return this.blockedSummary?.message ?? "Quiz is not available right now.";
  }

  requestReset(): void {
    const courseId = Number(this.blockedSummary?.courseId ?? this.courseId ?? 0);
    if (!courseId || this.resetRequesting) {
      return;
    }
    this.resetRequesting = true;
    this.resetRequestMessage = "";
    this.resetRequestError = "";
    this.studentService.requestCourseReset(courseId).subscribe({
      next: () => {
        this.resetRequestMessage = "Reset request sent to your lecturer.";
        this.resetRequesting = false;
      },
      error: (error) => {
        this.resetRequestError = error?.error?.message ?? "Unable to send reset request";
        this.resetRequesting = false;
      }
    });
  }

  private beginTimer(): void {
    this.clearTimer();
    if (this.remainingSeconds <= 0) {
      return;
    }
    this.countdownRef = setInterval(() => {
      this.remainingSeconds--;
      if (this.remainingSeconds <= 0) {
        this.remainingSeconds = 0;
        this.submitQuiz(true);
        this.clearTimer();
      }
    }, 1000);
  }

  private clearTimer(): void {
    if (this.countdownRef) {
      clearInterval(this.countdownRef);
      this.countdownRef = null;
    }
  }

  persistAnswers(): void {
    if (!this.quizData?.attemptId) {
      return;
    }
    localStorage.setItem(this.storageKey(this.quizData.attemptId), JSON.stringify({
      answers: this.answers,
      confidence: this.confidence,
      reflection: this.reflection
    }));
  }

  private loadSavedAnswers(): void {
    if (!this.quizData?.attemptId) {
      return;
    }
    const raw = localStorage.getItem(this.storageKey(this.quizData.attemptId));
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.answers) {
        this.answers = parsed.answers;
        this.confidence = parsed.confidence ?? {};
        this.reflection = parsed.reflection ?? "";
      } else {
        this.answers = parsed;
      }
    } catch {
      this.answers = {};
    }
  }

  private markQuestionSeen(questionId: number | undefined): void {
    if (!questionId) {
      return;
    }
    const key = String(questionId);
    if (!this.questionSeenAt[key]) {
      this.questionSeenAt[key] = Date.now();
    }
  }

  private recordCurrentQuestionTime(): void {
    if (this.currentQuestion?.questionId) {
      this.recordQuestionTime(this.currentQuestion.questionId);
    }
  }

  private recordQuestionTime(questionId: number): void {
    const key = String(questionId);
    const seenAt = this.questionSeenAt[key];
    if (!seenAt) {
      return;
    }
    const seconds = Math.max(1, Math.round((Date.now() - seenAt) / 1000));
    this.timeSpentSeconds[key] = Math.max(Number(this.timeSpentSeconds[key] ?? 0), seconds);
  }

  private recordAllQuestionTimes(): void {
    for (const question of this.quizData?.questions ?? []) {
      if (this.isQuestionAnswered(this.quizData.questions.indexOf(question))) {
        this.recordQuestionTime(question.questionId);
      }
    }
  }

  private clearSavedAnswers(): void {
    if (!this.quizData?.attemptId) {
      return;
    }
    localStorage.removeItem(this.storageKey(this.quizData.attemptId));
  }

  private storageKey(attemptId: number): string {
    return `edusim-attempt-${attemptId}`;
  }

  private loadBlockedSummary(quizId: number, backendMessage: string): void {
    this.studentService.dashboard().subscribe({
      next: (dashboard) => {
        const quizMeta = (dashboard?.availableQuizzes ?? []).find(
          (quiz: any) => Number(quiz?.quizId ?? 0) === Number(quizId)
        );
        this.loadBlockedAttempts(quizId, backendMessage, quizMeta);
      },
      error: () => {
        this.loadBlockedAttempts(quizId, backendMessage, null);
      }
    });
  }

  private loadQuizPreview(quizId: number): void {
    this.quizId = quizId;
    this.loading = true;
    this.errorMessage = "";
    this.result = null;
    this.quizData = null;
    this.blockedSummary = null;
    this.quizPreview = null;
    this.startingQuiz = false;

    this.studentService.dashboard().subscribe({
      next: (dashboard) => {
        const availableQuizzes = Array.isArray(dashboard?.availableQuizzes) ? dashboard.availableQuizzes : [];
        const found = availableQuizzes.find((quiz: any) => Number(quiz?.quizId ?? 0) === quizId);
        const preview = {
          quizId,
          title: String(found?.title ?? "Quiz"),
          description: String(found?.description ?? "").trim(),
          attemptsUsed: Number(found?.attemptsUsed ?? 0),
          maxAttempts: Number.isFinite(Number(found?.maxAttempts)) ? Number(found?.maxAttempts) : null,
          attemptsRemaining: Number.isFinite(Number(found?.attemptsRemaining)) ? Number(found?.attemptsRemaining) : null,
          timeLimitMinutes: Number.isFinite(Number(found?.timeLimitMinutes)) ? Number(found?.timeLimitMinutes) : null,
          passingMark: Number.isFinite(Number(found?.passingMark)) ? Number(found?.passingMark) : null,
          closeAt: found?.closeAt ?? null,
          courseTitle: String(found?.courseTitle ?? "").trim(),
          courseId: Number.isFinite(Number(found?.courseId)) ? Number(found?.courseId) : this.courseId,
          locked: Boolean(found?.locked),
          hasOpenAttempt: Boolean(found?.hasOpenAttempt),
          lockReason: String(found?.lockReason ?? "").trim()
        };
        this.quizPreview = preview;
        if (preview.hasOpenAttempt) {
          this.startQuiz(quizId);
          return;
        }
        this.loading = false;
      },
      error: () => {
        this.quizPreview = {
          quizId,
          title: "Quiz",
          description: "",
          attemptsUsed: 0,
          maxAttempts: null,
          attemptsRemaining: null,
          timeLimitMinutes: null,
          passingMark: null,
          closeAt: null,
          courseTitle: "",
          courseId: this.courseId,
          locked: false,
          lockReason: ""
        };
        this.loading = false;
      }
    });
  }

  private loadBlockedAttempts(quizId: number, backendMessage: string, quizMeta: any): void {
    this.studentService.attempts().subscribe({
      next: (rows) => {
        const attempts = [...(rows ?? [])]
          .filter((row: any) => Number(row?.quizId ?? 0) === Number(quizId))
          .sort((a: any, b: any) => {
            const aTime = new Date(a?.submittedAt ?? 0).getTime();
            const bTime = new Date(b?.submittedAt ?? 0).getTime();
            return bTime - aTime;
          });

        this.blockedSummary = {
          quizId,
          courseId: Number(quizMeta?.courseId ?? this.courseId ?? 0),
          title: String(quizMeta?.title ?? attempts[0]?.quizTitle ?? "Quiz"),
          message: backendMessage || "Quiz is not available right now.",
          attemptsAllowed: Number(quizMeta?.maxAttempts ?? attempts.length),
          attemptsUsed: attempts.length,
          timeLimitMinutes: quizMeta?.timeLimitMinutes ?? null,
          closeAt: quizMeta?.closeAt ?? null,
          attempts
        };
        this.errorMessage = "";
        this.loading = false;
      },
      error: () => {
        this.blockedSummary = {
          quizId,
          courseId: Number(quizMeta?.courseId ?? this.courseId ?? 0),
          title: String(quizMeta?.title ?? "Quiz"),
          message: backendMessage || "Quiz is not available right now.",
          attemptsAllowed: Number(quizMeta?.maxAttempts ?? 0),
          attemptsUsed: 0,
          timeLimitMinutes: quizMeta?.timeLimitMinutes ?? null,
          closeAt: quizMeta?.closeAt ?? null,
          attempts: []
        };
        this.errorMessage = "";
        this.loading = false;
      }
    });
  }
}
