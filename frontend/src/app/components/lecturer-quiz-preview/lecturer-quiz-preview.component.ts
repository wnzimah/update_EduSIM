import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { LecturerService } from "../../services/lecturer.service";

type PreviewQuestion = {
  questionId: number;
  sortOrder: number;
  questionType: string;
  prompt: string;
  explanation?: string;
  mediaUrl?: string;
  mediaType?: string;
  options?: unknown;
  correctAnswer?: unknown;
  points?: number;
};

type PreviewQuiz = {
  quizId: number;
  title: string;
  description?: string;
  courseId?: number;
  courseTitle?: string;
  timeLimitMinutes?: number;
  maxAttempts?: number;
  passingMark?: number;
  openAt?: string;
  closeAt?: string;
  resultReleaseAt?: string;
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
  questionDisplayMode?: string;
  showResultImmediately?: boolean;
  feedbackSettings?: Record<string, unknown>;
  published?: boolean;
};

@Component({
  selector: "app-lecturer-quiz-preview",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./lecturer-quiz-preview.component.html",
  styleUrl: "./lecturer-quiz-preview.component.css"
})
export class LecturerQuizPreviewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly lecturerService = inject(LecturerService);

  quiz: PreviewQuiz | null = null;
  questions: PreviewQuestion[] = [];
  loading = true;
  errorMessage = "";

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const quizId = Number(params.get("quizId"));
      if (!Number.isFinite(quizId) || quizId <= 0) {
        this.router.navigateByUrl("/lecturer/quiz-overview");
        return;
      }
      this.loadPreview(quizId);
    });
  }

  loadPreview(quizId: number): void {
    this.loading = true;
    this.errorMessage = "";
    this.lecturerService.previewQuiz(quizId).subscribe({
      next: (data) => {
        this.quiz = data?.quiz ?? null;
        this.questions = Array.isArray(data?.questions) ? data.questions : [];
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? "Failed to load quiz preview.";
        this.loading = false;
      }
    });
  }

  totalPoints(): number {
    return this.questions.reduce((sum, question) => sum + Number(question.points ?? 0), 0);
  }

  quizStatusLabel(): string {
    return this.quiz?.published ? "Published" : "Draft";
  }

  resultReleaseLabel(): string {
    if (this.quiz?.showResultImmediately) {
      return "Immediate after submission";
    }
    return this.quiz?.resultReleaseAt ? "Scheduled release" : "Manual or not scheduled";
  }

  displayModeLabel(): string {
    const mode = String(this.quiz?.questionDisplayMode ?? "");
    if (mode === "ALL_AT_ONCE") {
      return "All questions on one page";
    }
    if (mode === "ONE_BY_ONE") {
      return "One question at a time";
    }
    return mode || "Not set";
  }

  questionTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      MCQ: "Multiple Choice",
      MULTI_SELECT: "Multi-Select",
      TRUE_FALSE: "True / False",
      SHORT_ANSWER: "Short Answer",
      MATCHING: "Matching"
    };
    return labels[type] ?? type;
  }

  typeBreakdown(): Array<{ type: string; label: string; count: number }> {
    const counts = new Map<string, number>();
    for (const question of this.questions) {
      counts.set(question.questionType, (counts.get(question.questionType) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([type, count]) => ({ type, label: this.questionTypeLabel(type), count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  answerOptions(question: PreviewQuestion): string[] {
    return Array.isArray(question.options) ? question.options.map((item) => String(item)) : [];
  }

  matchingPrompts(question: PreviewQuestion): string[] {
    const options = this.objectValue(question.options);
    const left = options?.["left"];
    return Array.isArray(left) ? left.map((item) => String(item)) : [];
  }

  matchingResponses(question: PreviewQuestion): string[] {
    const options = this.objectValue(question.options);
    const right = options?.["right"];
    return Array.isArray(right) ? right.map((item) => String(item)) : [];
  }

  matchingAnswerFor(question: PreviewQuestion, prompt: string): string {
    const answer = this.objectValue(question.correctAnswer);
    const value = answer?.[prompt];
    return value == null ? "Not set" : String(value);
  }

  matchingScoringLabel(question: PreviewQuestion): string {
    const options = this.objectValue(question.options);
    return String(options?.["scoringType"] ?? "EXACT") === "PARTIAL" ? "Partial marks" : "Exact match";
  }

  duplicateResponseLabel(question: PreviewQuestion): string {
    const options = this.objectValue(question.options);
    return Boolean(options?.["allowDuplicateResponse"]) ? "Duplicates allowed" : "Unique response expected";
  }

  correctAnswerValues(question: PreviewQuestion): string[] {
    if (Array.isArray(question.correctAnswer)) {
      return question.correctAnswer.map((item) => String(item));
    }
    if (question.correctAnswer == null || typeof question.correctAnswer === "object") {
      return [];
    }
    return [String(question.correctAnswer)];
  }

  keywords(question: PreviewQuestion): string[] {
    const options = this.objectValue(question.options);
    const keywords = options?.["keywords"];
    return Array.isArray(keywords) ? keywords.map((item) => String(item)) : [];
  }

  isCorrectOption(question: PreviewQuestion, option: string): boolean {
    return this.correctAnswerValues(question).includes(option);
  }

  feedbackItems(): Array<{ label: string; enabled: boolean }> {
    const settings = this.quiz?.feedbackSettings ?? {};
    const labels: Record<string, string> = {
      showScoreAfterSubmission: "Show score after submission",
      showCorrectAnswer: "Show correct answer",
      showExplanation: "Show explanation",
      showRelatedConcept: "Show related concept",
      showLearningRecommendation: "Show learning recommendation",
      showStudentAnswerReview: "Student answer review"
    };
    return Object.entries(labels).map(([key, label]) => ({
      label,
      enabled: Boolean(settings[key])
    }));
  }

  backQueryParams(): Record<string, number> | null {
    return this.quiz?.courseId ? { courseId: this.quiz.courseId } : null;
  }

  private objectValue(value: unknown): Record<string, unknown> | null {
    return value != null && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  }
}
