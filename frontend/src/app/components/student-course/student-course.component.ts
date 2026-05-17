import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { StudentService } from "../../services/student.service";

@Component({
  selector: "app-student-course",
  standalone: true,
  imports: [CommonModule, RouterLink],
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
  resourceSectionOpen = false;
  quizSectionOpen = false;

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
  }

  openVideo(videoUrl: string): void {
    window.open(videoUrl, "_blank", "noopener");
  }

  toggleResourceSection(): void {
    this.resourceSectionOpen = !this.resourceSectionOpen;
  }

  toggleQuizSection(): void {
    this.quizSectionOpen = !this.quizSectionOpen;
  }

  thumbnailFor(videoUrl: string): string {
    const youtubeId = this.extractYoutubeId(videoUrl);
    if (youtubeId) {
      return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
    }
    return "https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=1200&q=80";
  }

  private applySelectedVideo(preferredVideoId?: number): void {
    const videos = this.courseData?.videos ?? [];
    if (videos.length === 0) {
      this.selectedVideo = null;
      this.selectedVideoId = null;
      this.selectedVideoEmbedUrl = null;
      return;
    }

    const picked =
      videos.find((video: any) => video.videoId === preferredVideoId) ??
      videos.find((video: any) => !video.completed) ??
      videos[0];

    this.chooseVideo(picked);
  }

  private toEmbedUrl(videoUrl: string): SafeResourceUrl | null {
    const youtubeId = this.extractYoutubeId(videoUrl);
    if (youtubeId) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${youtubeId}?rel=0`);
    }

    if (videoUrl.endsWith(".mp4")) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(videoUrl);
    }

    return null;
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
}
