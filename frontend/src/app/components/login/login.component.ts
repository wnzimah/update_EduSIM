import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./login.component.html",
  styleUrl: "./login.component.css"
})
export class LoginComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = "student@edusim.com";
  password = "password123";
  isLoading = false;
  errorMessage = "";
  showAbout = false;
  currentSlideIndex = 0;
  readonly visualSlides = [
    {
      image: "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=2200&q=80",
      alt: "Student studying using laptop and books",
      title: "Open and Distance Learning Experience",
      caption: "Flexible learning paths with digital self-instructional materials."
    },
    {
      image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=2200&q=80",
      alt: "Students collaborating in a digital classroom",
      title: "Interactive Learning Resources",
      caption: "Access course content, videos, and resources in one place."
    },
    {
      image: "https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=2200&q=80",
      alt: "Online assessment and learning analytics",
      title: "Smart Assessment and Feedback",
      caption: "Track progress with quizzes, instant feedback, and clear insights."
    }
  ];
  private slideTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.startSlideShow();
  }

  ngOnDestroy(): void {
    this.stopSlideShow();
  }

  submit(): void {
    this.errorMessage = "";
    this.isLoading = true;
    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (session) => {
        this.isLoading = false;
        if (session.role === "STUDENT") {
          this.router.navigateByUrl("/student/dashboard");
          return;
        }
        this.router.navigateByUrl("/lecturer/dashboard");
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error?.error?.message ?? "Login failed";
      }
    });
  }

  toggleAbout(): void {
    this.showAbout = !this.showAbout;
  }

  goToSlide(index: number): void {
    if (index < 0 || index >= this.visualSlides.length) {
      return;
    }
    this.currentSlideIndex = index;
    this.restartSlideShow();
  }

  private startSlideShow(): void {
    this.stopSlideShow();
    this.slideTimer = setInterval(() => {
      this.currentSlideIndex = (this.currentSlideIndex + 1) % this.visualSlides.length;
    }, 5000);
  }

  private stopSlideShow(): void {
    if (!this.slideTimer) {
      return;
    }
    clearInterval(this.slideTimer);
    this.slideTimer = null;
  }

  private restartSlideShow(): void {
    this.startSlideShow();
  }
}
