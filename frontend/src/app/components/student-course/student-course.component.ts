import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { StudentService } from "../../services/student.service";

interface ReflectionRecord {
  videoId: number;
  videoTitle: string;
  confidence: number;
  note: string;
  goal: string;
  updatedAt: string;
}

@Component({
  selector: "app-student-course",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: "./student-course.component.html",
  styleUrl: "./student-course.component.css"
})
export class StudentCourseComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly studentService = inject(StudentService);
  private readonly sanitizer = inject(DomSanitizer);

  courseData: any = null;
  loading = true;
  errorMessage = "";
  selectedVideo: any = null;
  selectedVideoId: number | null = null;
  selectedVideoEmbedUrl: SafeResourceUrl | null = null;
  selectedVideoFileUrl: SafeResourceUrl | null = null;
  videoComments: any[] = [];
  commentsLoading = false;
  commentSubmitting = false;
  commentText = "";
  commentErrorMessage = "";
  commentSuccessMessage = "";
  resourceSectionOpen = false;
  quizSectionOpen = false;
  reflectionConfidence = 3;
  reflectionNote = "";
  reflectionGoal = "";
  reflectionSavedMessage = "";
  readonly confidenceLevels = [1, 2, 3, 4, 5];
  private reflectionRecords: Record<string, ReflectionRecord> = {};
  private progressTrackAt: Record<string, number> = {};

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const courseId = Number(params["id"]);
      if (!courseId) {
        this.router.navigateByUrl("/student/dashboard");
        return;
      }
      this.loadCourse(courseId, this.selectedVideoId ?? undefined);
    });
  }

  loadCourse(courseId: number, preferredVideoId?: number): void {
    this.loading = true;
    this.studentService.course(courseId).subscribe({
      next: (data) => {
        this.courseData = data;
        this.loadReflectionRecords();
        this.applySelectedVideo(preferredVideoId);
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? "Failed to load course";
        this.loading = false;
      }
    });
  }

  completeVideo(videoId: number): void {
    this.studentService.completeVideo(videoId).subscribe({
      next: () => this.loadCourse(this.courseData.course.id, videoId)
    });
  }

  startQuiz(quiz: any): void {
    if (!quiz || quiz.locked || Number(quiz.attemptsRemaining ?? 0) <= 0) {
      return;
    }
    this.router.navigate(["/student/quiz", quiz.quizId], {
      queryParams: { courseId: this.courseData?.course?.id }
    });
  }

  chooseVideo(video: any): void {
    this.selectedVideo = video;
    this.selectedVideoId = video.videoId;
    this.selectedVideoEmbedUrl = this.toEmbedUrl(video.videoUrl);
    this.selectedVideoFileUrl = this.toDirectVideoUrl(video.videoUrl);
    this.commentText = "";
    this.commentErrorMessage = "";
    this.commentSuccessMessage = "";
    this.reflectionSavedMessage = "";
    this.loadReflectionForVideo(video.videoId);
    this.loadVideoComments(video.videoId);
    this.trackLessonTouch(video.videoId);
  }

  totalVideoCount(): number {
    return this.videosInOrder().length;
  }

  selectedVideoPosition(): number {
    const index = this.selectedVideoIndex();
    return index >= 0 ? index + 1 : 0;
  }

  hasPreviousVideo(): boolean {
    return this.selectedVideoIndex() > 0;
  }

  hasNextVideo(): boolean {
    const videos = this.videosInOrder();
    const index = this.selectedVideoIndex();
    return index >= 0 && index < videos.length - 1;
  }

  previousVideo(): void {
    const videos = this.videosInOrder();
    const index = this.selectedVideoIndex();
    if (index <= 0) {
      return;
    }
    this.chooseVideo(videos[index - 1]);
  }

  nextVideo(): void {
    const videos = this.videosInOrder();
    const index = this.selectedVideoIndex();
    if (index < 0 || index >= videos.length - 1) {
      return;
    }
    this.chooseVideo(videos[index + 1]);
  }

  secondaryVideos(): any[] {
    const videos = this.videosInOrder();
    if (!videos.length) {
      return [];
    }
    if (!this.selectedVideoId) {
      return videos;
    }
    return videos.filter((video: any) => Number(video?.videoId ?? 0) !== Number(this.selectedVideoId));
  }

  courseVideos(): any[] {
    return this.videosInOrder();
  }

  openVideo(videoUrl: string): void {
    if (this.selectedVideoId) {
      this.trackLessonProgress(this.selectedVideoId, 35);
    }
    window.open(videoUrl, "_blank", "noopener");
  }

  trackInlineVideoProgress(event: Event): void {
    if (!this.selectedVideoId) {
      return;
    }
    const video = event.target as HTMLVideoElement;
    const duration = Number(video.duration ?? 0);
    const currentTime = Number(video.currentTime ?? 0);
    if (!Number.isFinite(duration) || duration <= 0) {
      return;
    }
    const progress = Math.max(0, Math.min(100, Math.round((currentTime / duration) * 100)));
    this.trackLessonProgress(this.selectedVideoId, progress);
  }

  openMaterial(material: any): void {
    const url = String(material?.resourceUrl ?? "").trim();
    if (this.selectedVideoId) {
      this.studentService.openLessonNotes(this.selectedVideoId).subscribe({
        error: () => undefined
      });
    }
    if (url) {
      window.open(url, "_blank", "noopener");
    }
  }

  canOpenExternalVideo(): boolean {
    return !this.selectedVideoEmbedUrl && !this.selectedVideoFileUrl;
  }

  submitVideoComment(): void {
    if (!this.selectedVideoId) {
      return;
    }

    const text = this.commentText.trim();
    if (!text) {
      this.commentErrorMessage = "Please write a comment first.";
      this.commentSuccessMessage = "";
      return;
    }

    this.commentSubmitting = true;
    this.commentErrorMessage = "";
    this.commentSuccessMessage = "";
    this.studentService.addVideoComment(this.selectedVideoId, text).subscribe({
      next: (response) => {
        const insertedComment = response?.comment;
        if (insertedComment) {
          this.videoComments = [insertedComment, ...this.videoComments];
        } else {
          this.loadVideoComments(this.selectedVideoId as number);
        }
        this.commentText = "";
        this.commentSuccessMessage = "Comment submitted.";
        this.commentSubmitting = false;
      },
      error: (error) => {
        this.commentErrorMessage = error?.error?.message ?? "Failed to submit comment.";
        this.commentSubmitting = false;
      }
    });
  }

  formatCommentDate(value: string | null | undefined): string {
    if (!value) {
      return "-";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  commentCountLabel(): string {
    const total = this.videoComments.length;
    return `${total} comment${total === 1 ? "" : "s"}`;
  }

  setReflectionConfidence(level: number): void {
    this.reflectionConfidence = Math.max(1, Math.min(5, Math.round(level)));
    this.reflectionSavedMessage = "";
  }

  saveReflection(): void {
    if (!this.selectedVideo) {
      return;
    }
    const note = this.reflectionNote.trim();
    const goal = this.reflectionGoal.trim();
    if (!note) {
      this.reflectionSavedMessage = "Write a short reflection before saving.";
      return;
    }
    const record: ReflectionRecord = {
      videoId: Number(this.selectedVideo.videoId),
      videoTitle: String(this.selectedVideo.title ?? "Lesson"),
      confidence: this.reflectionConfidence,
      note,
      goal,
      updatedAt: new Date().toISOString()
    };
    this.reflectionRecords[String(record.videoId)] = record;
    this.persistReflectionRecords();
    this.reflectionSavedMessage = "Reflection saved. Your learning coach has updated the next step.";
  }

  currentReflectionRecord(): ReflectionRecord | null {
    if (!this.selectedVideoId) {
      return null;
    }
    return this.reflectionRecords[String(this.selectedVideoId)] ?? null;
  }

  recentReflections(): ReflectionRecord[] {
    return Object.values(this.reflectionRecords)
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .slice(0, 3);
  }

  openReflectionRecord(record: ReflectionRecord): void {
    const video = this.courseVideos().find(
      (row: any) => Number(row?.videoId ?? 0) === Number(record.videoId)
    );
    if (video) {
      this.chooseVideo(video);
    }
  }

  confidenceLabel(): string {
    if (this.reflectionConfidence <= 2) {
      return "Need review";
    }
    if (this.reflectionConfidence === 3) {
      return "Getting there";
    }
    return "Confident";
  }

  coachReadinessScore(): number {
    const progressPart = this.completionPercent() * 0.5;
    const confidencePart = (this.reflectionConfidence / 5) * 35;
    const reflectionPart = this.currentReflectionRecord() ? 15 : 0;
    return Math.max(0, Math.min(100, Math.round(progressPart + confidencePart + reflectionPart)));
  }

  coachReadinessLabel(): string {
    const score = this.coachReadinessScore();
    if (score < 45) {
      return "Build foundation";
    }
    if (score < 75) {
      return "Almost ready";
    }
    return "Quiz ready";
  }

  coachAdviceTitle(): string {
    if (this.selectedVideo && !this.selectedVideo.completed) {
      return "Finish the active lesson";
    }
    if (!this.currentReflectionRecord()) {
      return "Capture your understanding";
    }
    if (this.hasReadyQuiz()) {
      return "Try the assessment";
    }
    if (this.hasNextPendingLesson()) {
      return "Move to the next lesson";
    }
    return "Review and strengthen";
  }

  coachAdviceBody(): string {
    if (this.selectedVideo && !this.selectedVideo.completed) {
      return "Complete this lesson first, then write one idea you understood and one thing you still need to review.";
    }
    if (!this.currentReflectionRecord()) {
      return "Add a reflection so EduSIM can turn the lesson into a personal study checkpoint.";
    }
    if (this.hasReadyQuiz()) {
      return "Your reflection is saved. Open the quiz when you feel ready, or review your goal first.";
    }
    if (this.hasNextPendingLesson()) {
      return "Continue to the next lesson and keep building your reflection journal.";
    }
    return "All required lessons look complete. Use your saved reflections as revision notes before final assessment.";
  }

  reflectionUpdatedLabel(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    });
  }

  completionPercent(): number {
    const raw = Number(this.courseData?.progress?.percent ?? 0);
    if (!Number.isFinite(raw)) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round(raw)));
  }

  progressSegments(): Array<{ id: number; done: boolean }> {
    const total = 36;
    const doneCount = Math.round((this.completionPercent() / 100) * total);
    return Array.from({ length: total }, (_, index) => ({
      id: index + 1,
      done: index < doneCount
    }));
  }

  nextPendingLesson(): any | null {
    return this.videosInOrder().find((video: any) => !video?.completed) ?? null;
  }

  hasNextPendingLesson(): boolean {
    return this.nextPendingLesson() !== null;
  }

  goToNextLesson(): void {
    const pending = this.nextPendingLesson();
    if (!pending) {
      return;
    }
    this.chooseVideo(pending);
  }

  toggleResourceSection(): void {
    this.resourceSectionOpen = !this.resourceSectionOpen;
  }

  toggleQuizSection(): void {
    this.quizSectionOpen = !this.quizSectionOpen;
  }

  quizStatusKind(quiz: any): "ready" | "completed" | "overdue" | "locked" {
    if (quiz?.alreadySubmitted) {
      return "completed";
    }
    if (this.isQuizOverdue(quiz)) {
      return "overdue";
    }
    if (quiz?.locked || Number(quiz?.attemptsRemaining ?? 0) <= 0) {
      return "locked";
    }
    return "ready";
  }

  quizStatusLabel(quiz: any): string {
    const kind = this.quizStatusKind(quiz);
    if (kind === "completed") {
      return "Completed";
    }
    if (kind === "overdue") {
      return "Overdue";
    }
    if (kind === "locked") {
      return "Locked";
    }
    return "Ready";
  }

  quizActionLabel(quiz: any): string {
    const kind = this.quizStatusKind(quiz);
    if (kind === "ready") {
      return "Attempt Quiz";
    }
    if (kind === "completed") {
      return "Completed";
    }
    if (kind === "overdue") {
      return "Overdue";
    }
    return "Locked";
  }

  isQuizActionDisabled(quiz: any): boolean {
    return this.quizStatusKind(quiz) !== "ready";
  }

  quizStatusNote(quiz: any): string {
    const due = quiz?.closeAt ? this.formatDateTime(quiz.closeAt) : "No due date";
    const kind = this.quizStatusKind(quiz);
    if (kind === "completed") {
      return `Submitted successfully. Due: ${due}`;
    }
    if (kind === "overdue") {
      return `Quiz overdue. Due: ${due}`;
    }
    if (kind === "locked") {
      const reason = String(quiz?.lockReason ?? "").trim() || "Quiz is currently unavailable.";
      return `${reason} Due: ${due}`;
    }
    return `Quiz ready for attempt. Due: ${due}`;
  }

  thumbnailFor(videoUrl: string): string {
    const youtubeId = this.extractYoutubeId(videoUrl);
    if (youtubeId) {
      return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
    }
    return "https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=1200&q=80";
  }

  private applySelectedVideo(preferredVideoId?: number): void {
    const videos = this.videosInOrder();
    if (videos.length === 0) {
      this.selectedVideo = null;
      this.selectedVideoId = null;
      this.selectedVideoEmbedUrl = null;
      this.selectedVideoFileUrl = null;
      this.videoComments = [];
      this.commentText = "";
      this.commentErrorMessage = "";
      this.commentSuccessMessage = "";
      this.resetReflectionForm();
      return;
    }

    const picked =
      videos.find((video: any) => video.videoId === preferredVideoId) ??
      videos.find((video: any) => !video.completed) ??
      videos[0];

    this.chooseVideo(picked);
  }

  private selectedVideoIndex(): number {
    if (!this.selectedVideoId) {
      return -1;
    }
    return this.videosInOrder().findIndex(
      (video: any) => Number(video?.videoId ?? 0) === Number(this.selectedVideoId)
    );
  }

  private videosInOrder(): any[] {
    const videos = [...(this.courseData?.videos ?? [])];
    return videos.sort((left: any, right: any) => {
      const leftOrder = Number(left?.sortOrder ?? left?.videoId ?? 0);
      const rightOrder = Number(right?.sortOrder ?? right?.videoId ?? 0);
      return leftOrder - rightOrder;
    });
  }

  private toEmbedUrl(videoUrl: string): SafeResourceUrl | null {
    const youtubeId = this.extractYoutubeId(videoUrl);
    if (youtubeId) {
      const embed = `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1&playsinline=1&iv_load_policy=3`;
      return this.sanitizer.bypassSecurityTrustResourceUrl(embed);
    }

    return null;
  }

  private toDirectVideoUrl(videoUrl: string): SafeResourceUrl | null {
    const rawUrl = String(videoUrl ?? "").trim();
    if (!rawUrl) {
      return null;
    }

    let path = rawUrl.toLowerCase();
    try {
      path = new URL(rawUrl).pathname.toLowerCase();
    } catch {
      path = rawUrl.split("?")[0]?.toLowerCase() ?? rawUrl.toLowerCase();
    }

    const directVideo = path.endsWith(".mp4") || path.endsWith(".webm") || path.endsWith(".ogg");
    if (!directVideo) {
      return null;
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);
  }

  private loadVideoComments(videoId: number): void {
    this.commentsLoading = true;
    this.studentService.videoComments(videoId).subscribe({
      next: (rows) => {
        this.videoComments = rows ?? [];
        this.commentErrorMessage = "";
        this.commentsLoading = false;
      },
      error: (error) => {
        this.videoComments = [];
        this.commentErrorMessage = error?.error?.message ?? "Failed to load comments.";
        this.commentsLoading = false;
      }
    });
  }

  private hasReadyQuiz(): boolean {
    return (this.courseData?.quizzes ?? []).some((quiz: any) => this.quizStatusKind(quiz) === "ready");
  }

  private loadReflectionForVideo(videoId: number): void {
    const record = this.reflectionRecords[String(videoId)];
    if (!record) {
      this.resetReflectionForm();
      return;
    }
    this.reflectionConfidence = record.confidence;
    this.reflectionNote = record.note;
    this.reflectionGoal = record.goal;
  }

  private resetReflectionForm(): void {
    this.reflectionConfidence = 3;
    this.reflectionNote = "";
    this.reflectionGoal = "";
    this.reflectionSavedMessage = "";
  }

  private loadReflectionRecords(): void {
    this.reflectionRecords = {};
    const courseId = this.courseData?.course?.id;
    if (!courseId) {
      return;
    }
    try {
      const raw = localStorage.getItem(this.reflectionStorageKey(courseId));
      this.reflectionRecords = raw ? JSON.parse(raw) : {};
    } catch {
      this.reflectionRecords = {};
    }
  }

  private persistReflectionRecords(): void {
    const courseId = this.courseData?.course?.id;
    if (!courseId) {
      return;
    }
    localStorage.setItem(this.reflectionStorageKey(courseId), JSON.stringify(this.reflectionRecords));
  }

  private reflectionStorageKey(courseId: number): string {
    return `edusim-reflections-course-${courseId}`;
  }

  private extractYoutubeId(urlValue: string): string | null {
    try {
      const url = new URL(urlValue);
      const host = url.hostname.toLowerCase();
      if (host.includes("youtu.be")) {
        return url.pathname.replace("/", "") || null;
      }
      if (host.includes("youtube.com")) {
        if (url.searchParams.get("v")) {
          return url.searchParams.get("v");
        }
        const parts = url.pathname.split("/").filter(Boolean);
        if (parts.length >= 2 && parts[0] === "embed") {
          return parts[1];
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  private isQuizOverdue(quiz: any): boolean {
    if (!quiz?.closeAt || quiz?.alreadySubmitted) {
      return false;
    }
    const closeAt = new Date(quiz.closeAt).getTime();
    if (Number.isNaN(closeAt)) {
      return false;
    }
    return Date.now() > closeAt;
  }

  private formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  private trackLessonTouch(lessonId: number): void {
    this.trackLessonProgress(lessonId, 1);
  }

  private trackLessonProgress(lessonId: number, videoProgress: number): void {
    const safeProgress = Math.max(0, Math.min(100, Math.round(videoProgress)));
    const key = String(lessonId);
    const now = Date.now();
    if (safeProgress < 95 && now - Number(this.progressTrackAt[key] ?? 0) < 12000) {
      return;
    }
    this.progressTrackAt[key] = now;
    this.studentService.updateLessonProgress(lessonId, {
      videoProgress: safeProgress,
      completed: safeProgress >= 95
    }).subscribe({
      error: () => undefined
    });
  }
}
