import { Routes } from "@angular/router";
import { LoginComponent } from "./components/login/login.component";
import { StudentDashboardComponent } from "./components/student-dashboard/student-dashboard.component";
import { StudentCourseComponent } from "./components/student-course/student-course.component";
import { StudentQuizComponent } from "./components/student-quiz/student-quiz.component";
import { StudentHistoryComponent } from "./components/student-history/student-history.component";
import { LecturerDashboardComponent } from "./components/lecturer-dashboard/lecturer-dashboard.component";
import { LecturerManageComponent } from "./components/lecturer-manage/lecturer-manage.component";
import { LecturerMonitoringComponent } from "./components/lecturer-monitoring/lecturer-monitoring.component";
import { LecturerQuestionBankComponent } from "./components/lecturer-question-bank/lecturer-question-bank.component";
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
    path: "lecturer/monitoring",
    component: LecturerMonitoringComponent,
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
    component: LecturerQuestionBankComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: "LECTURER", mode: "results" }
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
