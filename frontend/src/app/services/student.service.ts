import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";

@Injectable({ providedIn: "root" })
export class StudentService {
  constructor(private readonly http: HttpClient) {}

  dashboard(): Observable<any> {
    return this.http.get(`${environment.apiBaseUrl}/student/dashboard`);
  }

  course(courseId: number): Observable<any> {
    return this.http.get(`${environment.apiBaseUrl}/student/courses/${courseId}`);
  }

  completeVideo(videoId: number): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/student/videos/${videoId}/complete`, {});
  }

  startQuiz(quizId: number): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/student/quizzes/${quizId}/start`, {});
  }

  submitQuiz(quizId: number, payload: { attemptId: number; answers: Record<string, unknown> }): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/student/quizzes/${quizId}/submit`, payload);
  }

  attempts(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiBaseUrl}/student/attempts`);
  }

  attemptResult(attemptId: number): Observable<any> {
    return this.http.get(`${environment.apiBaseUrl}/student/attempts/${attemptId}`);
  }
}
