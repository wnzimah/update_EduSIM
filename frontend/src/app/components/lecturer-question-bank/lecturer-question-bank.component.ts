import { CommonModule } from "@angular/common";
import { Component, ElementRef, HostListener, OnInit, ViewChild, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { LecturerService } from "../../services/lecturer.service";

type QuestionType = "MCQ" | "TRUE_FALSE" | "MULTI_SELECT" | "SHORT_ANSWER" | "MATCHING";
type MatchingScoringType = "EXACT" | "PARTIAL";
type DifficultyLevel = "EASY" | "MEDIUM" | "HARD";
type MediaType = "" | "IMAGE" | "AUDIO" | "VIDEO";
type QuestionTextMode = "TEXT_ONLY" | "TEXT_WITH_META" | "HIDDEN";
type EditorTool = "BOLD" | "ITALIC" | "HEADING" | "QUOTE" | "LINK" | "IMAGE" | "BULLET_LIST" | "NUMBER_LIST";
type SettingsSection = "general" | "timing" | "grade";

type QuestionTypeOption = {
  value: QuestionType;
  label: string;
  menuLabel: string;
};

@Component({
  selector: "app-lecturer-question-bank",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: "./lecturer-question-bank.component.html",
  styleUrl: "./lecturer-question-bank.component.css"
})
export class LecturerQuestionBankComponent implements OnInit {
  private readonly lecturerService = inject(LecturerService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  @ViewChild("createWrap") private createWrapRef?: ElementRef<HTMLElement>;

  courses: any[] = [];
  questionBank: any[] = [];
  quizzes: any[] = [];

  selectedCourseId: number | null = null;
  selectedQuestionIds: number[] = [];
  editingQuestionId: number | null = null;

  statusMessage = "";
  errorMessage = "";
  quizListError = "";
  showSuccessPopup = false;
  successPopupMessage = "";

  showTypeMenu = false;
  showCreateModal = false;
  showLibraryModal = false;
  showPreviewModal = false;
  previewData: any = null;
  previewLoading = false;
  librarySearch = "";
  savingQuestion = false;
  savingQuiz = false;
  bulkSelectionMode = false;
  pageMode: "quiz" | "settings" | "questions" | "results" | "bank" = "questions";
  settingsSectionState: Record<SettingsSection, boolean> = {
    general: true,
    timing: false,
    grade: false
  };
  private requestedCourseId: number | null = null;
  private requestedQuizId: number | null = null;
  private requestedMode = "";
  private requestedSource = "";
  private successPopupTimer: ReturnType<typeof setTimeout> | null = null;

  readonly difficultyLevels: Array<{ value: DifficultyLevel; label: string }> = [
    { value: "EASY", label: "Easy" },
    { value: "MEDIUM", label: "Medium" },
    { value: "HARD", label: "Hard" }
  ];

  readonly mediaTypes: Array<{ value: MediaType; label: string }> = [
    { value: "", label: "No media" },
    { value: "IMAGE", label: "Image" },
    { value: "AUDIO", label: "Audio" },
    { value: "VIDEO", label: "Video" }
  ];

  questionFilters = {
    topicTag: "",
    difficultyLevel: "",
    questionType: "",
    createdFrom: "",
    createdTo: "",
    search: ""
  };

  questionBankView = {
    category: "ALL",
    tagFilter: "",
    showQuestionTextMode: "TEXT_ONLY" as QuestionTextMode,
    includeSubcategories: true,
    includeOldQuestions: true
  };

  readonly questionTextModes: Array<{ value: QuestionTextMode; label: string }> = [
    { value: "TEXT_ONLY", label: "Yes, text only" },
    { value: "TEXT_WITH_META", label: "Yes, text and details" },
    { value: "HIDDEN", label: "No, ID only" }
  ];

  readonly questionTypes: QuestionTypeOption[] = [
    { value: "MCQ", label: "Multiple Choice", menuLabel: "Multiple Choice" },
    { value: "TRUE_FALSE", label: "True / False", menuLabel: "True or False" },
    { value: "SHORT_ANSWER", label: "Short Answer", menuLabel: "Short Answer" },
    { value: "MULTI_SELECT", label: "Multi-Select", menuLabel: "Multi-Select" },
    { value: "MATCHING", label: "Matching", menuLabel: "Matching" }
  ];

  readonly createQuestionTypeCards: Array<{ value: QuestionType; shortLabel: string; icon: string }> = [
    { value: "MCQ", shortLabel: "MCQ", icon: "◉" },
    { value: "MULTI_SELECT", shortLabel: "MSQ", icon: "✓" },
    { value: "TRUE_FALSE", shortLabel: "True/False", icon: "⊘" },
    { value: "SHORT_ANSWER", shortLabel: "short answer", icon: "✎" },
    { value: "MATCHING", shortLabel: "Matching", icon: "</>" }
  ];

  readonly questionTypeCardsUi: Array<{ value: QuestionType; shortLabel: string; icon: string }> = [
    { value: "MCQ", shortLabel: "MCQ", icon: "◉" },
    { value: "MULTI_SELECT", shortLabel: "MSQ", icon: "✓" },
    { value: "TRUE_FALSE", shortLabel: "True/False", icon: "TF" },
    { value: "SHORT_ANSWER", shortLabel: "short answer", icon: "✎" },
    { value: "MATCHING", shortLabel: "Matching", icon: "</>" }
  ];

  questionForm = this.defaultQuestionForm();

  quizForm = {
    title: "",
    description: "This quiz covers key topics from the lesson.",
    gradeOut: 20,
    openDate: this.defaultOpenDate(),
    openTime: "08:00",
    closeDate: this.defaultDueDate(),
    closeTime: "23:59",
    resultReleaseDate: this.defaultDueDate(),
    resultReleaseTime: "23:59",
    timeLimitMinutes: 120,
    maxAttempts: 1,
    passingMark: 50,
    published: true,
    unlockAfterVideos: true,
    shuffleQuestions: true,
    shuffleAnswers: true,
    questionDisplayMode: "ONE_BY_ONE",
    showResultImmediately: true,
    autoSelectCount: 10
  };

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      const mode = String(data["mode"] ?? "").trim().toLowerCase();
      if (mode === "bank") {
        this.pageMode = "bank";
      } else if (mode === "settings") {
        this.pageMode = "settings";
      } else if (mode === "results") {
        this.pageMode = "results";
      } else if (mode === "quiz") {
        this.pageMode = "quiz";
      } else {
        this.pageMode = "questions";
      }
    });

    this.route.queryParamMap.subscribe((params) => {
      const rawCourseId = Number(params.get("courseId"));
      this.requestedCourseId = Number.isFinite(rawCourseId) && rawCourseId > 0 ? rawCourseId : null;

      const rawQuizId = Number(params.get("quizId"));
      this.requestedQuizId = Number.isFinite(rawQuizId) && rawQuizId > 0 ? rawQuizId : null;

      this.requestedMode = String(params.get("mode") ?? "").trim().toLowerCase();
      this.requestedSource = String(params.get("source") ?? "").trim().toLowerCase();
      this.loadCourses();
    });
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    if (!this.showTypeMenu) {
      return;
    }

    const menuHost = this.createWrapRef?.nativeElement;
    const target = event.target as Node | null;
    if (!menuHost || !target || !menuHost.contains(target)) {
      this.showTypeMenu = false;
    }
  }

  loadCourses(): void {
    this.lecturerService.courses().subscribe({
      next: (courses) => {
        this.courses = courses;
        const requested = this.requestedCourseId;
        if (requested && courses.some((course) => course.courseId === requested)) {
          this.selectedCourseId = requested;
        } else if (!this.selectedCourseId && courses.length > 0) {
          this.selectedCourseId = courses[0].courseId;
        }

        const selectedCourse = this.currentCourse();
        if (selectedCourse) {
          this.questionForm.moduleTag = selectedCourse.title;
          if (!this.questionForm.topicTag.trim()) {
            this.questionForm.topicTag = selectedCourse.title;
          }
          if (!this.quizForm.title) {
            this.quizForm.title = `${selectedCourse.title} Quiz`;
          }
        }
        const fromQuizBuilderFlow = this.isBankMode() && this.requestedSource === "quiz";
        if (!this.isBankMode() || fromQuizBuilderFlow) {
          this.restoreQuizDraftFromStorage(!fromQuizBuilderFlow);
        }
        this.applyRequestedModeMessage();
        this.loadQuestionBank();
        this.refreshQuizList();
      },
      error: (error) => this.errorMessage = this.extractApiMessage(error, "Failed to load courses")
    });
  }

  loadQuestionBank(): void {
    this.lecturerService.questionBank({
      courseId: this.selectedCourseId ?? undefined,
      topicTag: this.questionFilters.topicTag || undefined,
      difficultyLevel: this.questionFilters.difficultyLevel || undefined,
      questionType: this.questionFilters.questionType || undefined,
      createdFrom: this.questionFilters.createdFrom || undefined,
      createdTo: this.questionFilters.createdTo || undefined,
      search: this.questionFilters.search || undefined
    }).subscribe({
      next: (questions) => {
        const normalized = (questions ?? []).map((item) => this.normalizeQuestionBankItem(item));
        this.questionBank = normalized;
        const validIds = new Set(normalized.map((item) => item.questionBankId));
        this.selectedQuestionIds = this.selectedQuestionIds
          .map((id) => this.asQuestionBankId(id))
          .filter((id): id is number => id !== null && validIds.has(id));
      },
      error: (error) => this.errorMessage = this.extractApiMessage(error, "Failed to load question bank")
    });
  }

  loadQuizzes(): void {
    this.lecturerService.quizzes(this.selectedCourseId ?? undefined).subscribe({
      next: (quizzes) => {
        this.quizzes = quizzes;
        this.quizListError = "";
        if (this.requestedQuizId) {
          const found = quizzes.find((quiz) => Number(quiz.quizId) === this.requestedQuizId);
          if (found) {
            this.openQuizPreview(found.quizId);
            this.statusMessage = `Editing flow opened for quiz: ${found.title}`;
          }
          this.requestedQuizId = null;
        }
      },
      error: (error) => {
        const message = this.extractApiMessage(error, "Failed to load quizzes");
        this.quizzes = [];
        this.quizListError = message;
        if (this.requestedQuizId) {
          this.errorMessage = message;
        }
      }
    });
  }

  onCourseChange(raw: string): void {
    this.selectedCourseId = raw ? Number(raw) : null;
    this.selectedQuestionIds = [];
    const course = this.currentCourse();
    if (course) {
      this.questionForm.moduleTag = course.title;
      if (!this.questionForm.topicTag.trim()) {
        this.questionForm.topicTag = course.title;
      }
    }
    this.loadQuestionBank();
    this.refreshQuizList();
  }

  applyQuestionFilters(): void {
    this.loadQuestionBank();
  }

  resetQuestionFilters(): void {
    this.questionFilters = {
      topicTag: "",
      difficultyLevel: "",
      questionType: "",
      createdFrom: "",
      createdTo: "",
      search: ""
    };
    this.loadQuestionBank();
  }

  openTypeMenu(event: Event): void {
    event.stopPropagation();
    this.showTypeMenu = !this.showTypeMenu;
  }

  openCreateModal(type: QuestionType): void {
    this.showTypeMenu = false;
    this.editingQuestionId = null;
    this.questionForm = this.defaultQuestionForm();
    this.questionForm.questionType = type;
    const course = this.currentCourse();
    if (course) {
      this.questionForm.moduleTag = course.title;
      this.questionForm.topicTag = course.title;
    }
    this.showCreateModal = true;
  }

  openEditQuestion(item: any): void {
    this.editingQuestionId = Number(item.questionBankId);
    this.questionForm = this.defaultQuestionForm();
    this.questionForm.questionType = item.questionType as QuestionType;
    this.questionForm.difficultyLevel = (item.difficultyLevel || "MEDIUM") as DifficultyLevel;
    this.questionForm.topicTag = item.topicTag ?? "";
    this.questionForm.moduleTag = item.moduleTag ?? "";
    this.questionForm.prompt = item.prompt ?? "";
    this.questionForm.explanation = item.explanation ?? "";
    this.questionForm.mediaUrl = item.mediaUrl ?? "";
    this.questionForm.mediaType = (item.mediaType || "") as MediaType;
    this.questionForm.points = Number(item.points ?? 1);

    if (this.questionForm.questionType === "TRUE_FALSE") {
      this.questionForm.trueFalseCorrect = String(item.correctAnswer ?? "True");
    } else if (this.questionForm.questionType === "SHORT_ANSWER") {
      this.questionForm.shortAnswer = typeof item.correctAnswer === "string" ? item.correctAnswer : "";
      const keywords = Array.isArray(item.options?.keywords) ? item.options.keywords : [];
      this.questionForm.shortAnswerKeywords = keywords.join(", ");
    } else if (this.questionForm.questionType === "MATCHING") {
      const left = Array.isArray(item.options?.left) ? item.options.left : [];
      const right = Array.isArray(item.options?.right) ? item.options.right : [];
      this.questionForm.matchingPrompts = left.length ? [...left] : ["", "", "", ""];
      this.questionForm.matchingOptions = right.length ? [...right] : ["", "", "", ""];
      const map = item.correctAnswer ?? {};
      this.questionForm.matchingCorrect = this.questionForm.matchingPrompts.map((prompt: string) => map?.[prompt] ?? "");
      this.questionForm.scoringType = item.options?.scoringType === "PARTIAL" ? "PARTIAL" : "EXACT";
      this.questionForm.allowDuplicateResponse = Boolean(item.options?.allowDuplicateResponse);
    } else {
      const options = Array.isArray(item.options) ? item.options : [];
      const correctValues = new Set(
        Array.isArray(item.correctAnswer) ? item.correctAnswer : [item.correctAnswer]
      );
      this.questionForm.options = options.length
        ? options.map((text: string) => ({ text, correct: correctValues.has(text) }))
        : [{ text: "", correct: true }, { text: "", correct: false }];
    }

    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.editingQuestionId = null;
  }

  openQuestionLibrary(): void {
    this.showTypeMenu = false;
    this.persistQuizDraftToStorage();
    this.router.navigate(["/lecturer/question-bank"], {
      queryParams: {
        courseId: this.selectedCourseId ?? null,
        source: "quiz"
      }
    });
  }

  closeQuestionLibrary(): void {
    this.showLibraryModal = false;
  }

  isQuizMode(): boolean {
    return this.pageMode === "quiz";
  }

  isSettingsMode(): boolean {
    return this.pageMode === "settings";
  }

  isQuestionsMode(): boolean {
    return this.pageMode === "questions";
  }

  isResultsMode(): boolean {
    return this.pageMode === "results";
  }

  isBankMode(): boolean {
    return this.pageMode === "bank";
  }

  tabQueryParams(): Record<string, any> {
    return {
      courseId: this.selectedCourseId ?? null
    };
  }

  currentCourseTitle(): string {
    return this.currentCourse()?.title ?? "";
  }

  useSelectedInQuizDraft(): void {
    if (this.selectedQuestionIds.length === 0) {
      this.errorMessage = "Please select at least one question first.";
      this.statusMessage = "";
      return;
    }
    this.persistQuizDraftToStorage();
    this.router.navigate(["/lecturer/quiz-builder"], {
      queryParams: {
        courseId: this.selectedCourseId ?? null,
        mode: "edit"
      }
    });
  }

  openQuizPreview(quizId: number): void {
    this.previewLoading = true;
    this.showPreviewModal = true;
    this.previewData = null;
    this.lecturerService.previewQuiz(quizId).subscribe({
      next: (data) => {
        this.previewData = data;
        this.previewLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? "Failed to load quiz preview";
        this.previewLoading = false;
      }
    });
  }

  closeQuizPreview(): void {
    this.showPreviewModal = false;
    this.previewData = null;
  }

  addOption(): void {
    this.questionForm.options.push({ text: "", correct: false });
  }

  removeOption(index: number): void {
    if (this.questionForm.options.length <= 2) {
      return;
    }
    this.questionForm.options.splice(index, 1);
    if (this.questionForm.questionType === "MCQ" && !this.questionForm.options.some((option) => option.correct)) {
      this.questionForm.options[0].correct = true;
    }
  }

  setSingleCorrect(index: number): void {
    this.questionForm.options = this.questionForm.options.map((option, i) => ({
      ...option,
      correct: i === index
    }));
  }

  setMultiCorrect(index: number, checked: boolean): void {
    this.questionForm.options[index].correct = checked;
  }

  addMatchingPrompt(): void {
    this.questionForm.matchingPrompts.push("");
    this.questionForm.matchingCorrect.push("");
  }

  removeMatchingPrompt(index: number): void {
    if (this.questionForm.matchingPrompts.length <= 2) {
      return;
    }
    this.questionForm.matchingPrompts.splice(index, 1);
    this.questionForm.matchingCorrect.splice(index, 1);
  }

  addMatchingOption(): void {
    this.questionForm.matchingOptions.push("");
  }

  removeMatchingOption(index: number): void {
    if (this.questionForm.matchingOptions.length <= 2) {
      return;
    }
    const removed = this.questionForm.matchingOptions[index];
    this.questionForm.matchingOptions.splice(index, 1);
    this.questionForm.matchingCorrect = this.questionForm.matchingCorrect.map((answer) =>
      answer === removed ? "" : answer
    );
  }

  saveQuestion(): void {
    this.clearMessages();

    if (!this.selectedCourseId) {
      this.errorMessage = "Please select a course first.";
      return;
    }

    let payload: any;
    try {
      payload = this.buildQuestionPayload();
    } catch (error) {
      this.errorMessage = String(error);
      return;
    }

    this.savingQuestion = true;
    const wasEditing = this.editingQuestionId !== null;
    const request$ = this.editingQuestionId
      ? this.lecturerService.updateQuestionBank(this.editingQuestionId, payload)
      : this.lecturerService.addQuestionBank(payload);

    request$.subscribe({
      next: (response) => {
        this.statusMessage = this.editingQuestionId ? "Question updated." : "Question saved to question bank.";
        this.showCreateModal = false;
        this.editingQuestionId = null;
        this.questionForm = this.defaultQuestionForm();

        const newId = Number(response?.questionBankId);
        if (!wasEditing && newId && !this.selectedQuestionIds.includes(newId)) {
          this.selectedQuestionIds.push(newId);
        }

        this.loadQuestionBank();
        this.savingQuestion = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? "Failed to save question";
        this.savingQuestion = false;
      }
    });
  }

  deleteQuestion(questionBankId: number): void {
    this.clearMessages();
    if (!confirm("Delete this question from the question bank?")) {
      return;
    }
    this.lecturerService.deleteQuestionBank(questionBankId).subscribe({
      next: () => {
        this.openSuccessPopup("Question removed from question bank.");
        this.selectedQuestionIds = this.selectedQuestionIds.filter((id) => id !== questionBankId);
        this.loadQuestionBank();
      },
      error: (error) => this.errorMessage = error?.error?.message ?? "Failed to remove question"
    });
  }

  createQuiz(closeAfterSave = false, displayAfterSave = false): void {
    this.clearMessages();

    if (!this.selectedCourseId) {
      this.errorMessage = "Please select a course first.";
      return;
    }

    if (!this.quizForm.title.trim()) {
      this.errorMessage = "Quiz name is required.";
      return;
    }

    const questionBankIds = Array.from(new Set(
      this.selectedQuestionIds
        .map((id) => this.asQuestionBankId(id))
        .filter((id): id is number => id !== null)
    ));
    if (questionBankIds.length === 0) {
      this.errorMessage = "Please select at least one question before creating quiz.";
      return;
    }

    const openAt = this.combineDateTime(this.quizForm.openDate, this.quizForm.openTime);
    const closeAt = this.combineDateTime(this.quizForm.closeDate, this.quizForm.closeTime);
    let resultReleaseAt = this.quizForm.showResultImmediately
      ? null
      : this.combineDateTime(
        this.quizForm.resultReleaseDate || this.quizForm.closeDate,
        this.quizForm.resultReleaseTime || this.quizForm.closeTime
      );

    if (!closeAt) {
      this.errorMessage = "Due date/time is required for quiz.";
      return;
    }

    if (!this.quizForm.showResultImmediately && !resultReleaseAt) {
      this.errorMessage = "Please set result release date and time.";
      return;
    }

    if (!this.quizForm.showResultImmediately && resultReleaseAt) {
      resultReleaseAt = this.ensureValidResultReleaseAt(openAt, closeAt, resultReleaseAt);
    }

    this.savingQuiz = true;
    this.lecturerService.createQuiz({
      courseId: this.selectedCourseId,
      title: this.quizForm.title.trim(),
      description: this.quizForm.description.trim(),
      timeLimitMinutes: Number(this.quizForm.timeLimitMinutes),
      maxAttempts: Number(this.quizForm.maxAttempts),
      passingMark: Number(this.quizForm.passingMark),
      published: this.quizForm.published,
      unlockAfterVideos: this.quizForm.unlockAfterVideos,
      shuffleQuestions: this.quizForm.shuffleQuestions,
      shuffleAnswers: this.quizForm.shuffleAnswers,
      questionDisplayMode: this.quizForm.questionDisplayMode,
      showResultImmediately: this.quizForm.showResultImmediately,
      openAt,
      closeAt,
      resultReleaseAt,
      questionBankIds,
      autoSelect: null
    }).subscribe({
      next: (response: any) => {
        const successMessage = String(response?.message ?? "Quiz successfully created.");
        this.openSuccessPopup(successMessage);
        if (closeAfterSave) {
          this.statusMessage = "Quiz successfully created. Returning to course management.";
        } else if (displayAfterSave) {
          this.statusMessage = "Quiz settings saved. Opening Questions page.";
        } else {
          this.statusMessage = "Quiz successfully created.";
        }
        this.selectedQuestionIds = [];
        this.refreshQuizList();
        this.savingQuiz = false;
        if (closeAfterSave) {
          this.router.navigateByUrl("/lecturer/manage");
          return;
        }
        if (displayAfterSave) {
          this.router.navigate(["/lecturer/quiz-builder"], {
            queryParams: {
              courseId: this.selectedCourseId ?? null,
              quizId: Number(response?.quizId) > 0 ? Number(response.quizId) : null,
              mode: "edit"
            }
          });
        }
      },
      error: (error) => {
        this.errorMessage = this.extractApiMessage(error, "Failed to save quiz");
        this.savingQuiz = false;
      }
    });
  }

  closeSuccessPopup(): void {
    this.showSuccessPopup = false;
    if (this.successPopupTimer) {
      clearTimeout(this.successPopupTimer);
      this.successPopupTimer = null;
    }
  }

  duplicateQuiz(quizId: number): void {
    this.clearMessages();
    this.lecturerService.duplicateQuiz(quizId).subscribe({
      next: () => {
        this.statusMessage = "Quiz duplicated as draft copy.";
        this.refreshQuizList();
      },
      error: (error) => this.errorMessage = error?.error?.message ?? "Failed to duplicate quiz"
    });
  }

  deleteQuiz(quizId: number, quizTitle = "this quiz"): void {
    this.clearMessages();
    if (!confirm(`Delete "${quizTitle}"? This action cannot be undone.`)) {
      return;
    }
    this.lecturerService.deleteQuiz(quizId).subscribe({
      next: () => {
        this.statusMessage = "Quiz deleted.";
        this.refreshQuizList();
      },
      error: (error) => this.errorMessage = error?.error?.detail ?? error?.error?.message ?? "Failed to delete quiz"
    });
  }

  cancelDraft(): void {
    this.selectedQuestionIds = [];
    this.quizForm = {
      title: "",
      description: "This quiz covers key topics from the lesson.",
      gradeOut: 20,
      openDate: this.defaultOpenDate(),
      openTime: "08:00",
      closeDate: this.defaultDueDate(),
      closeTime: "23:59",
      resultReleaseDate: this.defaultDueDate(),
      resultReleaseTime: "23:59",
      timeLimitMinutes: 120,
      maxAttempts: 1,
      passingMark: 50,
      published: true,
      unlockAfterVideos: true,
      shuffleQuestions: true,
      shuffleAnswers: true,
      questionDisplayMode: "ONE_BY_ONE",
      showResultImmediately: true,
      autoSelectCount: 10
    };
    this.statusMessage = "Draft cleared.";
    this.errorMessage = "";
  }

  createQuizAndDisplay(): void {
    this.clearMessages();

    if (!this.selectedCourseId) {
      this.errorMessage = "Please select a course first.";
      return;
    }

    if (!this.quizForm.title.trim()) {
      this.errorMessage = "Quiz name is required.";
      return;
    }

    const openAt = this.combineDateTime(this.quizForm.openDate, this.quizForm.openTime);
    const closeAt = this.combineDateTime(this.quizForm.closeDate, this.quizForm.closeTime);
    let resultReleaseAt = this.quizForm.showResultImmediately
      ? null
      : this.combineDateTime(
        this.quizForm.resultReleaseDate || this.quizForm.closeDate,
        this.quizForm.resultReleaseTime || this.quizForm.closeTime
      );

    if (!closeAt) {
      this.errorMessage = "Due date/time is required for quiz.";
      return;
    }

    if (!this.quizForm.showResultImmediately && !resultReleaseAt) {
      this.errorMessage = "Please set result release date and time.";
      return;
    }

    if (!this.quizForm.showResultImmediately && resultReleaseAt) {
      resultReleaseAt = this.ensureValidResultReleaseAt(openAt, closeAt, resultReleaseAt);
    }

    this.persistQuizDraftToStorage();
    this.statusMessage = "Quiz details saved. Continue by adding questions.";
    this.router.navigate(["/lecturer/quiz-builder"], {
      queryParams: {
        courseId: this.selectedCourseId ?? null,
        mode: "edit"
      }
    });
  }

  setResultReleaseMode(immediate: boolean): void {
    this.quizForm.showResultImmediately = immediate;
    if (!immediate) {
      this.quizForm.resultReleaseDate = this.quizForm.closeDate || this.defaultDueDate();
      this.quizForm.resultReleaseTime = this.quizForm.closeTime || "23:59";
    }
  }

  isSettingsSectionOpen(section: SettingsSection): boolean {
    return this.settingsSectionState[section];
  }

  toggleSettingsSection(section: SettingsSection): void {
    if (this.settingsSectionState[section]) {
      this.settingsSectionState[section] = false;
      return;
    }
    this.openSettingsSection(section);
  }

  scrollToSettingsSection(section: SettingsSection): void {
    this.openSettingsSection(section);
    const elementId = section === "general"
      ? "quiz-general-section"
      : section === "timing"
        ? "quiz-timing-section"
        : "quiz-grade-section";
    setTimeout(() => {
      const target = document.getElementById(elementId);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  private openSettingsSection(section: SettingsSection): void {
    this.settingsSectionState = {
      general: false,
      timing: false,
      grade: false
    };
    this.settingsSectionState[section] = true;
  }

  toggleQuestion(questionId: number, checked: boolean): void {
    const normalizedId = this.asQuestionBankId(questionId);
    if (normalizedId === null) {
      return;
    }

    if (checked) {
      if (!this.selectedQuestionIds.includes(normalizedId)) {
        this.selectedQuestionIds = [...this.selectedQuestionIds, normalizedId];
      }
      return;
    }
    this.selectedQuestionIds = this.selectedQuestionIds.filter((id) => id !== normalizedId);
  }

  removeSelectedQuestion(questionId: number): void {
    const normalizedId = this.asQuestionBankId(questionId);
    if (normalizedId === null) {
      return;
    }
    this.selectedQuestionIds = this.selectedQuestionIds.filter((id) => id !== normalizedId);
  }

  moveSelectedQuestion(questionId: number, direction: -1 | 1): void {
    const normalizedId = this.asQuestionBankId(questionId);
    if (normalizedId === null) {
      return;
    }
    const index = this.selectedQuestionIds.indexOf(normalizedId);
    if (index < 0) {
      return;
    }
    const target = index + direction;
    if (target < 0 || target >= this.selectedQuestionIds.length) {
      return;
    }
    const swapped = [...this.selectedQuestionIds];
    const temp = swapped[index];
    swapped[index] = swapped[target];
    swapped[target] = temp;
    this.selectedQuestionIds = swapped;
  }

  repaginateSelectedQuestions(): void {
    const selectedSet = new Set(this.selectedQuestionIds);
    const ordered = this.questionBank
      .filter((item) => selectedSet.has(Number(item.questionBankId)))
      .map((item) => Number(item.questionBankId));
    if (ordered.length > 0) {
      this.selectedQuestionIds = ordered;
    }
    this.statusMessage = "Question order updated.";
    this.errorMessage = "";
  }

  toggleBulkSelectionMode(): void {
    this.bulkSelectionMode = !this.bulkSelectionMode;
    this.statusMessage = this.bulkSelectionMode
      ? "Multiple selection mode enabled."
      : "Multiple selection mode disabled.";
    this.errorMessage = "";
  }

  saveMaximumGrade(): void {
    this.statusMessage = `Maximum grade set to ${Number(this.quizForm.gradeOut || 0).toFixed(2)}.`;
    this.errorMessage = "";
  }

  clearSelectedQuestions(): void {
    this.selectedQuestionIds = [];
  }

  isSelected(questionId: number): boolean {
    const normalizedId = this.asQuestionBankId(questionId);
    return normalizedId === null ? false : this.selectedQuestionIds.includes(normalizedId);
  }

  selectedQuestions(): any[] {
    return this.selectedQuestionIds
      .map((id) => this.questionBank.find((item) => this.asQuestionBankId(item.questionBankId) === id))
      .filter(Boolean);
  }

  totalSelectedPoints(): number {
    return this.selectedQuestions().reduce((sum, item) => sum + Number(item.points ?? 0), 0);
  }

  filteredQuestionBank(): any[] {
    let rows = [...this.questionBank];

    if (!this.questionBankView.includeOldQuestions) {
      rows = rows.filter((item) => String(item.status ?? "Ready").toLowerCase() !== "archived");
    }

    const category = this.questionBankView.category;
    if (category && category !== "ALL") {
      if (category.startsWith("COURSE:")) {
        const courseId = Number(category.replace("COURSE:", ""));
        rows = rows.filter((item) => Number(item.courseId) === courseId);
      } else if (category.startsWith("MODULE:")) {
        const moduleTag = category.replace("MODULE:", "").trim().toLowerCase();
        rows = rows.filter((item) => String(item.moduleTag ?? "").trim().toLowerCase() === moduleTag);
      }
    }

    const tag = this.questionBankView.tagFilter.trim().toLowerCase();
    if (tag) {
      rows = rows.filter((item) => {
        const topic = String(item.topicTag ?? "").trim().toLowerCase();
        const module = String(item.moduleTag ?? "").trim().toLowerCase();
        if (this.questionBankView.includeSubcategories) {
          return topic.includes(tag) || module.includes(tag);
        }
        return topic === tag || module === tag;
      });
    }

    const query = this.librarySearch.trim().toLowerCase();
    if (!query) {
      return rows;
    }

    return rows.filter((item) =>
      String(item.prompt ?? "").toLowerCase().includes(query) ||
      String(item.questionType ?? "").toLowerCase().includes(query) ||
      String(item.topicTag ?? "").toLowerCase().includes(query) ||
      String(item.moduleTag ?? "").toLowerCase().includes(query) ||
      String(item.questionCode ?? "").toLowerCase().includes(query) ||
      String(item.createdBy ?? "").toLowerCase().includes(query)
    );
  }

  categoryOptions(): Array<{ value: string; label: string }> {
    const options = new Map<string, string>();
    options.set("ALL", "All categories");

    const selectedCourse = this.currentCourse();
    if (selectedCourse) {
      options.set(`COURSE:${selectedCourse.courseId}`, `${selectedCourse.title} (Course)`);
    }

    for (const item of this.questionBank) {
      const moduleTag = String(item.moduleTag ?? "").trim();
      if (moduleTag) {
        options.set(`MODULE:${moduleTag}`, moduleTag);
      }
    }

    return Array.from(options.entries()).map(([value, label]) => ({ value, label }));
  }

  isAllVisibleSelected(): boolean {
    const visibleIds = this.filteredQuestionBank()
      .map((item) => this.asQuestionBankId(item.questionBankId))
      .filter((id): id is number => id !== null);
    if (visibleIds.length === 0) {
      return false;
    }
    return visibleIds.every((id) => this.selectedQuestionIds.includes(id));
  }

  toggleVisibleSelection(checked: boolean): void {
    const visibleIds = this.filteredQuestionBank()
      .map((item) => this.asQuestionBankId(item.questionBankId))
      .filter((id): id is number => id !== null);
    if (checked) {
      const merged = new Set([...this.selectedQuestionIds, ...visibleIds]);
      this.selectedQuestionIds = Array.from(merged);
      return;
    }
    const hidden = new Set(visibleIds);
    this.selectedQuestionIds = this.selectedQuestionIds.filter((id) => !hidden.has(id));
  }

  openCreateQuestionQuick(): void {
    this.openCreateModal("MCQ");
  }

  showQuestionPrompt(): boolean {
    return this.questionBankView.showQuestionTextMode !== "HIDDEN";
  }

  showQuestionMeta(): boolean {
    return this.questionBankView.showQuestionTextMode === "TEXT_WITH_META";
  }

  selectedCountLabel(): string {
    const count = this.selectedQuestionIds.length;
    return `${count} item${count === 1 ? "" : "s"} selected`;
  }

  questionTypeLabel(type: QuestionType | string): string {
    return this.questionTypes.find((item) => item.value === type)?.label ?? type;
  }

  setQuestionType(type: QuestionType): void {
    this.questionForm.questionType = type;

    if ((type === "MCQ" || type === "MULTI_SELECT") && this.questionForm.options.length < 2) {
      this.questionForm.options = [
        { text: "", correct: type === "MCQ" },
        { text: "", correct: false }
      ];
    }

    if (type === "TRUE_FALSE" && !["True", "False"].includes(this.questionForm.trueFalseCorrect)) {
      this.questionForm.trueFalseCorrect = "True";
    }

    if (type === "MATCHING") {
      if (this.questionForm.matchingPrompts.length < 2) {
        this.questionForm.matchingPrompts = ["", "", "", ""];
      }
      if (this.questionForm.matchingOptions.length < 2) {
        this.questionForm.matchingOptions = ["", "", "", ""];
      }
      if (this.questionForm.matchingCorrect.length < this.questionForm.matchingPrompts.length) {
        this.questionForm.matchingCorrect = this.questionForm.matchingPrompts.map((_, idx) => this.questionForm.matchingCorrect[idx] ?? "");
      }
    }

    this.statusMessage = `${this.questionTypeLabel(type)} selected.`;
    this.errorMessage = "";
  }

  applyPromptTool(tool: EditorTool): void {
    this.applyEditorTool(tool, "questionPromptEditor", { field: "PROMPT" });
  }

  applyOptionTool(index: number, tool: EditorTool): void {
    this.applyEditorTool(tool, `choiceEditor-${index}`, { field: "OPTION", index });
  }

  openAddElementPanel(): void {
    if (!this.questionForm.mediaType) {
      this.questionForm.mediaType = "IMAGE";
    }
    this.statusMessage = "Add Element enabled. Set media type and URL below.";
    this.errorMessage = "";
    const mediaInput = document.getElementById("questionMediaUrl") as HTMLInputElement | null;
    setTimeout(() => mediaInput?.focus(), 0);
  }

  previewOptions(): string[] {
    if (this.questionForm.questionType === "TRUE_FALSE") {
      return ["True", "False"];
    }
    if (this.questionForm.questionType === "MCQ" || this.questionForm.questionType === "MULTI_SELECT") {
      return this.questionForm.options
        .map((option) => option.text.trim())
        .filter(Boolean);
    }
    return [];
  }

  matchingOptionChoices(): string[] {
    return this.questionForm.matchingOptions
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item, index, array) => array.indexOf(item) === index);
  }

  togglePublish(quizId: number, published: boolean): void {
    this.clearMessages();
    this.lecturerService.publishQuiz(quizId, published).subscribe({
      next: () => {
        this.statusMessage = "Quiz publication updated.";
        this.refreshQuizList();
      },
      error: (error) => this.errorMessage = error?.error?.message ?? "Failed to update quiz status"
    });
  }

  private clearMessages(): void {
    this.statusMessage = "";
    this.errorMessage = "";
  }

  private openSuccessPopup(message: string): void {
    this.closeSuccessPopup();
    this.successPopupMessage = message;
    this.showSuccessPopup = true;
    this.successPopupTimer = setTimeout(() => {
      this.showSuccessPopup = false;
      this.successPopupTimer = null;
    }, 2600);
  }

  private refreshQuizList(): void {
    if (!this.shouldLoadQuizList()) {
      this.quizzes = [];
      this.quizListError = "";
      return;
    }
    this.loadQuizzes();
  }

  private shouldLoadQuizList(): boolean {
    return this.isQuizMode() || this.isResultsMode() || this.requestedQuizId !== null;
  }

  private ensureValidResultReleaseAt(openAt: string | null, closeAt: string, resultReleaseAt: string): string {
    if (resultReleaseAt < closeAt) {
      const [releaseDate, releaseTimeWithSec] = closeAt.split("T");
      this.quizForm.resultReleaseDate = releaseDate;
      this.quizForm.resultReleaseTime = releaseTimeWithSec.slice(0, 5);
      return closeAt;
    }

    if (openAt && resultReleaseAt < openAt) {
      const [releaseDate, releaseTimeWithSec] = openAt.split("T");
      this.quizForm.resultReleaseDate = releaseDate;
      this.quizForm.resultReleaseTime = releaseTimeWithSec.slice(0, 5);
      return openAt;
    }

    return resultReleaseAt;
  }

  private extractApiMessage(error: any, fallback: string): string {
    return error?.error?.detail
      ?? error?.error?.message
      ?? error?.message
      ?? fallback;
  }

  private defaultOpenDate(): string {
    const value = new Date();
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private defaultDueDate(): string {
    const value = new Date();
    value.setDate(value.getDate() + 7);
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private combineDateTime(dateValue: string, timeValue: string): string | null {
    if (!dateValue || !timeValue) {
      return null;
    }
    return `${dateValue}T${timeValue}:00`;
  }

  private currentCourse(): any | null {
    return this.courses.find((course) => course.courseId === this.selectedCourseId) ?? null;
  }

  private persistQuizDraftToStorage(): void {
    const questionIds = Array.from(new Set(
      this.selectedQuestionIds
        .map((id) => this.asQuestionBankId(id))
        .filter((id): id is number => id !== null)
    ));
    const payload = {
      courseId: this.selectedCourseId,
      questionIds,
      quizForm: this.quizForm
    };
    sessionStorage.setItem("edusim.quizDraft", JSON.stringify(payload));
  }

  private restoreQuizDraftFromStorage(consumeAfterRestore = true): void {
    const raw = sessionStorage.getItem("edusim.quizDraft");
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      const storedCourseId = Number(parsed?.courseId ?? 0);
      const ids: number[] = Array.isArray(parsed?.questionIds)
        ? parsed.questionIds.map((item: unknown) => Number(item)).filter((item: number) => Number.isFinite(item) && item > 0)
        : [];

      if (storedCourseId > 0 && (!this.selectedCourseId || this.selectedCourseId === storedCourseId)) {
        this.selectedCourseId = storedCourseId;
      }
      if (ids.length > 0) {
        this.selectedQuestionIds = Array.from(new Set(ids));
      }
      if (parsed?.quizForm && typeof parsed.quizForm === "object") {
        this.quizForm = {
          ...this.quizForm,
          ...parsed.quizForm
        };
      }
    } catch {
      // ignore invalid draft payload
    } finally {
      if (consumeAfterRestore) {
        sessionStorage.removeItem("edusim.quizDraft");
      }
    }
  }

  private applyRequestedModeMessage(): void {
    if (!this.requestedMode) {
      return;
    }

    if (this.requestedMode === "create") {
      this.statusMessage = "Course selected. You can add new quiz now.";
    } else if (this.requestedMode === "edit") {
      this.statusMessage = "Course selected. Use Quiz List & Publish to edit existing quiz.";
    } else if (this.requestedMode === "bank") {
      this.statusMessage = "Course selected. Manage question bank items for this course.";
    }

    this.requestedMode = "";
  }

  private asQuestionBankId(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private normalizeQuestionBankItem(item: any): any {
    const questionBankId = this.asQuestionBankId(item?.questionBankId);
    return {
      ...item,
      questionBankId: questionBankId ?? item?.questionBankId,
      commentCount: item?.commentCount ?? item?.comments ?? 0,
      usageCount: item?.usageCount ?? item?.usage ?? 0,
      lastUsedAt: item?.lastUsedAt ?? item?.lastUsed ?? null,
      updatedAt: item?.updatedAt ?? item?.modifiedAt ?? item?.createdAt ?? null
    };
  }

  private defaultQuestionForm() {
    return {
      questionType: "MCQ" as QuestionType,
      difficultyLevel: "MEDIUM" as DifficultyLevel,
      topicTag: "",
      moduleTag: "",
      prompt: "",
      explanation: "",
      mediaUrl: "",
      mediaType: "" as MediaType,
      points: 1,
      randomizeAnswers: false,
      options: [
        { text: "", correct: true },
        { text: "", correct: false }
      ],
      trueFalseCorrect: "True",
      shortAnswer: "",
      shortAnswerKeywords: "",
      matchingPrompts: ["", "", "", ""],
      matchingOptions: ["", "", "", ""],
      matchingCorrect: ["", "", "", ""],
      allowDuplicateResponse: false,
      scoringType: "EXACT" as MatchingScoringType
    };
  }

  private buildQuestionPayload(): any {
    if (!this.questionForm.prompt.trim()) {
      throw new Error("Question text is required.");
    }
    if (!this.questionForm.topicTag.trim()) {
      throw new Error("Topic tag is required.");
    }

    const basePayload = {
      courseId: this.selectedCourseId,
      questionType: this.questionForm.questionType,
      difficultyLevel: this.questionForm.difficultyLevel,
      topicTag: this.questionForm.topicTag.trim(),
      moduleTag: this.questionForm.moduleTag.trim() || this.currentCourse()?.title || "General",
      prompt: this.questionForm.prompt.trim(),
      explanation: this.questionForm.explanation.trim(),
      mediaUrl: this.questionForm.mediaUrl.trim(),
      mediaType: this.questionForm.mediaType || null,
      points: Math.max(1, Number(this.questionForm.points))
    };

    if (this.questionForm.questionType === "SHORT_ANSWER") {
      const answer = this.questionForm.shortAnswer.trim();
      if (!answer) {
        throw new Error("Expected answer is required.");
      }
      const keywords = this.questionForm.shortAnswerKeywords
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
      return {
        ...basePayload,
        options: { keywords },
        correctAnswer: answer.toLowerCase()
      };
    }

    if (this.questionForm.questionType === "MATCHING") {
      const left = this.questionForm.matchingPrompts
        .map((item) => item.trim())
        .filter(Boolean);
      const right = this.matchingOptionChoices();

      if (left.length < 2) {
        throw new Error("Please add at least 2 prompts for matching.");
      }
      if (right.length < 2) {
        throw new Error("Please add at least 2 possible answers for matching.");
      }

      const usedAnswers = new Set<string>();
      const correctMap: Record<string, string> = {};
      for (let i = 0; i < this.questionForm.matchingPrompts.length; i++) {
        const prompt = this.questionForm.matchingPrompts[i]?.trim();
        if (!prompt) {
          continue;
        }
        const selected = this.questionForm.matchingCorrect[i]?.trim();
        const chosen = selected || right[i] || "";
        if (!chosen || !right.includes(chosen)) {
          throw new Error("Please set valid correct matching for each prompt.");
        }
        if (!this.questionForm.allowDuplicateResponse && usedAnswers.has(chosen)) {
          throw new Error("Duplicate response not allowed. Choose unique correct answer for each prompt.");
        }
        usedAnswers.add(chosen);
        correctMap[prompt] = chosen;
      }

      return {
        ...basePayload,
        options: {
          left,
          right,
          allowDuplicateResponse: this.questionForm.allowDuplicateResponse,
          scoringType: this.questionForm.scoringType
        },
        correctAnswer: correctMap
      };
    }

    if (this.questionForm.questionType === "TRUE_FALSE") {
      return {
        ...basePayload,
        options: ["True", "False"],
        correctAnswer: this.questionForm.trueFalseCorrect
      };
    }

    const options = this.questionForm.options
      .map((option) => ({ text: option.text.trim(), correct: option.correct }))
      .filter((option) => option.text);

    if (options.length < 2) {
      throw new Error("Please add at least 2 answers.");
    }

    if (this.questionForm.questionType === "MULTI_SELECT") {
      const correctAnswers = options
        .filter((option) => option.correct)
        .map((option) => option.text);

      if (correctAnswers.length === 0) {
        throw new Error("Select at least one correct answer.");
      }

      return {
        ...basePayload,
        options: options.map((option) => option.text),
        correctAnswer: correctAnswers
      };
    }

    const correctAnswer = options.find((option) => option.correct)?.text;
    if (!correctAnswer) {
      throw new Error("Please select one correct answer.");
    }

    return {
      ...basePayload,
      options: options.map((option) => option.text),
      correctAnswer
    };
  }

  private applyEditorTool(
    tool: EditorTool,
    textareaId: string,
    target: { field: "PROMPT" } | { field: "OPTION"; index: number }
  ): void {
    const textarea = document.getElementById(textareaId) as HTMLTextAreaElement | null;
    if (!textarea) {
      return;
    }

    const currentValue = this.readEditorValue(target);
    const start = Math.max(0, Math.min(textarea.selectionStart ?? 0, currentValue.length));
    const end = Math.max(start, Math.min(textarea.selectionEnd ?? start, currentValue.length));
    const selectedText = currentValue.slice(start, end);

    const replacement = this.editorReplacement(tool, selectedText);
    const updatedValue = `${currentValue.slice(0, start)}${replacement}${currentValue.slice(end)}`;
    const cursor = start + replacement.length;

    this.writeEditorValue(target, updatedValue);

    setTimeout(() => {
      const updatedTextarea = document.getElementById(textareaId) as HTMLTextAreaElement | null;
      if (!updatedTextarea) {
        return;
      }
      updatedTextarea.focus();
      updatedTextarea.setSelectionRange(cursor, cursor);
    }, 0);
  }

  private readEditorValue(target: { field: "PROMPT" } | { field: "OPTION"; index: number }): string {
    if (target.field === "PROMPT") {
      return String(this.questionForm.prompt ?? "");
    }
    return String(this.questionForm.options[target.index]?.text ?? "");
  }

  private writeEditorValue(target: { field: "PROMPT" } | { field: "OPTION"; index: number }, value: string): void {
    if (target.field === "PROMPT") {
      this.questionForm.prompt = value;
      return;
    }

    if (!this.questionForm.options[target.index]) {
      return;
    }
    this.questionForm.options[target.index].text = value;
  }

  private editorReplacement(tool: EditorTool, selectedText: string): string {
    const trimmed = selectedText.trim();

    if (tool === "BOLD") {
      const content = trimmed || "bold text";
      return `**${content}**`;
    }

    if (tool === "ITALIC") {
      const content = trimmed || "italic text";
      return `*${content}*`;
    }

    if (tool === "HEADING") {
      if (!selectedText.trim()) {
        return "## Heading";
      }
      return this.prefixEachLine(selectedText, "## ");
    }

    if (tool === "QUOTE") {
      if (!selectedText.trim()) {
        return "> Quote";
      }
      return this.prefixEachLine(selectedText, "> ");
    }

    if (tool === "LINK") {
      const label = trimmed || "link text";
      return `[${label}](https://example.com)`;
    }

    if (tool === "IMAGE") {
      const altText = trimmed || "image description";
      return `![${altText}](https://example.com/image.jpg)`;
    }

    if (tool === "BULLET_LIST") {
      if (!selectedText.trim()) {
        return "- Item 1\n- Item 2";
      }
      return this.prefixEachLine(selectedText, "- ");
    }

    if (tool === "NUMBER_LIST") {
      if (!selectedText.trim()) {
        return "1. Item 1\n2. Item 2";
      }
      const lines = selectedText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      return lines.map((line, index) => `${index + 1}. ${line}`).join("\n");
    }

    return selectedText;
  }

  private prefixEachLine(text: string, prefix: string): string {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      return `${prefix}Item`;
    }

    return lines.map((line) => `${prefix}${line}`).join("\n");
  }
}
