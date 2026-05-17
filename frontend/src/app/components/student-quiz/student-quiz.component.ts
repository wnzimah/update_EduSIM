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
  loading = true;
  errorMessage = "";
  statusMessage = "";
  currentIndex = 0;
  remainingSeconds = 0;
  answers: Record<string, unknown> = {};
  result: any = null;
  submitting = false;
  courseId: number | null = null;

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
      this.startQuiz(quizId);
    });
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  startQuiz(quizId: number): void {
    this.loading = true;
    this.errorMessage = "";
    this.result = null;
    this.statusMessage = "";
    this.answers = {};
    this.currentIndex = 0;
    this.studentService.startQuiz(quizId).subscribe({
      next: (data) => {
        const questions = Array.isArray(data?.questions) ? data.questions : [];
        if (questions.length === 0) {
          this.quizData = null;
          this.errorMessage = "This quiz has no questions yet. Please contact your lecturer.";
          this.loading = false;
          return;
        }
        this.quizData = { ...data, questions };
        this.loadSavedAnswers();
        this.remainingSeconds = Number(data?.timeLimitMinutes ?? 0) * 60;
        this.beginTimer();
        this.loading = false;
      },
      error: (error) => {
        const backendMessage = String(error?.error?.message ?? "");
        if (backendMessage.toLowerCase().includes("already answered")) {
          this.errorMessage = "Your quiz is already answered.";
        } else if (backendMessage.toLowerCase().includes("maximum attempts")) {
          this.errorMessage = "Your quiz is already answered (maximum attempts reached).";
        } else if (backendMessage.toLowerCase().includes("no questions")) {
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
      this.currentIndex--;
    }
  }

  nextQuestion(): void {
    if (this.currentIndex < this.quizData.questions.length - 1) {
      this.currentIndex++;
    }
  }

  goToQuestion(index: number): void {
    if (!this.quizData?.questions || index < 0 || index >= this.quizData.questions.length) {
      return;
    }
    this.currentIndex = index;
  }

  updateAnswer(questionId: number, value: unknown): void {
    this.answers[String(questionId)] = value;
    this.persistAnswers();
  }

  toggleMulti(questionId: number, option: string, checked: boolean): void {
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
    this.persistAnswers();
  }

  updateMatching(questionId: number, left: string, selected: string): void {
    const key = String(questionId);
    const current = (this.answers[key] as Record<string, string> | undefined) ?? {};
    this.answers[key] = { ...current, [left]: selected };
    this.persistAnswers();
  }

  submitQuiz(force = false): void {
    if (!this.quizData || this.submitting || this.result) {
      return;
    }
    if (!force) {
      const total = Array.isArray(this.quizData?.questions) ? this.quizData.questions.length : 0;
      const unanswered = Math.max(0, total - this.answeredCount());
      const confirmMessage = unanswered > 0
        ? `Are you sure to submit? You still have ${unanswered} unanswered question(s).`
        : "Are you sure to submit?";
      if (!confirm(confirmMessage)) {
        return;
      }
    }
    this.errorMessage = "";
    this.submitting = true;
    this.studentService.submitQuiz(this.quizData.quizId, {
      attemptId: this.quizData.attemptId,
      answers: this.answers
    }).subscribe({
      next: (data) => {
        this.result = data;
        this.statusMessage = "Your quiz has been answered successfully.";
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

  optionsArray(question: any): string[] {
    if (!question?.options) {
      return [];
    }
    if (Array.isArray(question.options)) {
      return question.options;
    }
    return [];
  }

  matchingLeft(question: any): string[] {
    const options = question?.options;
    if (!options || typeof options !== "object") {
      return [];
    }
    return Array.isArray(options.left) ? options.left : [];
  }

  matchingRight(question: any): string[] {
    const options = question?.options;
    if (!options || typeof options !== "object") {
      return [];
    }
    return Array.isArray(options.right) ? options.right : [];
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

  timeLabel(): string {
    const min = Math.floor(this.remainingSeconds / 60).toString().padStart(2, "0");
    const sec = Math.floor(this.remainingSeconds % 60).toString().padStart(2, "0");
    return `${min}:${sec}`;
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

  isCurrentLastQuestion(): boolean {
    return this.quizData?.questions ? this.currentIndex === this.quizData.questions.length - 1 : false;
  }

  allQuestions(): any[] {
    return this.quizData?.questions ?? [];
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

  private beginTimer(): void {
    this.clearTimer();
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

  private persistAnswers(): void {
    if (!this.quizData?.attemptId) {
      return;
    }
    localStorage.setItem(this.storageKey(this.quizData.attemptId), JSON.stringify(this.answers));
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
      this.answers = JSON.parse(raw);
    } catch {
      this.answers = {};
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
}
