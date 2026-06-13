import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { StudentService } from "../../services/student.service";

type AttemptPageMode = "feedback" | "recommendation" | "improvement";

@Component({
  selector: "app-student-attempt-insight",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./student-attempt-insight.component.html",
  styleUrl: "./student-attempt-insight.component.css"
})
export class StudentAttemptInsightComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly studentService = inject(StudentService);

  result: any = null;
  loading = true;
  errorMessage = "";
  mode: AttemptPageMode = "feedback";
  currentQuestionIndex = 0;

  ngOnInit(): void {
    this.mode = (this.route.snapshot.data["mode"] as AttemptPageMode) || "feedback";
    const attemptId = Number(this.route.snapshot.paramMap.get("attemptId"));
    if (!attemptId) {
      this.errorMessage = "Attempt not found.";
      this.loading = false;
      return;
    }
    this.studentService.attemptResult(attemptId).subscribe({
      next: (data) => {
        this.result = data;
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? "Unable to load attempt details";
        this.loading = false;
      }
    });
  }

  pageTitle(): string {
    if (this.mode === "recommendation") {
      return "Learning Recommendation";
    }
    if (this.mode === "improvement") {
      return "Performance Improvement";
    }
    return "Detailed Feedback";
  }

  pageKicker(): string {
    if (this.mode === "recommendation") {
      return "Recommended for you";
    }
    if (this.mode === "improvement") {
      return "Progress plan";
    }
    return "Question by question";
  }

  summary(): any {
    return this.result?.summary ?? {};
  }

  attemptId(): number {
    return Number(this.summary()?.attemptId ?? 0);
  }

  isReleased(): boolean {
    return this.result?.resultReleased !== false && this.summary()?.resultReleased !== false;
  }

  feedbackSettings(): any {
    return this.result?.feedbackSettings ?? this.summary()?.feedbackSettings ?? {};
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
    return this.answers().length > 0;
  }

  answers(): any[] {
    return Array.isArray(this.result?.answers) ? this.result.answers : [];
  }

  currentAnswer(): any | null {
    const rows = this.answers();
    if (rows.length === 0) {
      return null;
    }
    const index = Math.max(0, Math.min(this.currentQuestionIndex, rows.length - 1));
    return rows[index] ?? null;
  }

  selectQuestion(index: number): void {
    const rows = this.answers();
    if (rows.length === 0) {
      this.currentQuestionIndex = 0;
      return;
    }
    this.currentQuestionIndex = Math.max(0, Math.min(index, rows.length - 1));
  }

  previousQuestion(): void {
    this.selectQuestion(this.currentQuestionIndex - 1);
  }

  nextQuestion(): void {
    this.selectQuestion(this.currentQuestionIndex + 1);
  }

  currentQuestionLabel(): string {
    const total = this.answers().length || this.summary()?.questionCount || 0;
    return `Question ${this.currentQuestionIndex + 1} of ${total}`;
  }

  recommendations(): any[] {
    const rows = this.summary()?.recommendations;
    return Array.isArray(rows) ? rows : [];
  }

  masteryRows(): any[] {
    const rows = this.summary()?.mastery;
    return Array.isArray(rows) ? rows : [];
  }

  retakeQuestions(): any[] {
    const rows = this.summary()?.retakePlan?.questions;
    return Array.isArray(rows) ? rows : [];
  }

  releaseMessage(): string {
    if (this.isReleased()) {
      return "";
    }
    return this.result?.resultNote
      ?? "Quiz review is currently unavailable. Please wait for lecturer release.";
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

  answerFeedbackDetail(answer: any): string {
    const feedback = String(answer?.feedbackDetail ?? answer?.explanation ?? "").trim();
    if (feedback && feedback !== "-") {
      return feedback;
    }
    if (answer?.correct) {
      return "Your answer matches the expected concept.";
    }
    return `Review ${this.answerRelatedConcept(answer)} before your next attempt.`;
  }

  answerRelatedConcept(answer: any): string {
    const topic = String(answer?.topicTag ?? "General").trim() || "General";
    const concept = String(answer?.learningConcept ?? topic).trim() || topic;
    return concept.toLowerCase() === topic.toLowerCase() ? topic : `${topic} -> ${concept}`;
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
      return "Watch";
    }
    if (type.includes("PDF") || type.includes("NOTE")) {
      return "View";
    }
    if (type.includes("QUIZ")) {
      return "Start Quiz";
    }
    return "Open";
  }

  scoreLabel(): string {
    const score = this.summary()?.score;
    if (!this.isReleased() || !this.canShowScoreFeedback() || score === null || score === undefined) {
      return "Pending";
    }
    return `${score}%`;
  }

  scoreNumber(): number {
    const score = Number(this.summary()?.score ?? 0);
    return Number.isFinite(score) ? Math.round(score) : 0;
  }

  completedOnLabel(): string {
    return this.summary()?.submittedAt ?? "";
  }

  completionStatusLabel(): string {
    if (!this.isReleased()) {
      return "Pending";
    }
    if (!this.canShowScoreFeedback() || this.summary()?.passed === null || this.summary()?.passed === undefined) {
      return "Completed";
    }
    return this.summary().passed ? "Completed" : "Review";
  }

  correctAnswerCount(): number {
    return this.answers().filter((answer) => answer?.correct === true).length;
  }

  wrongAnswerCount(): number {
    return this.answers().filter((answer) => answer?.correct === false).length;
  }

  feedbackPreviewAnswers(): any[] {
    return this.answers().slice(0, 6);
  }

  primaryRecommendation(): any | null {
    return this.recommendations()[0] ?? null;
  }

  primaryWeakTopic(): any {
    const recommendation = this.primaryRecommendation();
    const topic = recommendation?.weakTopic || recommendation?.topicTag || this.masteryRows()[0]?.topicTag || "Weak Topic";
    const mastery = this.masteryRows().find((item) => String(item?.topicTag) === String(topic)) ?? this.masteryRows()[0];
    return {
      topic,
      mastery: mastery?.score ?? recommendation?.mastery ?? null
    };
  }

  primaryRecommendationMaterials(): any[] {
    const recommendation = this.primaryRecommendation();
    const materials = recommendation ? this.recommendationMaterials(recommendation) : [];
    if (materials.length > 0) {
      return materials.slice(0, 3);
    }
    const topic = this.primaryWeakTopic().topic || "this topic";
    return [
      { type: "VIDEO", title: `Watch: ${topic} Basics Video`, description: "Duration: 12:45", resourceUrl: "" },
      { type: "NOTES", title: `Read: ${topic} Notes`, description: "Revision notes", resourceUrl: "" },
      { type: "QUIZ", title: `Practice: ${topic} Practice Quiz`, description: "10 Questions", resourceUrl: "" }
    ];
  }

  materialIconLabel(material: any): string {
    const type = String(material?.type ?? material?.materialType ?? "").toUpperCase();
    if (type.includes("VIDEO")) {
      return "V";
    }
    if (type.includes("QUIZ") || type.includes("PRACTICE")) {
      return "Q";
    }
    return "N";
  }

  flowStepNumber(): number {
    if (this.mode === "recommendation") {
      return 2;
    }
    return 1;
  }

  previousFlowRoute(): any[] {
    if (this.mode === "recommendation") {
      return ["/student/attempts", this.attemptId(), "feedback"];
    }
    return ["/student/history"];
  }

  previousFlowLabel(): string {
    if (this.mode === "recommendation") {
      return "Result";
    }
    return "Attempt History";
  }

  nextFlowRoute(): any[] {
    if (this.mode === "feedback") {
      return ["/student/attempts", this.attemptId(), "recommendation"];
    }
    return ["/student/history"];
  }

  nextFlowLabel(): string {
    if (this.mode === "feedback") {
      return "Learning Recommendation";
    }
    return "Attempt History";
  }

  timeAnalysis(): any {
    return this.summary()?.timeAnalysis ?? {};
  }

  confidenceSummary(): any {
    return this.summary()?.confidenceSummary ?? {};
  }

  improvementLead(): string {
    if (!this.isReleased()) {
      return this.releaseMessage();
    }
    const score = Number(this.summary()?.score ?? 0);
    if (this.canShowScoreFeedback() && Number.isFinite(score) && score >= 85) {
      return "Strong performance. Keep the momentum with a harder practice activity.";
    }
    if (this.canShowScoreFeedback() && Number.isFinite(score) && score >= 60) {
      return "Good base. Focus on weak concepts and timing before the next attempt.";
    }
    return "Start with the weakest topic, review the recommended material, then retry similar questions.";
  }
}
