import { CommonModule } from "@angular/common";
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { forkJoin } from "rxjs";
import { LecturerService } from "../../services/lecturer.service";

type QuestionType = "MCQ" | "TRUE_FALSE" | "MULTI_SELECT" | "SHORT_ANSWER" | "MATCHING";
type MatchingScoringType = "EXACT" | "PARTIAL";
type DifficultyLevel = "EASY" | "MEDIUM" | "HARD";
type MediaType = "" | "IMAGE" | "AUDIO" | "VIDEO";
type QuestionTextMode = "TEXT_ONLY" | "TEXT_WITH_META" | "HIDDEN";
type EditorTool = "BOLD" | "ITALIC" | "HEADING" | "QUOTE" | "LINK" | "IMAGE" | "BULLET_LIST" | "NUMBER_LIST";
type SettingsSection = "general" | "timing" | "grade";
type ImportRole = "LECTURER" | "ADMINISTRATOR";
type ReviewTiming = "" | "IMMEDIATE_AFTER_SUBMISSION" | "AFTER_DUE_DATE" | "MANUAL_RELEASE" | "HIDDEN";
type SettingsHelpKey = "passingMark" | "maxAttempts" | "timeLimit" | "showCorrectAnswer" | "shuffleQuestions" | "debugLogs" | "minimumImportRole";

type QuizValidationResult = {
  message: string;
  section: SettingsSection;
};

type QuestionTypeOption = {
  value: QuestionType;
  label: string;
  menuLabel: string;
};

type DeleteConfirmState = {
  kind: "question" | "questions" | "quiz";
  id: number;
  ids?: number[];
  title: string;
  message: string;
} | null;

@Component({
  selector: "app-lecturer-question-bank",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: "./lecturer-question-bank.component.html",
  styleUrl: "./lecturer-question-bank.component.css"
})
export class LecturerQuestionBankComponent implements OnInit, OnDestroy {
  private readonly lecturerService = inject(LecturerService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly quickControlsStorageKey = "edusim.quizQuickControls";
  private readonly quizDraftStorageKey = "edusim.quizDraft";
  @ViewChild("createWrap") private createWrapRef?: ElementRef<HTMLElement>;
  @ViewChild("importQuestionFileInput") private importQuestionFileInput?: ElementRef<HTMLInputElement>;

  courses: any[] = [];
  questionBank: any[] = [];
  quizzes: any[] = [];
  draftQuestions: any[] = [];

  selectedCourseId: number | null = null;
  selectedQuestionIds: number[] = [];
  editingQuestionId: number | null = null;
  editingQuizId: number | null = null;

  private readonly statusToastDurationMs = 1500;
  private statusMessageTimer: number | null = null;
  private _statusMessage = "";
  errorMessage = "";
  quizListError = "";

  showTypeMenu = false;
  showWidgetDrawer = false;
  showCreateModal = false;
  showLibraryModal = false;
  showPreviewModal = false;
  deleteConfirm: DeleteConfirmState = null;
  previewData: any = null;
  previewLoading = false;
  librarySearch = "";
  questionBankPage = 1;
  questionBankPageSize = 10;
  savingQuestion = false;
  savingQuiz = false;
  importingQuestions = false;
  importQuestionFile: File | null = null;
  importStatusMessage = "";
  importErrorMessage = "";
  quizExporting = false;
  quizExportSelection = "ALL";
  quizTransferStatusMessage = "";
  quizTransferErrorMessage = "";
  bulkSelectionMode = false;
  canvasSelectionMode = false;
  selectedCanvasDraftIds: number[] = [];
  selectedCanvasQuestionIds: number[] = [];
  pageMode: "quiz" | "settings" | "questions" | "results" | "bank" = "questions";
  settingsSectionState: Record<SettingsSection, boolean> = {
    general: true,
    timing: false,
    grade: false
  };
  activeSettingsHelp: SettingsHelpKey | null = null;
  private requestedCourseId: number | null = null;
  private requestedQuizId: number | null = null;
  private requestedMode = "";
  private requestedSource = "";
  private nextDraftQuestionId = -1;
  private skipPersistOnDestroy = false;

  readonly questionBankPageSizes = [10, 20, 50];

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

  readonly importRoleOptions: Array<{ value: ImportRole; label: string }> = [
    { value: "ADMINISTRATOR", label: "Administrator" },
    { value: "LECTURER", label: "Lecturer" }
  ];

  readonly quickSettingsHelpText: Record<SettingsHelpKey, string> = {
    passingMark: "Minimum percentage students need to pass the quiz.",
    maxAttempts: "Maximum number of times a student can answer this quiz.",
    timeLimit: "Total time allowed for one quiz attempt, in minutes.",
    showCorrectAnswer: "Allow students to see correct answers after submission based on the feedback settings.",
    shuffleQuestions: "Show questions in a different order for each attempt.",
    debugLogs: "Keep extra troubleshooting details in the browser console while testing quiz setup.",
    minimumImportRole: "Lowest staff role allowed to use document import tools on this browser."
  };

  get activeToastMessage(): string {
    return this.errorMessage || this.statusMessage;
  }

  get statusMessage(): string {
    return this._statusMessage;
  }

  set statusMessage(message: string) {
    this._statusMessage = message;
    if (this.statusMessageTimer !== null) {
      window.clearTimeout(this.statusMessageTimer);
      this.statusMessageTimer = null;
    }
    if (!message) {
      return;
    }
    this.statusMessageTimer = window.setTimeout(() => {
      if (this._statusMessage === message) {
        this._statusMessage = "";
      }
      this.statusMessageTimer = null;
    }, this.statusToastDurationMs);
  }

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
    { value: "MCQ", shortLabel: "MCQ", icon: "MCQ" },
    { value: "MULTI_SELECT", shortLabel: "MSQ", icon: "MSQ" },
    { value: "TRUE_FALSE", shortLabel: "True/False", icon: "TF" },
    { value: "SHORT_ANSWER", shortLabel: "short answer", icon: "SA" },
    { value: "MATCHING", shortLabel: "Matching", icon: "MAT" }
  ];

  readonly questionTypeCardsUi: Array<{ value: QuestionType; shortLabel: string; icon: string }> = [
    { value: "MCQ", shortLabel: "MCQ", icon: "MCQ" },
    { value: "MULTI_SELECT", shortLabel: "MSQ", icon: "MSQ" },
    { value: "TRUE_FALSE", shortLabel: "True/False", icon: "TF" },
    { value: "SHORT_ANSWER", shortLabel: "short answer", icon: "SA" },
    { value: "MATCHING", shortLabel: "Matching", icon: "MAT" }
  ];

  readonly widgetTypes: Array<{ value: QuestionType; title: string; description: string; badge: string }> = [
    {
      value: "MCQ",
      title: "Multiple Choice",
      description: "Single answer from multiple options",
      badge: "MCQ"
    },
    {
      value: "MULTI_SELECT",
      title: "Multi-Select",
      description: "Select multiple correct answers",
      badge: "MSQ"
    },
    {
      value: "TRUE_FALSE",
      title: "True / False",
      description: "Simple true or false statements",
      badge: "TF"
    },
    {
      value: "MATCHING",
      title: "Matching",
      description: "Match items from two columns",
      badge: "MAT"
    },
    {
      value: "SHORT_ANSWER",
      title: "Text Input",
      description: "Short or long text answer",
      badge: "TXT"
    }
  ];

  questionForm = this.defaultQuestionForm();

  quizForm: any = this.defaultQuizForm();

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
        } else {
          this.selectedCourseId = null;
        }

        const selectedCourse = this.currentCourse();
        if (selectedCourse) {
          this.questionForm.moduleTag = selectedCourse.title;
          if (!this.questionForm.topicTag.trim()) {
            this.questionForm.topicTag = selectedCourse.title;
          }
        }
        const fromQuizBuilderFlow = this.isBankMode() && this.requestedSource === "quiz";
        if (!this.isBankMode() || fromQuizBuilderFlow) {
          this.restoreQuizDraftFromStorage(false, Boolean(requested || fromQuizBuilderFlow));
        }
        this.applyRequestedModeMessage();
        this.loadQuestionBank();
        this.refreshQuizList();
      },
      error: (error) => this.errorMessage = this.extractApiMessage(error, "Failed to load courses")
    });
  }

  ngOnDestroy(): void {
    if (!this.skipPersistOnDestroy && this.hasQuizDraftWork()) {
      this.persistQuizDraftToStorage();
    }
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
        this.questionBankPage = 1;
        const validIds = new Set(normalized.map((item) => item.questionBankId));
        this.selectedQuestionIds = this.selectedQuestionIds
          .map((id) => this.asQuestionBankId(id))
          .filter((id: number | null): id is number => id !== null && validIds.has(id));
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
    this.draftQuestions = [];
    this.editingQuizId = null;
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
    this.toggleWidgetDrawer();
  }

  toggleWidgetDrawer(open?: boolean): void {
    this.showWidgetDrawer = typeof open === "boolean" ? open : !this.showWidgetDrawer;
    this.showTypeMenu = false;
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

  addWidgetQuestion(type: QuestionType): void {
    this.clearMessages();
    this.showTypeMenu = false;
    this.showWidgetDrawer = false;

    if (!this.selectedCourseId) {
      this.errorMessage = "Please select a course first.";
      return;
    }

    const draft = this.createDraftQuestion(type);
    this.draftQuestions = [...this.draftQuestions, draft];
    this.persistQuizDraftToStorage();
    this.statusMessage = `${this.questionTypeLabel(type)} widget added below. Fill it in, then save the question.`;
  }

  openModernWidgetList(): void {
    this.clearMessages();
    this.showWidgetDrawer = true;
  }

  openEditQuestion(item: any): void {
    this.editingQuestionId = Number(item.questionBankId);
    this.questionForm = this.questionFormFromItem(item);
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

  isCourseLockedByRoute(): boolean {
    return Boolean(this.requestedCourseId && this.currentCourse());
  }

  tabQueryParams(): Record<string, any> {
    return this.selectedCourseId ? { courseId: this.selectedCourseId } : {};
  }

  goToBuilderStep(step: 1 | 2 | 3): void {
    this.persistQuizDraftToStorage();
    const queryParams = {
      courseId: this.selectedCourseId ?? null,
      mode: "edit"
    };

    if (step === 1) {
      this.router.navigate(["/lecturer/quiz-settings"], { queryParams });
      return;
    }

    if (step === 2) {
      this.router.navigate(["/lecturer/quiz-builder"], { queryParams });
      return;
    }

    this.router.navigate(["/lecturer/quiz-overview"], {
      queryParams: {
        courseId: this.selectedCourseId ?? null
      }
    });
  }

  scrollToBuilderSection(section: "setup" | "questions" | "canvas"): void {
    const elementId = section === "setup"
      ? "quiz-builder-setup"
      : section === "questions"
        ? "quiz-builder-questions"
        : "quiz-builder-canvas";
    document.getElementById(elementId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  currentCourseTitle(): string {
    return this.currentCourse()?.title ?? "";
  }

  quizCountLabel(): string {
    const count = this.quizzes.length;
    return `${count} ${count === 1 ? "quiz" : "quizzes"}`;
  }

  questionCountLabel(count: number): string {
    return `${count} ${count === 1 ? "question" : "questions"}`;
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
    this.router.navigate(["/lecturer/quizzes", quizId, "preview"], {
      queryParams: {
        courseId: this.selectedCourseId ?? null
      }
    });
  }

  editQuiz(quiz: any): void {
    this.clearMessages();

    const quizId = Number(quiz?.quizId ?? 0);
    if (!Number.isFinite(quizId) || quizId <= 0) {
      this.errorMessage = "Unable to open quiz editor.";
      return;
    }

    const courseId = Number(quiz?.courseId ?? this.selectedCourseId ?? 0);
    if (Number.isFinite(courseId) && courseId > 0) {
      this.selectedCourseId = courseId;
    }

    this.previewLoading = true;
    this.lecturerService.previewQuiz(quizId).subscribe({
      next: (data: any) => {
        const quizDetails = data?.quiz && typeof data.quiz === "object" ? data.quiz : quiz;
        const previewQuestions = Array.isArray(data?.questions) ? data.questions : [];
        this.applyQuizDetailsToForm(quizDetails, previewQuestions);
        this.editingQuizId = quizId;
        this.selectedQuestionIds = [];
        this.draftQuestions = previewQuestions.map((question: any) => this.draftQuestionFromQuizQuestion(question));

        if (!this.persistQuizDraftToStorage()) {
          this.errorMessage = "Unable to prepare quiz editor.";
          this.previewLoading = false;
          return;
        }

        this.previewLoading = false;
        this.router.navigate(["/lecturer/quiz-builder"], {
          queryParams: {
            courseId: (this.selectedCourseId ?? courseId) || null,
            courseTitle: this.currentCourseTitle() || quizDetails?.courseTitle || quiz?.courseTitle || null,
            mode: "edit"
          }
        });
      },
      error: (error) => {
        this.errorMessage = this.extractApiMessage(error, "Unable to load quiz for editing.");
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

  addDraftOption(draft: any): void {
    draft.options.push({ text: `Option ${draft.options.length + 1}`, correct: false });
    this.persistQuizDraftToStorage();
  }

  moveOption(index: number, direction: -1 | 1): void {
    this.moveArrayItem(this.questionForm.options, index, direction);
  }

  moveDraftOption(draft: any, index: number, direction: -1 | 1): void {
    if (!Array.isArray(draft?.options)) {
      return;
    }
    this.moveArrayItem(draft.options, index, direction);
    this.persistQuizDraftToStorage();
  }

  moveMatchingOption(index: number, direction: -1 | 1): void {
    this.moveArrayItem(this.questionForm.matchingOptions, index, direction);
  }

  moveDraftMatchingOption(draft: any, index: number, direction: -1 | 1): void {
    if (!Array.isArray(draft?.matchingOptions)) {
      return;
    }
    this.moveArrayItem(draft.matchingOptions, index, direction);
    this.persistQuizDraftToStorage();
  }

  moveMatchingPrompt(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (!this.canMoveArrayItem(this.questionForm.matchingPrompts, index, direction)) {
      return;
    }
    this.swapArrayItems(this.questionForm.matchingPrompts, index, target);
    this.swapArrayItems(this.questionForm.matchingCorrect, index, target);
  }

  moveDraftMatchingPrompt(draft: any, index: number, direction: -1 | 1): void {
    if (!Array.isArray(draft?.matchingPrompts) || !Array.isArray(draft?.matchingCorrect)) {
      return;
    }
    const target = index + direction;
    if (!this.canMoveArrayItem(draft.matchingPrompts, index, direction)) {
      return;
    }
    this.swapArrayItems(draft.matchingPrompts, index, target);
    this.swapArrayItems(draft.matchingCorrect, index, target);
    this.persistQuizDraftToStorage();
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

  removeDraftOption(draft: any, index: number): void {
    if (!draft?.options || draft.options.length <= 2) {
      return;
    }
    draft.options.splice(index, 1);
    if (draft.questionType === "MCQ" && !draft.options.some((option: any) => option.correct)) {
      draft.options[0].correct = true;
    }
    this.persistQuizDraftToStorage();
  }

  setSingleCorrect(index: number): void {
    this.questionForm.options = this.questionForm.options.map((option, i) => ({
      ...option,
      correct: i === index
    }));
  }

  setDraftSingleCorrect(draft: any, index: number): void {
    draft.options = draft.options.map((option: any, i: number) => ({
      ...option,
      correct: i === index
    }));
    this.persistQuizDraftToStorage();
  }

  setMultiCorrect(index: number, checked: boolean): void {
    this.questionForm.options[index].correct = checked;
  }

  setDraftMultiCorrect(draft: any, index: number, checked: boolean): void {
    draft.options[index].correct = checked;
    this.persistQuizDraftToStorage();
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

  addDraftMatchingPrompt(draft: any): void {
    draft.matchingPrompts.push(`Prompt ${draft.matchingPrompts.length + 1}`);
    draft.matchingCorrect.push("");
  }

  removeDraftMatchingPrompt(draft: any, index: number): void {
    if (!draft?.matchingPrompts || draft.matchingPrompts.length <= 2) {
      return;
    }
    draft.matchingPrompts.splice(index, 1);
    draft.matchingCorrect.splice(index, 1);
  }

  addDraftMatchingOption(draft: any): void {
    draft.matchingOptions.push(`Answer ${draft.matchingOptions.length + 1}`);
  }

  removeDraftMatchingOption(draft: any, index: number): void {
    if (!draft?.matchingOptions || draft.matchingOptions.length <= 2) {
      return;
    }
    const removed = draft.matchingOptions[index];
    draft.matchingOptions.splice(index, 1);
    draft.matchingCorrect = draft.matchingCorrect.map((answer: string) => answer === removed ? "" : answer);
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

  removeDraftQuestion(tempId: number): void {
    this.draftQuestions = this.draftQuestions.filter((question) => question.tempId !== tempId);
    this.selectedCanvasDraftIds = this.selectedCanvasDraftIds.filter((id) => id !== Number(tempId));
    if (!this.hasCanvasQuestions()) {
      this.canvasSelectionMode = false;
    }
    this.persistQuizDraftToStorage();
  }

  saveDraftQuestion(draft: any): void {
    this.clearMessages();

    if (!this.selectedCourseId) {
      this.errorMessage = "Please select a course first.";
      return;
    }

    let payload: any;
    try {
      payload = this.buildQuestionPayloadFrom(draft);
    } catch (error) {
      draft.errorMessage = String(error);
      return;
    }

    draft.saving = true;
    draft.errorMessage = "";
    this.lecturerService.addQuestionBank(payload).subscribe({
      next: (response) => {
        const newId = Number(response?.questionBankId);
        if (newId && !this.selectedQuestionIds.includes(newId)) {
          this.selectedQuestionIds = [...this.selectedQuestionIds, newId];
        }
        this.draftQuestions = this.draftQuestions.filter((question) => question.tempId !== draft.tempId);
        this.persistQuizDraftToStorage();
        this.statusMessage = "Question saved and added to quiz.";
        this.loadQuestionBank();
      },
      error: (error) => {
        draft.errorMessage = error?.error?.message ?? "Failed to save question.";
        draft.saving = false;
      }
    });
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
          this.persistQuizDraftToStorage();
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

  onImportQuestionFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.importQuestionFile = input.files?.[0] ?? null;
    this.importStatusMessage = "";
    this.importErrorMessage = "";
    if (this.importQuestionFile) {
      this.importQuestionsFromFile();
    }
  }

  openPdfQuestionGenerator(): void {
    this.clearMessages();
    this.importStatusMessage = "";
    this.importErrorMessage = "";
    if (!this.selectedCourseId) {
      this.importErrorMessage = "Please select a course before generating questions from PDF.";
      this.errorMessage = this.importErrorMessage;
      return;
    }
    this.importQuestionFileInput?.nativeElement.click();
  }

  importQuestionsFromFile(): void {
    this.clearMessages();
    this.importStatusMessage = "";
    this.importErrorMessage = "";
    if (!this.selectedCourseId) {
      this.importErrorMessage = "Please select a course before importing questions.";
      return;
    }
    if (!this.importQuestionFile) {
      this.importErrorMessage = "Please choose a Word, PDF, or text file.";
      return;
    }

    const formData = new FormData();
    formData.append("courseId", String(this.selectedCourseId));
    formData.append("file", this.importQuestionFile);
    formData.append("questionCount", "20");
    formData.append("difficultyLevel", "MEDIUM");
    formData.append("topicTag", this.currentCourse()?.title || "General");

    this.importingQuestions = true;
    this.lecturerService.importQuestionBank(formData).subscribe({
      next: (response) => {
        const generatedQuestions = Array.isArray(response?.questions)
          ? response.questions
            .map((item: any) => this.normalizeQuestionBankItem(item))
            .filter((item: any) => this.asQuestionBankId(item?.questionBankId) !== null)
          : [];
        const generatedIds = generatedQuestions
          .map((item: any) => this.asQuestionBankId(item.questionBankId))
          .filter((id: number | null): id is number => id !== null);
        const generatedCount = Number(response?.generatedCount ?? generatedIds.length);
        const typeSummary = this.importedQuestionTypeSummary(generatedQuestions);
        this.importStatusMessage = response?.message
          ? `${response.message}${typeSummary ? " " + typeSummary : ""}`
          : `${this.questionCountLabel(generatedCount || generatedIds.length)} generated from PDF.${typeSummary ? " " + typeSummary : ""}`;
        this.statusMessage = this.importStatusMessage;
        this.importingQuestions = false;
        this.importQuestionFile = null;
        this.questionFilters = {
          topicTag: "",
          difficultyLevel: "",
          questionType: "",
          createdFrom: "",
          createdTo: "",
          search: ""
        };
        if (generatedQuestions.length > 0) {
          const existing = new Map(this.questionBank.map((item) => [this.asQuestionBankId(item.questionBankId), item]));
          generatedQuestions.forEach((item: any) => existing.set(this.asQuestionBankId(item.questionBankId), item));
          this.questionBank = Array.from(existing.values());
        }
        if (this.isQuestionsMode() && generatedIds.length > 0) {
          this.selectedQuestionIds = Array.from(new Set([...this.selectedQuestionIds, ...generatedIds]));
          this.persistQuizDraftToStorage();
        }
        if (this.importQuestionFileInput?.nativeElement) {
          this.importQuestionFileInput.nativeElement.value = "";
        }
        this.loadQuestionBank();
      },
      error: (error) => {
        this.importErrorMessage = this.extractApiMessage(error, "Failed to import questions.");
        this.errorMessage = this.importErrorMessage;
        this.importingQuestions = false;
      }
    });
  }

  exportQuizBackup(quizId?: number): void {
    this.clearMessages();
    this.quizTransferStatusMessage = "";
    this.quizTransferErrorMessage = "";
    const selectedQuizId = quizId ?? (this.quizExportSelection === "ALL" ? undefined : Number(this.quizExportSelection));
    if (!selectedQuizId && !this.selectedCourseId) {
      this.quizTransferErrorMessage = "Please select a course before exporting quizzes.";
      return;
    }

    this.quizExporting = true;
    this.lecturerService.exportQuizzes({
      courseId: selectedQuizId ? undefined : this.selectedCourseId ?? undefined,
      quizId: selectedQuizId
    }).subscribe({
      next: (blob) => {
        const fileName = selectedQuizId
          ? `edusim-quiz-${selectedQuizId}-backup.csv`
          : `edusim-course-${this.selectedCourseId}-quizzes-backup.csv`;
        this.downloadBlob(blob, fileName);
        this.quizTransferStatusMessage = "Quiz export downloaded.";
        this.quizExporting = false;
      },
      error: (error) => {
        this.quizTransferErrorMessage = this.extractApiMessage(error, "Failed to export quiz backup.");
        this.quizExporting = false;
      }
    });
  }

  deleteQuestion(questionBankId: number): void {
    this.clearMessages();
    const normalizedId = this.asQuestionBankId(questionBankId);
    if (normalizedId === null) {
      return;
    }
    const item = this.questionBank.find((question) => this.asQuestionBankId(question.questionBankId) === normalizedId);
    this.deleteConfirm = {
      kind: "question",
      id: normalizedId,
      title: "Delete question?",
      message: `This will remove "${String(item?.prompt ?? "this question")}" from the question bank.`
    };
  }

  deleteSelectedQuestions(): void {
    this.clearMessages();
    const ids = Array.from(new Set(
      this.selectedQuestionIds
        .map((id) => this.asQuestionBankId(id))
        .filter((id: number | null): id is number => id !== null)
    ));
    if (ids.length === 0) {
      this.errorMessage = "Please select at least one question to delete.";
      return;
    }

    this.deleteConfirm = {
      kind: "questions",
      id: ids[0],
      ids,
      title: ids.length === 1 ? "Delete selected question?" : "Delete selected questions?",
      message: `This will remove ${ids.length} selected question${ids.length === 1 ? "" : "s"} from the question bank.`
    };
  }

  createQuiz(closeAfterSave = false, displayAfterSave = false): void {
    this.clearMessages();

    const validation = this.validateQuizSettings();
    if (validation) {
      this.showQuizValidationMessage(validation);
      return;
    }

    this.onTimeLimitPartChange();

    const questionBankIds = Array.from(new Set(
      this.selectedQuestionIds
        .map((id) => this.asQuestionBankId(id))
        .filter((id: number | null): id is number => id !== null)
    ));
    let questions: any[] = [];
    try {
      questions = this.draftQuestions.map((draft) => this.buildQuestionPayloadFrom(draft));
    } catch (error) {
      this.errorMessage = String(error);
      return;
    }
    if (questionBankIds.length === 0 && questions.length === 0) {
      this.errorMessage = "Please select at least one question before creating quiz.";
      return;
    }
    if (this.needsMixedQuestionWarning(questionBankIds)) {
      this.errorMessage = "Please include mixed question types before creating quiz.";
      return;
    }

    const openAt = this.combineDateTime(this.quizForm.openDate, this.quizForm.openTime);
    const closeAt = this.combineDateTime(this.quizForm.closeDate, this.quizForm.closeTime);
    let resultReleaseAt = this.resultReleaseAtForTiming(closeAt);

    if (!closeAt) {
      this.errorMessage = "Due date/time is required for quiz.";
      return;
    }

    if (this.quizForm.reviewTiming === "AFTER_DUE_DATE" && resultReleaseAt) {
      resultReleaseAt = this.ensureValidResultReleaseAt(openAt, closeAt, resultReleaseAt);
    }

    this.savingQuiz = true;
    const payload = {
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
      showResultImmediately: this.quizForm.reviewTiming === "IMMEDIATE_AFTER_SUBMISSION",
      reviewTiming: this.quizForm.reviewTiming,
      showScoreAfterSubmission: this.quizForm.showScoreBreakdown,
      showScoreBreakdown: this.quizForm.showScoreBreakdown,
      showSelectedAnswer: this.quizForm.showSelectedAnswer,
      showCorrectAnswer: this.quizForm.showCorrectAnswer,
      showExplanation: this.quizForm.showExplanation,
      showRelatedConcept: this.quizForm.showRelatedConcept,
      showLearningRecommendation: this.quizForm.showLearningRecommendation,
      showConfidence: this.quizForm.showConfidence,
      showStudentAnswerReview: this.quizForm.showSelectedAnswer,
      openAt,
      closeAt,
      resultReleaseAt,
      questionBankIds,
      questions,
      autoSelect: null
    };
    const editingQuizId = this.asQuestionBankId(this.editingQuizId);
    const saveRequest = editingQuizId
      ? this.lecturerService.updateQuiz(editingQuizId, payload)
      : this.lecturerService.createQuiz(payload);

    saveRequest.subscribe({
      next: (response: any) => {
        const successMessage = String(response?.message ?? (editingQuizId ? "Quiz successfully updated." : "Quiz successfully created."));
        this.showStatusMessage(successMessage);
        if (closeAfterSave) {
          this.statusMessage = `${editingQuizId ? "Quiz successfully updated" : "Quiz successfully created"}. Returning to course management.`;
        } else if (displayAfterSave) {
          this.statusMessage = "Quiz settings saved. Opening Questions page.";
        } else {
          this.statusMessage = editingQuizId
            ? "Quiz successfully updated. Opening Quiz List."
            : "Quiz successfully created. Opening Quiz List.";
        }
        this.selectedQuestionIds = [];
        this.draftQuestions = [];
        this.editingQuizId = null;
        this.clearQuizDraftStorage();
        this.skipPersistOnDestroy = true;
        this.refreshQuizList();
        this.savingQuiz = false;
        if (closeAfterSave) {
          this.returnToCourseManagement();
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
          return;
        }
        this.router.navigate(["/lecturer/quiz-overview"], {
          queryParams: {
            courseId: this.selectedCourseId ?? null
          }
        });
      },
      error: (error) => {
        this.errorMessage = this.extractApiMessage(error, "Failed to save quiz");
        this.savingQuiz = false;
      }
    });
  }

  saveSettingsAndReturn(): void {
    this.clearMessages();

    const validation = this.validateQuizSettings();
    if (validation) {
      this.showQuizValidationMessage(validation);
      return;
    }

    this.onTimeLimitPartChange();

    const closeAt = this.combineDateTime(this.quizForm.closeDate, this.quizForm.closeTime);
    let resultReleaseAt = this.resultReleaseAtForTiming(closeAt);

    if (!closeAt) {
      this.errorMessage = "Due date/time is required for quiz.";
      this.openSettingsSection("timing");
      return;
    }

    if (this.quizForm.reviewTiming === "AFTER_DUE_DATE" && resultReleaseAt) {
      const openAt = this.combineDateTime(this.quizForm.openDate, this.quizForm.openTime);
      resultReleaseAt = this.ensureValidResultReleaseAt(openAt, closeAt, resultReleaseAt);
    }

    if (!this.persistQuizDraftToStorage()) {
      this.errorMessage = "Unable to save quiz settings in this browser. Please try again.";
      return;
    }

    this.statusMessage = "Quiz settings saved as draft. Returning to course management.";
    this.returnToCourseManagement();
  }

  saveSettingsDraft(): void {
    this.clearMessages();

    const validation = this.validateQuizSettings();
    if (validation) {
      this.showQuizValidationMessage(validation);
      return;
    }

    this.onTimeLimitPartChange();

    if (!this.combineDateTime(this.quizForm.closeDate, this.quizForm.closeTime)) {
      this.errorMessage = "Due date/time is required for quiz.";
      this.openSettingsSection("timing");
      return;
    }

    if (!this.persistQuizDraftToStorage()) {
      this.errorMessage = "Unable to save quiz settings in this browser. Please try again.";
      return;
    }

    this.statusMessage = "Quiz draft saved.";
  }

  saveBuilderDraft(): void {
    this.clearMessages();
    const validation = this.validateQuizSettings();
    if (validation) {
      this.showQuizValidationMessage(validation);
      return;
    }
    if (!this.persistQuizDraftToStorage()) {
      this.errorMessage = "Unable to save quiz draft in this browser. Please try again.";
      return;
    }
    this.statusMessage = "Quiz draft saved.";
  }

  saveQuickControls(): void {
    this.clearMessages();

    const passingMark = this.toNonNegativeInt(this.quizForm.passingMark);
    const maxAttempts = this.toNonNegativeInt(this.quizForm.maxAttempts);
    const timeLimitMinutes = this.toNonNegativeInt(this.quizForm.timeLimitMinutes);

    if (passingMark > 100) {
      this.errorMessage = "Passing percentage must be between 0 and 100.";
      return;
    }

    if (maxAttempts < 1) {
      this.errorMessage = "Allowed attempts must be at least 1.";
      return;
    }

    if (timeLimitMinutes < 1) {
      this.errorMessage = "Time limit must be at least 1 minute.";
      return;
    }

    this.quizForm.passingMark = passingMark;
    this.quizForm.maxAttempts = maxAttempts;
    this.quizForm.timeLimitMinutes = timeLimitMinutes;
    this.syncTimeLimitPartsFromMinutes();
    this.persistQuickControlsToStorage();

    if (this.selectedCourseId) {
      this.persistQuizDraftToStorage();
    }

    this.statusMessage = "Quick controls saved.";
  }

  toggleSettingsHelp(event: Event, key: SettingsHelpKey): void {
    event.preventDefault();
    event.stopPropagation();
    this.activeSettingsHelp = this.activeSettingsHelp === key ? null : key;
  }

  isSettingsHelpOpen(key: SettingsHelpKey): boolean {
    return this.activeSettingsHelp === key;
  }

  quickSettingsHelp(key: SettingsHelpKey): string {
    return this.quickSettingsHelpText[key];
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

  releaseQuizResult(quiz: any): void {
    this.clearMessages();
    this.lecturerService.releaseQuizResult(Number(quiz.quizId)).subscribe({
      next: () => {
        this.statusMessage = `Results released for ${quiz.title}.`;
        this.refreshQuizList();
      },
      error: (error) => this.errorMessage = this.extractApiMessage(error, "Failed to release quiz result")
    });
  }

  deleteQuiz(quizId: number, quizTitle = "this quiz"): void {
    this.clearMessages();
    const normalizedId = Number(quizId);
    if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
      return;
    }
    this.deleteConfirm = {
      kind: "quiz",
      id: normalizedId,
      title: "Delete quiz?",
      message: `This will permanently delete "${quizTitle}".`
    };
  }

  cancelDeleteConfirm(): void {
    this.deleteConfirm = null;
  }

  confirmDelete(): void {
    if (!this.deleteConfirm) {
      return;
    }

    const target = this.deleteConfirm;
    this.deleteConfirm = null;
    this.clearMessages();

    if (target.kind === "question") {
      this.lecturerService.deleteQuestionBank(target.id).subscribe({
        next: () => {
          this.showStatusMessage("Question removed from question bank.");
          this.selectedQuestionIds = this.selectedQuestionIds.filter((id) => id !== target.id);
          this.loadQuestionBank();
        },
        error: (error) => this.errorMessage = error?.error?.message ?? "Failed to remove question"
      });
      return;
    }

    if (target.kind === "questions") {
      const ids = target.ids?.length ? target.ids : [target.id];
      forkJoin(ids.map((id) => this.lecturerService.deleteQuestionBank(id))).subscribe({
        next: () => {
          this.showStatusMessage(`${ids.length} question${ids.length === 1 ? "" : "s"} removed from question bank.`);
          const deleted = new Set(ids);
          this.selectedQuestionIds = this.selectedQuestionIds.filter((id) => !deleted.has(id));
          this.loadQuestionBank();
        },
        error: (error) => this.errorMessage = error?.error?.message ?? "Failed to remove selected questions"
      });
      return;
    }

    this.lecturerService.deleteQuiz(target.id).subscribe({
      next: () => {
        this.statusMessage = "Quiz deleted.";
        this.refreshQuizList();
      },
      error: (error) => this.errorMessage = error?.error?.detail ?? error?.error?.message ?? "Failed to delete quiz"
    });
  }

  cancelDraft(): void {
    this.selectedQuestionIds = [];
    this.draftQuestions = [];
    this.editingQuizId = null;
    this.quizForm = this.defaultQuizForm();
    this.clearQuizDraftStorage();
    this.statusMessage = "Draft cleared.";
    this.errorMessage = "";
  }

  cancelSettingsDraft(): void {
    this.cancelDraft();
    this.skipPersistOnDestroy = true;
    this.returnToCourseManagement();
  }

  createQuizAndDisplay(): void {
    this.clearMessages();

    const validation = this.validateQuizSettings();
    if (validation) {
      this.showQuizValidationMessage(validation);
      return;
    }

    this.onTimeLimitPartChange();

    const openAt = this.combineDateTime(this.quizForm.openDate, this.quizForm.openTime);
    const closeAt = this.combineDateTime(this.quizForm.closeDate, this.quizForm.closeTime);
    let resultReleaseAt = this.resultReleaseAtForTiming(closeAt);

    if (!closeAt) {
      this.errorMessage = "Due date/time is required for quiz.";
      return;
    }

    if (this.quizForm.reviewTiming === "AFTER_DUE_DATE" && resultReleaseAt) {
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

  publishQuizFromSettings(): void {
    this.quizForm.published = true;
    this.createQuiz(false, false);
  }

  quizDurationLabel(): string {
    if (this.isBlank(this.quizForm.timeLimitMinutes)) {
      return "-";
    }
    const minutes = this.toNonNegativeInt(this.quizForm.timeLimitMinutes);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
  }

  quizReleaseSummary(): string {
    return this.reviewTimingLabel(this.quizForm);
  }

  quizMarkSummary(): string {
    if (this.isBlank(this.quizForm.gradeOut)) {
      return "-";
    }
    const marks = Number(this.quizForm.gradeOut ?? 0);
    return `${marks} point${marks === 1 ? "" : "s"}`;
  }

  questionTypeShortLabel(type: QuestionType | string): string {
    const labels: Record<string, string> = {
      MCQ: "MCQ",
      MULTI_SELECT: "MSQ",
      TRUE_FALSE: "TF",
      MATCHING: "MAT",
      SHORT_ANSWER: "TXT"
    };
    return labels[String(type)] ?? "Q";
  }

  questionTypeCountLabel(item: any): string {
    const type = String(item?.questionType ?? "");
    if (type === "MATCHING") {
      const pairs = Array.isArray(item?.matchingPairs) ? item.matchingPairs.length : 0;
      return `${pairs || 1} match${pairs === 1 ? "" : "es"}`;
    }
    if (type === "TRUE_FALSE") {
      return "2 options";
    }
    const options = this.questionOptionPreview(item).length;
    return `${options || 1} option${options === 1 ? "" : "s"}`;
  }

  setResultReleaseMode(immediate: boolean): void {
    this.setReviewTiming(immediate ? "IMMEDIATE_AFTER_SUBMISSION" : "AFTER_DUE_DATE");
  }

  setReviewTiming(timing: ReviewTiming): void {
    this.normalizeQuizDateTimeFields();
    this.quizForm.reviewTiming = timing;
    this.quizForm.showResultImmediately = timing === "IMMEDIATE_AFTER_SUBMISSION";
    if (timing === "AFTER_DUE_DATE") {
      this.quizForm.resultReleaseDate = this.quizForm.closeDate || this.defaultDueDate();
      this.quizForm.resultReleaseTime = this.quizForm.closeTime || "23:59";
    }
  }

  setQuizDateField(field: "openDate" | "closeDate" | "resultReleaseDate", value: string): void {
    this.quizForm[field] = this.normalizeDateInput(value);
    if (field === "closeDate" && this.quizForm.reviewTiming === "AFTER_DUE_DATE") {
      this.quizForm.resultReleaseDate = this.quizForm.closeDate;
    }
    this.persistQuizDraftToStorage();
  }

  setQuizTimeField(field: "openTime" | "closeTime" | "resultReleaseTime", value: string): void {
    this.quizForm[field] = this.normalizeTimeInput(value);
    if (field === "closeTime" && this.quizForm.reviewTiming === "AFTER_DUE_DATE") {
      this.quizForm.resultReleaseTime = this.quizForm.closeTime;
    }
    this.persistQuizDraftToStorage();
  }

  reviewTimingLabel(quiz: any): string {
    const timing = String(quiz?.reviewTiming ?? (quiz?.showResultImmediately ? "IMMEDIATE_AFTER_SUBMISSION" : "AFTER_DUE_DATE"));
    if (!timing) {
      return "Not set";
    }
    const labels: Record<string, string> = {
      IMMEDIATE_AFTER_SUBMISSION: "Immediate",
      AFTER_DUE_DATE: "After due date",
      MANUAL_RELEASE: "Manual release",
      HIDDEN: "Hidden"
    };
    return labels[timing] ?? timing;
  }

  canReleaseQuizResult(quiz: any): boolean {
    return String(quiz?.reviewTiming ?? "") === "MANUAL_RELEASE" && !Boolean(quiz?.manualReleaseStatus);
  }

  onTimeLimitPartChange(): void {
    const hoursBlank = this.isBlank(this.quizForm.timeLimitHours);
    const minutesBlank = this.isBlank(this.quizForm.timeLimitPartMinutes);
    if (hoursBlank && minutesBlank) {
      this.quizForm.timeLimitHours = "";
      this.quizForm.timeLimitPartMinutes = "";
      this.quizForm.timeLimitMinutes = "";
      return;
    }

    const hours = hoursBlank ? 0 : this.toNonNegativeInt(this.quizForm.timeLimitHours);
    const minutes = minutesBlank ? 0 : Math.min(59, this.toNonNegativeInt(this.quizForm.timeLimitPartMinutes));
    const total = (hours * 60) + minutes;

    this.quizForm.timeLimitHours = hoursBlank ? "" : hours;
    this.quizForm.timeLimitPartMinutes = minutesBlank ? "" : minutes;
    this.quizForm.timeLimitMinutes = total > 0 ? total : "";
  }

  onTimeLimitMinutesChange(): void {
    this.syncTimeLimitPartsFromMinutes();
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

  settingsSectionStatus(section: SettingsSection): "complete" | "error" | "pending" {
    if (section === "general") {
      const hasTitle = this.quizForm.title.trim().length > 0;
      const validGrade = Number(this.quizForm.gradeOut) > 0;
      if (!hasTitle || !validGrade) {
        return "error";
      }
      return "complete";
    }

    if (section === "timing") {
      const hasCloseAt = !!this.combineDateTime(this.quizForm.closeDate, this.quizForm.closeTime);
      const validTimeLimit = this.toNonNegativeInt(this.quizForm.timeLimitMinutes) > 0;
      if (!hasCloseAt || !validTimeLimit) {
        return "error";
      }
      return "complete";
    }

    const passingMark = this.toNonNegativeInt(this.quizForm.passingMark);
    const maxAttempts = this.toNonNegativeInt(this.quizForm.maxAttempts);
    if (passingMark > 100 || maxAttempts < 1) {
      return "error";
    }
    return "complete";
  }

  settingsSectionStatusLabel(section: SettingsSection): string {
    return this.settingsSectionStatus(section) === "error" ? "!" : "OK";
  }

  reviewPublishStepComplete(): boolean {
    const settingsComplete = (["general", "timing", "grade"] as SettingsSection[])
      .every((section) => this.settingsSectionStatus(section) === "complete");
    const questionCount = this.selectedQuestions().length + this.draftQuestions.length;
    return settingsComplete && questionCount > 0;
  }

  openSettingsSection(section: SettingsSection): void {
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
        this.persistQuizDraftToStorage();
      }
      return;
    }
    this.selectedQuestionIds = this.selectedQuestionIds.filter((id) => id !== normalizedId);
    this.persistQuizDraftToStorage();
  }

  removeSelectedQuestion(questionId: number): void {
    const normalizedId = this.asQuestionBankId(questionId);
    if (normalizedId === null) {
      return;
    }
    this.selectedQuestionIds = this.selectedQuestionIds.filter((id) => id !== normalizedId);
    this.selectedCanvasQuestionIds = this.selectedCanvasQuestionIds.filter((id) => id !== normalizedId);
    if (!this.hasCanvasQuestions()) {
      this.canvasSelectionMode = false;
    }
    this.persistQuizDraftToStorage();
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
    this.persistQuizDraftToStorage();
  }

  repaginateSelectedQuestions(): void {
    const selectedSet = new Set(this.selectedQuestionIds);
    const ordered = this.questionBank
      .filter((item) => selectedSet.has(Number(item.questionBankId)))
      .map((item) => Number(item.questionBankId));
    if (ordered.length > 0) {
      this.selectedQuestionIds = ordered;
      this.persistQuizDraftToStorage();
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

  toggleCanvasSelectionMode(): void {
    if (!this.hasCanvasQuestions()) {
      return;
    }
    this.canvasSelectionMode = !this.canvasSelectionMode;
    if (!this.canvasSelectionMode) {
      this.clearCanvasSelection();
    }
    this.statusMessage = this.canvasSelectionMode
      ? "Select questions to delete from this quiz."
      : "Question selection cancelled.";
    this.errorMessage = "";
  }

  clearCanvasSelection(): void {
    this.selectedCanvasDraftIds = [];
    this.selectedCanvasQuestionIds = [];
  }

  canvasSelectionCount(): number {
    return this.selectedCanvasDraftIds.length + this.selectedCanvasQuestionIds.length;
  }

  isCanvasDraftSelected(tempId: number): boolean {
    return this.selectedCanvasDraftIds.includes(Number(tempId));
  }

  isCanvasQuestionSelected(questionId: number): boolean {
    const normalizedId = this.asQuestionBankId(questionId);
    return normalizedId === null ? false : this.selectedCanvasQuestionIds.includes(normalizedId);
  }

  toggleCanvasDraftSelection(tempId: number, checked: boolean): void {
    const normalizedId = Number(tempId);
    if (!Number.isFinite(normalizedId)) {
      return;
    }
    this.selectedCanvasDraftIds = checked
      ? Array.from(new Set([...this.selectedCanvasDraftIds, normalizedId]))
      : this.selectedCanvasDraftIds.filter((id) => id !== normalizedId);
  }

  toggleCanvasQuestionSelection(questionId: number, checked: boolean): void {
    const normalizedId = this.asQuestionBankId(questionId);
    if (normalizedId === null) {
      return;
    }
    this.selectedCanvasQuestionIds = checked
      ? Array.from(new Set([...this.selectedCanvasQuestionIds, normalizedId]))
      : this.selectedCanvasQuestionIds.filter((id) => id !== normalizedId);
  }

  areAllCanvasQuestionsSelected(): boolean {
    return this.hasCanvasQuestions() && this.canvasSelectionCount() === this.canvasQuestionCount();
  }

  toggleSelectAllCanvasQuestions(): void {
    if (this.areAllCanvasQuestionsSelected()) {
      this.clearCanvasSelection();
      return;
    }
    this.selectedCanvasDraftIds = this.draftQuestions
      .map((draft) => Number(draft.tempId))
      .filter((id) => Number.isFinite(id));
    this.selectedCanvasQuestionIds = [...this.selectedQuestionIds];
  }

  deleteSelectedCanvasQuestions(): void {
    const selectedDrafts = new Set(this.selectedCanvasDraftIds);
    const selectedQuestions = new Set(this.selectedCanvasQuestionIds);
    const total = selectedDrafts.size + selectedQuestions.size;
    if (total === 0) {
      this.errorMessage = "Please select at least one question to delete.";
      return;
    }

    this.draftQuestions = this.draftQuestions.filter((draft) => !selectedDrafts.has(Number(draft.tempId)));
    this.selectedQuestionIds = this.selectedQuestionIds.filter((id) => !selectedQuestions.has(id));
    this.clearCanvasSelection();
    this.canvasSelectionMode = this.hasCanvasQuestions();
    this.persistQuizDraftToStorage();
    this.showStatusMessage(`${total} question${total === 1 ? "" : "s"} removed from this quiz.`);
  }

  saveMaximumGrade(): void {
    this.statusMessage = `Maximum grade set to ${Number(this.quizForm.gradeOut || 0).toFixed(2)}.`;
    this.errorMessage = "";
  }

  clearSelectedQuestions(): void {
    this.selectedQuestionIds = [];
    this.draftQuestions = [];
    this.clearCanvasSelection();
    this.canvasSelectionMode = false;
    this.persistQuizDraftToStorage();
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

  canvasQuestionCount(): number {
    return this.selectedQuestions().length + this.draftQuestions.length;
  }

  hasCanvasQuestions(): boolean {
    return this.canvasQuestionCount() > 0;
  }

  selectedQuestionTypeCount(ids = this.selectedQuestionIds): number {
    const types = new Set(
      ids
        .map((id) => this.questionBank.find((item) => this.asQuestionBankId(item.questionBankId) === id)?.questionType)
        .filter(Boolean)
    );
    return types.size;
  }

  availableQuestionTypeCount(): number {
    return new Set(this.questionBank.map((item) => item.questionType).filter(Boolean)).size;
  }

  selectedQuestionTypeSummary(): string {
    const counts = new Map<string, number>();
    for (const question of this.selectedQuestions()) {
      const type = String(question?.questionType ?? "");
      if (type) {
        counts.set(type, (counts.get(type) ?? 0) + 1);
      }
    }
    for (const question of this.draftQuestions) {
      const type = String(question?.questionType ?? "");
      if (type) {
        counts.set(type, (counts.get(type) ?? 0) + 1);
      }
    }

    if (counts.size === 0) {
      return "No question types selected yet";
    }

    return Array.from(counts.entries())
      .map(([type, count]) => `${this.questionTypeLabel(type)}: ${count}`)
      .join(" | ");
  }

  needsMixedQuestionWarning(ids = this.selectedQuestionIds): boolean {
    const types = new Set<string>();
    ids
      .map((id) => this.questionBank.find((item) => this.asQuestionBankId(item.questionBankId) === id)?.questionType)
      .filter(Boolean)
      .forEach((type) => types.add(String(type)));
    this.draftQuestions
      .map((question) => question?.questionType)
      .filter(Boolean)
      .forEach((type) => types.add(String(type)));
    return ids.length + this.draftQuestions.length > 1 && this.availableQuestionTypeCount() > 1 && types.size < 2;
  }

  mixSelectedQuestionTypes(): void {
    const candidates = this.questionBank
      .map((item) => ({ ...item, normalizedId: this.asQuestionBankId(item.questionBankId) }))
      .filter((item): item is any & { normalizedId: number } => item.normalizedId !== null);

    if (candidates.length < 2 || this.availableQuestionTypeCount() < 2) {
      this.errorMessage = "Add at least two different question types to the question bank first.";
      this.statusMessage = "";
      return;
    }

    const currentTarget = this.selectedQuestionIds.length || Number(this.quizForm.autoSelectCount ?? 0);
    const targetCount = Math.max(2, Math.min(currentTarget || 5, candidates.length));
    const selectedIds: number[] = [];
    const selectedSet = new Set<number>();

    for (const type of this.questionTypes) {
      const found = candidates.find((item) => item.questionType === type.value && !selectedSet.has(item.normalizedId));
      if (found && selectedIds.length < targetCount) {
        selectedIds.push(found.normalizedId);
        selectedSet.add(found.normalizedId);
      }
    }

    for (const item of candidates) {
      if (selectedIds.length >= targetCount) {
        break;
      }
      if (!selectedSet.has(item.normalizedId)) {
        selectedIds.push(item.normalizedId);
        selectedSet.add(item.normalizedId);
      }
    }

    this.selectedQuestionIds = selectedIds;
    this.statusMessage = `Mixed quiz ready: ${this.selectedQuestionTypeSummary()}.`;
    this.errorMessage = "";
  }

  totalSelectedPoints(): number {
    return this.selectedQuestions().reduce((sum, item) => sum + Number(item.points ?? 0), 0);
  }

  totalCanvasPoints(): number {
    const draftPoints = this.draftQuestions.reduce((sum, item) => sum + Number(item.points ?? 1), 0);
    return this.totalSelectedPoints() + draftPoints;
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

  pagedQuestionBank(): any[] {
    const rows = this.filteredQuestionBank();
    const totalPages = this.questionBankTotalPages(rows.length);
    const page = Math.min(Math.max(this.questionBankPage, 1), totalPages);
    const start = (page - 1) * this.questionBankPageSize;
    return rows.slice(start, start + this.questionBankPageSize);
  }

  questionBankTotalPages(total = this.filteredQuestionBank().length): number {
    return Math.max(1, Math.ceil(total / this.questionBankPageSize));
  }

  questionBankPageNumbers(): number[] {
    const totalPages = this.questionBankTotalPages();
    const maxVisible = 5;
    const half = Math.floor(maxVisible / 2);
    let start = Math.max(1, this.questionBankPage - half);
    const end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  setQuestionBankPage(page: number): void {
    this.questionBankPage = Math.min(Math.max(page, 1), this.questionBankTotalPages());
  }

  previousQuestionBankPage(): void {
    this.setQuestionBankPage(this.questionBankPage - 1);
  }

  nextQuestionBankPage(): void {
    this.setQuestionBankPage(this.questionBankPage + 1);
  }

  onQuestionBankPageSizeChange(): void {
    this.questionBankPage = 1;
  }

  resetQuestionBankPage(): void {
    this.questionBankPage = 1;
  }

  questionBankShowingLabel(): string {
    const total = this.filteredQuestionBank().length;
    if (total === 0) {
      return "Showing 0 of 0 questions";
    }
    const page = Math.min(Math.max(this.questionBankPage, 1), this.questionBankTotalPages(total));
    const start = (page - 1) * this.questionBankPageSize + 1;
    const end = Math.min(start + this.questionBankPageSize - 1, total);
    return `Showing ${start} to ${end} of ${total} questions`;
  }

  questionBankDisplayCode(rowIndex: number): string {
    const page = Math.min(Math.max(this.questionBankPage, 1), this.questionBankTotalPages());
    const displayNumber = (page - 1) * this.questionBankPageSize + rowIndex + 1;
    return `Q${displayNumber}`;
  }

  bankCourseTitle(): string {
    return this.currentCourseTitle() || "Database Management";
  }

  topicOptions(): string[] {
    const values = new Set<string>();
    for (const item of this.questionBank) {
      const topic = String(item?.topicTag ?? "").trim();
      const module = String(item?.moduleTag ?? "").trim();
      if (topic) {
        values.add(topic);
      }
      if (module) {
        values.add(module);
      }
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }

  questionBankDisplayPrompt(item: any): string {
    return String(item?.prompt ?? "").replace(/^\s*Q\s*\d+\s*[:.)-]\s*/i, "");
  }

  difficultyLabel(item: any): string {
    const value = String(item?.difficultyLevel ?? "MEDIUM").toUpperCase();
    if (value === "EASY") {
      return "Beginner";
    }
    if (value === "HARD") {
      return "Advanced";
    }
    return "Intermediate";
  }

  taggedQuestionCount(): number {
    return this.filteredQuestionBank().filter((item) => this.hasQuestionTag(item)).length;
  }

  untaggedQuestionCount(): number {
    return Math.max(0, this.filteredQuestionBank().length - this.taggedQuestionCount());
  }

  exportTaggingReport(): void {
    const rows = this.filteredQuestionBank();
    const header = ["Question ID", "Question", "Type", "Topic Tag", "Module Tag", "Difficulty", "Status", "Tagged"];
    const csvRows = rows.map((item, index) => [
      `Q${index + 1}`,
      this.questionBankDisplayPrompt(item),
      this.questionTypeLabel(item.questionType),
      item.topicTag || "",
      item.moduleTag || "",
      item.difficultyLevel || "",
      item.status || "Ready",
      this.hasQuestionTag(item) ? "Yes" : "No"
    ]);
    const csv = [header, ...csvRows]
      .map((row) => row.map((cell) => this.csvCell(cell)).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `question-bank-tagging-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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

  private hasQuestionTag(item: any): boolean {
    return Boolean(String(item?.topicTag ?? "").trim() || String(item?.moduleTag ?? "").trim());
  }

  private csvCell(value: unknown): string {
    const text = String(value ?? "").replace(/"/g, "\"\"");
    return `"${text}"`;
  }

  isAllVisibleSelected(): boolean {
    const visibleIds = this.filteredQuestionBank()
      .map((item) => this.asQuestionBankId(item.questionBankId))
      .filter((id: number | null): id is number => id !== null);
    if (visibleIds.length === 0) {
      return false;
    }
    return visibleIds.every((id) => this.selectedQuestionIds.includes(id));
  }

  toggleVisibleSelection(checked: boolean): void {
    const visibleIds = this.filteredQuestionBank()
      .map((item) => this.asQuestionBankId(item.questionBankId))
      .filter((id: number | null): id is number => id !== null);
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

  bulkDeleteButtonLabel(): string {
    return this.isAllVisibleSelected() ? "Delete all" : "Delete selected";
  }

  questionTypeLabel(type: QuestionType | string): string {
    return this.questionTypes.find((item) => item.value === type)?.label ?? type;
  }

  importedQuestionTypeSummary(questions: any[]): string {
    const counts = new Map<string, number>();
    for (const question of questions) {
      const type = String(question?.questionType ?? "");
      if (type) {
        counts.set(type, (counts.get(type) ?? 0) + 1);
      }
    }
    if (counts.size === 0) {
      return "";
    }
    return Array.from(counts.entries())
      .map(([type, count]) => `${this.questionTypeLabel(type)}: ${count}`)
      .join(", ");
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

  optionLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }

  canReorderAnswerDetails(item: any): boolean {
    const type = String(item?.questionType ?? "").toUpperCase();
    const options = item?.options;
    return (type === "MCQ" || type === "MULTI_SELECT") && Array.isArray(options) && options.length > 1;
  }

  reorderSavedQuestionAnswer(item: any, index: number, direction: -1 | 1): void {
    if (!this.canReorderAnswerDetails(item)) {
      return;
    }
    const questionId = this.asQuestionBankId(item?.questionBankId);
    if (questionId === null) {
      return;
    }

    const form = this.questionFormFromItem(item);
    if (!this.canMoveArrayItem(form.options, index, direction)) {
      return;
    }

    this.moveArrayItem(form.options, index, direction);
    let payload: any;
    try {
      payload = this.buildQuestionPayloadFrom(form);
    } catch (error) {
      this.errorMessage = String(error);
      return;
    }

    this.lecturerService.updateQuestionBank(questionId, payload).subscribe({
      next: () => {
        item.options = payload.options;
        item.correctAnswer = payload.correctAnswer;
        this.showStatusMessage("Answer order updated.");
        this.loadQuestionBank();
      },
      error: (error) => this.errorMessage = error?.error?.message ?? "Failed to reorder answer options"
    });
  }

  questionAnswerDetails(item: any): Array<{ label: string; text: string; correct: boolean }> {
    const type = String(item?.questionType ?? "").toUpperCase();

    if (type === "MATCHING") {
      const options = item?.options;
      const left = Array.isArray(options?.left) ? options.left : [];
      const right = Array.isArray(options?.right) ? options.right : [];
      const correctMap = item?.correctAnswer && typeof item.correctAnswer === "object" && !Array.isArray(item.correctAnswer)
        ? item.correctAnswer
        : {};
      return left
        .map((prompt: unknown, index: number) => {
          const promptText = String(prompt ?? "").trim();
          const answerText = String(correctMap[promptText] ?? right[index] ?? "").trim();
          return {
            label: `${index + 1}`,
            text: answerText ? `${promptText} -> ${answerText}` : promptText,
            correct: Boolean(promptText && answerText)
          };
        })
        .filter((row: { label: string; text: string; correct: boolean }) => row.text);
    }

    if (type === "SHORT_ANSWER") {
      const answer = this.correctAnswerValues(item)[0] ?? "";
      return answer ? [{ label: "Ans", text: answer, correct: true }] : [];
    }

    const options = type === "TRUE_FALSE"
      ? ["True", "False"]
      : Array.isArray(item?.options)
        ? item.options.map((option: unknown) => typeof option === "object" && option !== null ? String((option as any).text ?? "") : String(option ?? ""))
        : [];
    const correctSet = new Set(this.correctAnswerValues(item).map((answer) => this.normalizeAnswer(answer)));

    return options
      .map((option: string, index: number) => {
        const text = String(option ?? "").trim();
        return {
          label: this.optionLabel(index),
          text,
          correct: correctSet.has(this.normalizeAnswer(text))
        };
      })
      .filter((row: { label: string; text: string; correct: boolean }) => row.text);
  }

  questionOptionPreview(item: any): string[] {
    const type = String(item?.questionType ?? "").toUpperCase();
    const options = item?.options;
    if (type === "TRUE_FALSE") {
      return ["True", "False"];
    }
    if ((type === "MCQ" || type === "MULTI_SELECT") && Array.isArray(options)) {
      return options.map((option) => String(option).trim()).filter(Boolean).slice(0, 4);
    }
    if (type === "MATCHING" && options && typeof options === "object") {
      const left = Array.isArray(options.left) ? options.left : [];
      const right = Array.isArray(options.right) ? options.right : [];
      return left.slice(0, 4).map((prompt: string, index: number) => `${prompt} -> ${right[index] ?? "..."}`);
    }
    if (type === "SHORT_ANSWER") {
      const answer = typeof item?.correctAnswer === "string" ? item.correctAnswer.trim() : "";
      return answer ? [answer] : [];
    }
    return [];
  }

  private correctAnswerValues(item: any): string[] {
    const answer = item?.correctAnswer;
    if (Array.isArray(answer)) {
      return answer.map((value) => String(value ?? "").trim()).filter(Boolean);
    }
    if (answer && typeof answer === "object") {
      return Object.values(answer).map((value) => String(value ?? "").trim()).filter(Boolean);
    }
    const text = String(answer ?? "").trim();
    return text ? [text] : [];
  }

  private normalizeAnswer(value: string): string {
    return String(value ?? "").trim().toLowerCase();
  }

  matchingOptionChoices(): string[] {
    return this.matchingOptionChoicesFor(this.questionForm);
  }

  matchingOptionChoicesFor(form: any): string[] {
    return (form.matchingOptions as string[])
      .map((item: string) => item.trim())
      .filter(Boolean)
      .filter((item: string, index: number, array: string[]) => array.indexOf(item) === index);
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

  private showStatusMessage(message: string): void {
    this.statusMessage = message;
    this.errorMessage = "";
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

  private resultReleaseAtForTiming(closeAt: string | null): string | null {
    if (this.quizForm.reviewTiming === "AFTER_DUE_DATE") {
      return closeAt;
    }
    return null;
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
    const date = this.normalizeDateInput(dateValue);
    const time = this.normalizeTimeInput(timeValue);
    if (!date || !time) {
      return null;
    }
    return `${date}T${time}:00`;
  }

  private datePartFromDateTime(value: unknown): string {
    const text = String(value ?? "").trim();
    const match = text.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s]|$)/);
    return this.normalizeDateInput(match?.[1] ?? text);
  }

  private timePartFromDateTime(value: unknown): string {
    const text = String(value ?? "").trim();
    const match = text.match(/^[\d-]+[T\s](\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)/i);
    return this.normalizeTimeInput(match?.[1] ?? text);
  }

  private normalizeQuizDateTimeFields(): void {
    this.quizForm.openDate = this.normalizeDateInput(this.quizForm.openDate);
    this.quizForm.openTime = this.normalizeTimeInput(this.quizForm.openTime);
    this.quizForm.closeDate = this.normalizeDateInput(this.quizForm.closeDate);
    this.quizForm.closeTime = this.normalizeTimeInput(this.quizForm.closeTime);
    this.quizForm.resultReleaseDate = this.normalizeDateInput(this.quizForm.resultReleaseDate);
    this.quizForm.resultReleaseTime = this.normalizeTimeInput(this.quizForm.resultReleaseTime);
  }

  private normalizeDateInput(value: unknown): string {
    const text = String(value ?? "").trim();
    if (!text) {
      return "";
    }

    const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) {
      return this.formatValidDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    }

    const local = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
    if (local) {
      return this.formatValidDate(Number(local[3]), Number(local[2]), Number(local[1]));
    }

    return "";
  }

  private normalizeTimeInput(value: unknown): string {
    let text = String(value ?? "").trim();
    if (!text) {
      return "";
    }

    text = text.replace(/[–—-]\s*$/, "").trim();
    const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AP]M)?$/i);
    if (!match) {
      return "";
    }

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const meridiem = match[3]?.toUpperCase();

    if (meridiem) {
      if (hours < 1 || hours > 12) {
        return "";
      }
      if (meridiem === "PM" && hours < 12) {
        hours += 12;
      }
      if (meridiem === "AM" && hours === 12) {
        hours = 0;
      }
    }

    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return "";
    }

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  private formatValidDate(year: number, month: number, day: number): string {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
      return "";
    }
    const value = new Date(year, month - 1, day);
    if (value.getFullYear() !== year || value.getMonth() !== month - 1 || value.getDate() !== day) {
      return "";
    }
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  private normalizeReviewTiming(value: unknown): ReviewTiming {
    const timing = String(value ?? "").trim().toUpperCase();
    return timing === "IMMEDIATE_AFTER_SUBMISSION" ||
      timing === "AFTER_DUE_DATE" ||
      timing === "MANUAL_RELEASE" ||
      timing === "HIDDEN"
      ? timing
      : "";
  }

  currentCourse(): any | null {
    return this.courses.find((course) => course.courseId === this.selectedCourseId) ?? null;
  }

  private persistQuizDraftToStorage(): boolean {
    this.normalizeQuizDateTimeFields();
    this.onTimeLimitPartChange();

    const questionIds = Array.from(new Set(
      this.selectedQuestionIds
        .map((id) => this.asQuestionBankId(id))
        .filter((id: number | null): id is number => id !== null)
    ));
    const payload = {
      courseId: this.selectedCourseId,
      editingQuizId: this.editingQuizId,
      questionIds,
      quizForm: this.quizForm,
      draftQuestions: this.draftQuestions.map((draft) => ({
        ...draft,
        saving: false,
        errorMessage: draft?.errorMessage ?? ""
      }))
    };
    try {
      sessionStorage.setItem(this.quizDraftStorageKey, JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }

  private clearQuizDraftStorage(): void {
    try {
      sessionStorage.removeItem(this.quizDraftStorageKey);
    } catch {
      // Ignore unavailable browser storage.
    }
  }

  private hasQuizDraftWork(): boolean {
    const form = this.quizForm ?? {};
    return Boolean(
      this.selectedCourseId ||
      this.selectedQuestionIds.length > 0 ||
      this.draftQuestions.length > 0 ||
      String(form.title ?? "").trim() ||
      String(form.description ?? "").trim() ||
      String(form.openDate ?? "").trim() ||
      String(form.closeDate ?? "").trim() ||
      String(form.gradeOut ?? "").trim()
    );
  }

  private returnToCourseManagement(): void {
    this.router.navigate(["/lecturer/manage"], {
      queryParams: {
        courseId: this.selectedCourseId ?? null
      }
    });
  }

  private persistQuickControlsToStorage(): void {
    const payload = {
      passingMark: this.quizForm.passingMark,
      maxAttempts: this.quizForm.maxAttempts,
      timeLimitMinutes: this.quizForm.timeLimitMinutes,
      showCorrectAnswer: this.quizForm.showCorrectAnswer,
      shuffleQuestions: this.quizForm.shuffleQuestions,
      enableDebugLogs: this.quizForm.enableDebugLogs,
      minimumImportRole: this.quizForm.minimumImportRole
    };

    try {
      localStorage.setItem(this.quickControlsStorageKey, JSON.stringify(payload));
    } catch {
      // Browser storage can be unavailable in private or restricted sessions.
    }
  }

  private restoreQuickControlsFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.quickControlsStorageKey);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return;
      }

      this.quizForm = {
        ...this.quizForm,
        passingMark: this.toNonNegativeInt(parsed.passingMark),
        maxAttempts: Math.max(1, this.toNonNegativeInt(parsed.maxAttempts)),
        timeLimitMinutes: Math.max(1, this.toNonNegativeInt(parsed.timeLimitMinutes)),
        showCorrectAnswer: Boolean(parsed.showCorrectAnswer),
        shuffleQuestions: Boolean(parsed.shuffleQuestions),
        enableDebugLogs: Boolean(parsed.enableDebugLogs),
        minimumImportRole: parsed.minimumImportRole === "LECTURER" ? "LECTURER" : "ADMINISTRATOR"
      };
      if (this.quizForm.passingMark > 100) {
        this.quizForm.passingMark = 100;
      }
      this.syncTimeLimitPartsFromMinutes();
    } catch {
      // Ignore invalid saved quick controls.
    }
  }

  private restoreQuizDraftFromStorage(consumeAfterRestore = true, allowCourseRestore = true): void {
    const raw = sessionStorage.getItem(this.quizDraftStorageKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      const storedCourseId = Number(parsed?.courseId ?? 0);
      const storedEditingQuizId = Number(parsed?.editingQuizId ?? 0);
      const ids: number[] = Array.isArray(parsed?.questionIds)
        ? parsed.questionIds.map((item: unknown) => Number(item)).filter((item: number) => Number.isFinite(item) && item > 0)
        : [];

      if (allowCourseRestore && storedCourseId > 0 && (!this.selectedCourseId || this.selectedCourseId === storedCourseId)) {
        this.selectedCourseId = storedCourseId;
      }
      if (ids.length > 0) {
        this.selectedQuestionIds = Array.from(new Set(ids));
      }
      if (storedEditingQuizId > 0) {
        this.editingQuizId = storedEditingQuizId;
      }
      if (parsed?.quizForm && typeof parsed.quizForm === "object") {
        this.quizForm = {
          ...this.quizForm,
          ...parsed.quizForm
        };
        this.normalizeQuizDateTimeFields();
        this.syncTimeLimitPartsFromMinutes();
      }
      if (Array.isArray(parsed?.draftQuestions)) {
        this.draftQuestions = parsed.draftQuestions
          .filter((item: any) => item && typeof item === "object")
          .map((item: any) => ({
            ...this.defaultQuestionForm(),
            ...item,
            tempId: Number(item.tempId) < 0 ? Number(item.tempId) : this.nextDraftQuestionId--,
            saving: false,
            errorMessage: String(item.errorMessage ?? "")
          }));
        const tempIds = this.draftQuestions.map((item) => Number(item.tempId)).filter((id) => Number.isFinite(id));
        if (tempIds.length > 0) {
          this.nextDraftQuestionId = Math.min(this.nextDraftQuestionId, Math.min(...tempIds) - 1);
        }
      }
    } catch {
      // ignore invalid draft payload
    } finally {
      if (consumeAfterRestore) {
        this.clearQuizDraftStorage();
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

  private syncTimeLimitPartsFromMinutes(): void {
    if (this.isBlank(this.quizForm.timeLimitMinutes)) {
      this.quizForm.timeLimitMinutes = "";
      this.quizForm.timeLimitHours = "";
      this.quizForm.timeLimitPartMinutes = "";
      return;
    }
    const totalMinutes = Math.max(1, this.toNonNegativeInt(this.quizForm.timeLimitMinutes));
    this.quizForm.timeLimitMinutes = totalMinutes;
    this.quizForm.timeLimitHours = Math.floor(totalMinutes / 60);
    this.quizForm.timeLimitPartMinutes = totalMinutes % 60;
  }

  private toNonNegativeInt(value: unknown): number {
    const num = Math.floor(Number(value));
    if (!Number.isFinite(num) || num < 0) {
      return 0;
    }
    return num;
  }

  private isBlank(value: unknown): boolean {
    return value === null || value === undefined || String(value).trim() === "";
  }

  private validateQuizSettings(): QuizValidationResult | null {
    if (!this.selectedCourseId) {
      return { message: "Please select a course first.", section: "general" };
    }
    if (this.isBlank(this.quizForm.title)) {
      return { message: "Quiz name is required.", section: "general" };
    }
    if (this.isBlank(this.quizForm.description)) {
      return { message: "Description / instructions is required.", section: "general" };
    }
    if (this.isBlank(this.quizForm.gradeOut) || Number(this.quizForm.gradeOut) <= 0) {
      return { message: "Grade out of is required.", section: "general" };
    }
    if (this.isBlank(this.quizForm.passingMark) || Number(this.quizForm.passingMark) < 0 || Number(this.quizForm.passingMark) > 100) {
      return { message: "Pass mark must be between 0 and 100.", section: "general" };
    }
    if (this.isBlank(this.quizForm.maxAttempts) || Number(this.quizForm.maxAttempts) < 1) {
      return { message: "Allowed attempts must be at least 1.", section: "general" };
    }
    if (this.isBlank(this.quizForm.openDate) || this.isBlank(this.quizForm.openTime)) {
      return { message: "Open date/time is required for quiz.", section: "timing" };
    }
    if (this.isBlank(this.quizForm.closeDate) || this.isBlank(this.quizForm.closeTime)) {
      return { message: "Due date/time is required for quiz.", section: "timing" };
    }
    if (!this.combineDateTime(this.quizForm.closeDate, this.quizForm.closeTime)) {
      return { message: "Due date/time is required for quiz.", section: "timing" };
    }

    const hours = this.isBlank(this.quizForm.timeLimitHours) ? 0 : this.toNonNegativeInt(this.quizForm.timeLimitHours);
    const minutes = this.isBlank(this.quizForm.timeLimitPartMinutes) ? 0 : this.toNonNegativeInt(this.quizForm.timeLimitPartMinutes);
    if (this.isBlank(this.quizForm.timeLimitHours) && this.isBlank(this.quizForm.timeLimitPartMinutes)) {
      return { message: "Time limit is required.", section: "timing" };
    }
    if ((hours * 60) + minutes < 1) {
      return { message: "Time limit must be at least 1 minute.", section: "timing" };
    }
    if (this.isBlank(this.quizForm.questionDisplayMode)) {
      return { message: "Question display is required.", section: "timing" };
    }
    if (this.isBlank(this.quizForm.reviewTiming)) {
      return { message: "Feedback release timing is required.", section: "grade" };
    }
    if (!this.hasAnyFeedbackVisibilitySelected()) {
      return { message: "Please select at least one feedback visibility option.", section: "grade" };
    }
    return null;
  }

  private showQuizValidationMessage(validation: QuizValidationResult): void {
    this.errorMessage = validation.message;
    this.openSettingsSection(validation.section);
    setTimeout(() => {
      const elementId = validation.section === "general"
        ? "quiz-general-section"
        : validation.section === "timing"
          ? "quiz-timing-section"
          : "quiz-grade-section";
      document.getElementById(elementId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  private hasAnyFeedbackVisibilitySelected(): boolean {
    return Boolean(
      this.quizForm.showSelectedAnswer ||
      this.quizForm.showCorrectAnswer ||
      this.quizForm.showExplanation ||
      this.quizForm.showLearningRecommendation ||
      this.quizForm.showConfidence ||
      this.quizForm.showScoreBreakdown
    );
  }

  private quizSettingsValidationError(): string {
    const validation = this.validateQuizSettings();
    if (validation) {
      return validation.message;
    }
    return "";
  }

  private defaultQuizForm(): any {
    return {
      title: "",
      description: "",
      gradeOut: "",
      openDate: "",
      openTime: "",
      closeDate: "",
      closeTime: "",
      resultReleaseDate: "",
      resultReleaseTime: "",
      timeLimitHours: "",
      timeLimitPartMinutes: "",
      timeLimitMinutes: "",
      maxAttempts: "",
      passingMark: "",
      published: false,
      unlockAfterVideos: false,
      shuffleQuestions: false,
      shuffleAnswers: false,
      questionDisplayMode: "",
      reviewTiming: "" as ReviewTiming,
      showResultImmediately: false,
      showScoreAfterSubmission: false,
      showSelectedAnswer: false,
      showCorrectAnswer: false,
      showExplanation: false,
      showRelatedConcept: false,
      showLearningRecommendation: false,
      showConfidence: false,
      showScoreBreakdown: false,
      showStudentAnswerReview: false,
      enableDebugLogs: false,
      minimumImportRole: "ADMINISTRATOR" as ImportRole,
      autoSelectCount: ""
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

  private applyQuizDetailsToForm(quiz: any, questions: any[] = []): void {
    const feedbackSettings = quiz?.feedbackSettings && typeof quiz.feedbackSettings === "object"
      ? quiz.feedbackSettings
      : {};
    const reviewTiming = this.normalizeReviewTiming(
      quiz?.reviewTiming ?? feedbackSettings.reviewTiming ?? (quiz?.showResultImmediately ? "IMMEDIATE_AFTER_SUBMISSION" : "AFTER_DUE_DATE")
    );
    const gradeOut = Number(quiz?.gradeOut ?? this.sumQuestionPoints(questions));

    this.quizForm = {
      ...this.defaultQuizForm(),
      title: String(quiz?.title ?? ""),
      description: String(quiz?.description ?? ""),
      gradeOut: Number.isFinite(gradeOut) && gradeOut > 0 ? gradeOut : "",
      openDate: this.datePartFromDateTime(quiz?.openAt),
      openTime: this.timePartFromDateTime(quiz?.openAt),
      closeDate: this.datePartFromDateTime(quiz?.closeAt),
      closeTime: this.timePartFromDateTime(quiz?.closeAt),
      resultReleaseDate: this.datePartFromDateTime(quiz?.resultReleaseAt),
      resultReleaseTime: this.timePartFromDateTime(quiz?.resultReleaseAt),
      timeLimitMinutes: this.toNonNegativeInt(quiz?.timeLimitMinutes) || "",
      maxAttempts: this.toNonNegativeInt(quiz?.maxAttempts) || "",
      passingMark: this.toNonNegativeInt(quiz?.passingMark),
      published: Boolean(quiz?.published),
      unlockAfterVideos: Boolean(quiz?.unlockAfterVideos),
      shuffleQuestions: Boolean(quiz?.shuffleQuestions),
      shuffleAnswers: Boolean(quiz?.shuffleAnswers),
      questionDisplayMode: String(quiz?.questionDisplayMode ?? ""),
      reviewTiming,
      showResultImmediately: Boolean(quiz?.showResultImmediately),
      showScoreAfterSubmission: Boolean(feedbackSettings.showScoreAfterSubmission),
      showSelectedAnswer: Boolean(feedbackSettings.showSelectedAnswer),
      showCorrectAnswer: Boolean(feedbackSettings.showCorrectAnswer),
      showExplanation: Boolean(feedbackSettings.showExplanation),
      showRelatedConcept: Boolean(feedbackSettings.showRelatedConcept),
      showLearningRecommendation: Boolean(feedbackSettings.showLearningRecommendation),
      showConfidence: Boolean(feedbackSettings.showConfidence),
      showScoreBreakdown: Boolean(feedbackSettings.showScoreBreakdown),
      showStudentAnswerReview: Boolean(feedbackSettings.showStudentAnswerReview)
    };
    this.syncTimeLimitPartsFromMinutes();
  }

  private sumQuestionPoints(questions: any[]): number {
    return questions.reduce((sum, question) => sum + Math.max(0, Number(question?.points ?? 0)), 0);
  }

  private draftQuestionFromQuizQuestion(question: any): any {
    const form = this.questionFormFromItem({
      ...question,
      topicTag: question?.topicTag ?? question?.topic ?? "",
      moduleTag: (question?.moduleTag ?? this.currentCourseTitle()) || "General"
    });

    return {
      ...form,
      tempId: this.nextDraftQuestionId--,
      saving: false,
      errorMessage: ""
    };
  }

  private questionFormFromItem(item: any): ReturnType<LecturerQuestionBankComponent["defaultQuestionForm"]> {
    const form = this.defaultQuestionForm();
    form.questionType = item.questionType as QuestionType;
    form.difficultyLevel = (item.difficultyLevel || "MEDIUM") as DifficultyLevel;
    form.topicTag = item.topicTag ?? "";
    form.moduleTag = item.moduleTag ?? "";
    form.prompt = item.prompt ?? "";
    form.explanation = item.explanation ?? "";
    form.mediaUrl = item.mediaUrl ?? "";
    form.mediaType = (item.mediaType || "") as MediaType;
    form.points = Number(item.points ?? 1);

    if (form.questionType === "TRUE_FALSE") {
      form.trueFalseCorrect = String(item.correctAnswer ?? "True");
    } else if (form.questionType === "SHORT_ANSWER") {
      form.shortAnswer = typeof item.correctAnswer === "string" ? item.correctAnswer : "";
      const keywords = Array.isArray(item.options?.keywords) ? item.options.keywords : [];
      form.shortAnswerKeywords = keywords.join(", ");
    } else if (form.questionType === "MATCHING") {
      const left = Array.isArray(item.options?.left) ? item.options.left : [];
      const right = Array.isArray(item.options?.right) ? item.options.right : [];
      form.matchingPrompts = left.length ? [...left] : ["", "", "", ""];
      form.matchingOptions = right.length ? [...right] : ["", "", "", ""];
      const map = item.correctAnswer ?? {};
      form.matchingCorrect = form.matchingPrompts.map((prompt: string) => map?.[prompt] ?? "");
      form.scoringType = item.options?.scoringType === "PARTIAL" ? "PARTIAL" : "EXACT";
      form.allowDuplicateResponse = Boolean(item.options?.allowDuplicateResponse);
    } else {
      const options = Array.isArray(item.options) ? item.options : [];
      const correctValues = new Set(
        Array.isArray(item.correctAnswer) ? item.correctAnswer : [item.correctAnswer]
      );
      form.options = options.length
        ? options.map((text: string) => ({ text, correct: correctValues.has(text) }))
        : [{ text: "", correct: true }, { text: "", correct: false }];
    }

    return form;
  }

  private moveArrayItem<T>(items: T[], index: number, direction: -1 | 1): void {
    if (!this.canMoveArrayItem(items, index, direction)) {
      return;
    }
    this.swapArrayItems(items, index, index + direction);
  }

  private canMoveArrayItem(items: unknown[] | undefined, index: number, direction: -1 | 1): boolean {
    if (!Array.isArray(items)) {
      return false;
    }
    const target = index + direction;
    return index >= 0 && target >= 0 && index < items.length && target < items.length;
  }

  private swapArrayItems<T>(items: T[], sourceIndex: number, targetIndex: number): void {
    const source = items[sourceIndex];
    items[sourceIndex] = items[targetIndex];
    items[targetIndex] = source;
  }

  private createDraftQuestion(type: QuestionType): any {
    const course = this.currentCourse();
    const draft = {
      ...this.defaultQuestionForm(),
      tempId: this.nextDraftQuestionId--,
      questionType: type,
      topicTag: course?.title || "General",
      moduleTag: course?.title || "General",
      prompt: "",
      saving: false,
      errorMessage: ""
    };

    if (type === "MULTI_SELECT") {
      draft.options = [
        { text: "Option 1", correct: true },
        { text: "Option 2", correct: true },
        { text: "Option 3", correct: false },
        { text: "Option 4", correct: false }
      ];
    } else if (type === "MCQ") {
      draft.options = [
        { text: "Option 1", correct: true },
        { text: "Option 2", correct: false }
      ];
    } else if (type === "SHORT_ANSWER") {
      draft.shortAnswer = "";
      draft.shortAnswerKeywords = "";
    } else if (type === "MATCHING") {
      draft.matchingPrompts = ["Prompt 1", "Prompt 2"];
      draft.matchingOptions = ["Answer 1", "Answer 2"];
      draft.matchingCorrect = ["Answer 1", "Answer 2"];
    }

    return draft;
  }

  private buildQuestionPayload(): any {
    return this.buildQuestionPayloadFrom(this.questionForm);
  }

  private buildQuestionPayloadFrom(form: any): any {
    if (!form.prompt.trim()) {
      throw new Error("Question text is required.");
    }
    if (!form.topicTag.trim()) {
      throw new Error("Topic tag is required.");
    }

    const basePayload = {
      courseId: this.selectedCourseId,
      questionType: form.questionType,
      difficultyLevel: form.difficultyLevel,
      topicTag: form.topicTag.trim(),
      moduleTag: form.moduleTag.trim() || this.currentCourse()?.title || "General",
      prompt: form.prompt.trim(),
      explanation: form.explanation.trim(),
      mediaUrl: form.mediaUrl.trim(),
      mediaType: form.mediaType || null,
      points: Math.max(1, Number(form.points))
    };

    if (form.questionType === "SHORT_ANSWER") {
      const answer = form.shortAnswer.trim();
      if (!answer) {
        throw new Error("Expected answer is required.");
      }
      const keywords = String(form.shortAnswerKeywords)
        .split(",")
        .map((item: string) => item.trim().toLowerCase())
        .filter(Boolean);
      return {
        ...basePayload,
        options: { keywords },
        correctAnswer: answer.toLowerCase()
      };
    }

    if (form.questionType === "MATCHING") {
      const left = (form.matchingPrompts as string[])
        .map((item: string) => item.trim())
        .filter(Boolean);
      const right = this.matchingOptionChoicesFor(form);

      if (left.length < 2) {
        throw new Error("Please add at least 2 prompts for matching.");
      }
      if (right.length < 2) {
        throw new Error("Please add at least 2 possible answers for matching.");
      }

      const usedAnswers = new Set<string>();
      const correctMap: Record<string, string> = {};
      for (let i = 0; i < form.matchingPrompts.length; i++) {
        const prompt = form.matchingPrompts[i]?.trim();
        if (!prompt) {
          continue;
        }
        const selected = form.matchingCorrect[i]?.trim();
        const chosen = selected || right[i] || "";
        if (!chosen || !right.includes(chosen)) {
          throw new Error("Please set valid correct matching for each prompt.");
        }
        if (!form.allowDuplicateResponse && usedAnswers.has(chosen)) {
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
          allowDuplicateResponse: form.allowDuplicateResponse,
          scoringType: form.scoringType
        },
        correctAnswer: correctMap
      };
    }

    if (form.questionType === "TRUE_FALSE") {
      return {
        ...basePayload,
        options: ["True", "False"],
        correctAnswer: form.trueFalseCorrect
      };
    }

    const options = (form.options as Array<{ text: string; correct: boolean }>)
      .map((option: { text: string; correct: boolean }) => ({ text: option.text.trim(), correct: option.correct }))
      .filter((option: { text: string; correct: boolean }) => option.text);

    if (options.length < 2) {
      throw new Error("Please add at least 2 answers.");
    }

    if (form.questionType === "MULTI_SELECT") {
      const correctAnswers = options
        .filter((option: { text: string; correct: boolean }) => option.correct)
        .map((option: { text: string; correct: boolean }) => option.text);

      if (correctAnswers.length === 0) {
        throw new Error("Select at least one correct answer.");
      }

      return {
        ...basePayload,
        options: options.map((option: { text: string; correct: boolean }) => option.text),
        correctAnswer: correctAnswers
      };
    }

    const correctAnswer = options.find((option: { text: string; correct: boolean }) => option.correct)?.text;
    if (!correctAnswer) {
      throw new Error("Please select one correct answer.");
    }

    return {
      ...basePayload,
      options: options.map((option: { text: string; correct: boolean }) => option.text),
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

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
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
