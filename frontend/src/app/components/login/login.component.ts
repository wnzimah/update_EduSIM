import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.css"]
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = "student@edusim.com";
  password = "password123";
  isLoading = false;
  errorMessage = "";
  showLoginModal = false;
  showForgotPasswordModal = false;
  forgotPasswordEmail = "";
  forgotPasswordMessage = "";
  activeVisualSlideIndex = 0;
  readonly visualSlides = [
    {
      image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80",
      alt: "Students learning together with laptops",
      title: "Virtual Learning",
      caption: "Study anywhere with guided digital lessons.",
      metric: "4.8",
      metricLabel: "Learner rating",
      sessionTitle: "SIM Session",
      sessionMeta: "2 quizzes ready"
    },
    {
      image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
      alt: "Student attending an online class",
      title: "Course Hub",
      caption: "Access videos, notes, and class resources in one place.",
      metric: "12",
      metricLabel: "Learning resources",
      sessionTitle: "Class Room",
      sessionMeta: "Live content ready"
    },
    {
      image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&q=80",
      alt: "Learner writing notes during a class",
      title: "Smart Feedback",
      caption: "Review quiz attempts with clear improvement insight.",
      metric: "86%",
      metricLabel: "Progress tracked",
      sessionTitle: "Quiz Review",
      sessionMeta: "Feedback unlocked"
    },
    {
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80",
      alt: "Lecturer guiding a digital learning session",
      title: "Lecturer Tools",
      caption: "Create quizzes, monitor attempts, and support students faster.",
      metric: "24/7",
      metricLabel: "Learning access",
      sessionTitle: "EduSIM Lab",
      sessionMeta: "Progress visible"
    }
  ];

  get activeVisualSlide() {
    return this.visualSlides[this.activeVisualSlideIndex];
  }

  visualSlideAt(offset: number) {
    return this.visualSlides[(this.activeVisualSlideIndex + offset + this.visualSlides.length) % this.visualSlides.length];
  }

  previousVisualSlide(): void {
    this.activeVisualSlideIndex =
      (this.activeVisualSlideIndex - 1 + this.visualSlides.length) % this.visualSlides.length;
  }

  nextVisualSlide(): void {
    this.activeVisualSlideIndex = (this.activeVisualSlideIndex + 1) % this.visualSlides.length;
  }

  setVisualSlide(index: number): void {
    this.activeVisualSlideIndex = index;
  }

  submit(): void {
    this.errorMessage = "";
    this.isLoading = true;
    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (session) => {
        this.isLoading = false;
        if (session.role === "STUDENT") {
          this.router.navigateByUrl("/student/my-courses");
          return;
        }
        this.router.navigateByUrl("/lecturer/dashboard");
      },
      error: (error) => {
        this.isLoading = false;
        const statusCode = Number(error?.status ?? 0);
        const apiMessage = String(error?.error?.message ?? "").toLowerCase();
        if (statusCode === 401 || apiMessage.includes("invalid credentials") || apiMessage.includes("validation failed")) {
          this.errorMessage = "password or username is wrong";
          return;
        }
        this.errorMessage = "password or username is wrong";
      }
    });
  }

  openForgotPasswordModal(): void {
    this.forgotPasswordEmail = this.email.trim();
    this.forgotPasswordMessage = "";
    this.showForgotPasswordModal = true;
  }

  closeForgotPasswordModal(): void {
    this.showForgotPasswordModal = false;
  }

  sendPasswordReset(): void {
    const email = this.forgotPasswordEmail.trim();
    if (!email || !email.includes("@")) {
      this.forgotPasswordMessage = "Please enter a valid email address.";
      return;
    }
    this.forgotPasswordMessage = "If your account exists, reset instructions have been sent to your email.";
  }

  focusLogin(): void {
    this.showLoginModal = true;
    window.setTimeout(() => document.getElementById("email")?.focus(), 80);
  }

  closeLoginModal(): void {
    if (this.isLoading) {
      return;
    }
    this.showLoginModal = false;
    this.errorMessage = "";
  }

  scrollHome(): void {
    document.getElementById("home")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
