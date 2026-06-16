import { Routes } from "@angular/router";
import { LoginComponent } from "./components/login/login.component";
import { StudentDashboardComponent } from "./components/student-dashboard/student-dashboard.component";
import { StudentMyCoursesComponent } from "./components/student-my-courses/student-my-courses.component";
import { StudentCourseComponent } from "./components/student-course/student-course.component";
import { StudentQuizComponent } from "./components/student-quiz/student-quiz.component";
import { StudentHistoryComponent } from "./components/student-history/student-history.component";
import { StudentAttemptInsightComponent } from "./components/student-attempt-insight/student-attempt-insight.component";
import { LecturerDashboardComponent } from "./components/lecturer-dashboard/lecturer-dashboard.component";
import { LecturerManageComponent } from "./components/lecturer-manage/lecturer-manage.component";
import { LecturerMonitoringComponent } from "./components/lecturer-monitoring/lecturer-monitoring.component";
import { LecturerQuestionBankComponent } from "./components/lecturer-question-bank/lecturer-question-bank.component";
import { LecturerQuizPreviewComponent } from "./components/lecturer-quiz-preview/lecturer-quiz-preview.component";
import { LecturerResetRequestsComponent } from "./components/lecturer-reset-requests/lecturer-reset-requests.component";
import { PersonalTrackerComponent } from "./components/personal-tracker/personal-tracker.component";
import { authGuard } from "./guards/auth.guard";
import { roleGuard } from "./guards/role.guard";

export const routes: Routes = [
  { path: "tracker", component: PersonalTrackerComponent },
  { path: "login", component: LoginComponent },
  {
    path: "student/dashboard",
    component: StudentDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: "STUDENT" }
  },
  {
    path: "student/courses/:id",
    component: StudentCourseComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: "STUDENT" }
  },
  {
    path: "student/my-courses",
    component: StudentMyCoursesComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: "STUDENT" }
  },
  {
    path: "student/quiz/:quizId",
    component: StudentQuizComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: "STUDENT" }
  },
  {
    path: "student/history",
    component: StudentHistoryComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: "STUDENT" }
  },
  {
    path: "student/attempts/:attemptId/feedback",
    component: StudentAttemptInsightComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: "STUDENT", mode: "feedback" }
  },
  {
    path: "student/attempts/:attemptId/recommendation",
    component: StudentAttemptInsightComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: "STUDENT", mode: "recommendation" }
  },
  {
    path: "student/attempts/:attemptId/improvement",
    component: StudentAttemptInsightComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: "STUDENT", mode: "improvement" }
  },
  {
    path: "student/dashboard/grades",
    component: StudentHistoryComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: "STUDENT" }
  },
  {
    path: "lecturer/dashboard",
    component: LecturerDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: "LECTURER" }
  },
  {
    path: "lecturer/manage",
    component: LecturerManageComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: "LECTURER" }
  },
  {
    path: "lecturer/student-attempts",
    component: LecturerMonitoringComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: "LECTURER", view: "attempts" }
  },
  { path: "lecturer/monitoring", redirectTo: "lecturer/student-attempts", pathMatch: "full" },
  {
    path: "lecturer/quiz-performance",
    component: LecturerMonitoringComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: "LECTURER", view: "performance" }
  },
  {
    path: "lecturer/reset-requests",
    component: LecturerResetRequestsComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: "LECTURER" }
  },
  {
    path: "lecturer/quiz-overview",
    component: LecturerQuestionBankComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: "LECTURER", mode: "quiz" }
  },
  {
    path: "lecturer/quiz-settings",
    component: LecturerQuestionBankComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: "LECTURER", mode: "settings" }
  },
  {
    path: "lecturer/quiz-builder",
    component: LecturerQuestionBankComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: "LECTURER", mode: "questions" }
  },
  {
    path: "lecturer/quiz-results",
    component: LecturerMonitoringComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: "LECTURER", view: "performance" }
  },
  {
    path: "lecturer/quizzes/:quizId/preview",
    component: LecturerQuizPreviewComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: "LECTURER" }
  },
  {
    path: "lecturer/question-bank",
    component: LecturerQuestionBankComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: "LECTURER", mode: "bank" }
  },
  { path: "", pathMatch: "full", redirectTo: "login" },
  { path: "**", redirectTo: "login" }
];
