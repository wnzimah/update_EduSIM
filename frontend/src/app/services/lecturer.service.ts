import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";

@Injectable({ providedIn: "root" })
export class LecturerService {
  constructor(private readonly http: HttpClient) {}

  dashboard(): Observable<any> {
    return this.http.get(`${environment.apiBaseUrl}/lecturer/dashboard`);
  }

  courses(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiBaseUrl}/lecturer/courses`);
  }

  createCourse(payload: { title: string; description: string }): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/lecturer/courses`, payload);
  }

  updateCourse(courseId: number, payload: { title: string; description: string }): Observable<any> {
    return this.http.put(`${environment.apiBaseUrl}/lecturer/courses/${courseId}`, payload);
  }

  deleteCourse(courseId: number): Observable<any> {
    return this.http.delete(`${environment.apiBaseUrl}/lecturer/courses/${courseId}`);
  }

  addVideo(courseId: number, payload: any): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/lecturer/courses/${courseId}/videos`, payload);
  }

  courseContent(courseId: number): Observable<any> {
    return this.http.get(`${environment.apiBaseUrl}/lecturer/courses/${courseId}/content`);
  }

  updateVideo(videoId: number, payload: any): Observable<any> {
    return this.http.put(`${environment.apiBaseUrl}/lecturer/videos/${videoId}`, payload);
  }

  deleteVideo(videoId: number): Observable<any> {
    return this.http.delete(`${environment.apiBaseUrl}/lecturer/videos/${videoId}`);
  }

  duplicateVideo(videoId: number): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/lecturer/videos/${videoId}/duplicate`, {});
  }

  addMaterial(courseId: number, payload: any): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/lecturer/courses/${courseId}/materials`, payload);
  }

  updateMaterial(materialId: number, payload: any): Observable<any> {
    return this.http.put(`${environment.apiBaseUrl}/lecturer/materials/${materialId}`, payload);
  }

  deleteMaterial(materialId: number): Observable<any> {
    return this.http.delete(`${environment.apiBaseUrl}/lecturer/materials/${materialId}`);
  }

  duplicateMaterial(materialId: number): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/lecturer/materials/${materialId}/duplicate`, {});
  }

  questionBank(filters?: {
    courseId?: number;
    topicTag?: string;
    difficultyLevel?: string;
    questionType?: string;
    createdFrom?: string;
    createdTo?: string;
    search?: string;
  }): Observable<any[]> {
    const params = new URLSearchParams();
    if (filters?.courseId) {
      params.set("courseId", String(filters.courseId));
    }
    if (filters?.topicTag?.trim()) {
      params.set("topicTag", filters.topicTag.trim());
    }
    if (filters?.difficultyLevel?.trim()) {
      params.set("difficultyLevel", filters.difficultyLevel.trim());
    }
    if (filters?.questionType?.trim()) {
      params.set("questionType", filters.questionType.trim());
    }
    if (filters?.createdFrom?.trim()) {
      params.set("createdFrom", filters.createdFrom.trim());
    }
    if (filters?.createdTo?.trim()) {
      params.set("createdTo", filters.createdTo.trim());
    }
    if (filters?.search?.trim()) {
      params.set("search", filters.search.trim());
    }
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return this.http.get<any[]>(`${environment.apiBaseUrl}/lecturer/question-bank${suffix}`);
  }

  addQuestionBank(payload: any): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/lecturer/question-bank`, payload);
  }

  updateQuestionBank(questionBankId: number, payload: any): Observable<any> {
    return this.http.put(`${environment.apiBaseUrl}/lecturer/question-bank/${questionBankId}`, payload);
  }

  deleteQuestionBank(questionBankId: number): Observable<any> {
    return this.http.delete(`${environment.apiBaseUrl}/lecturer/question-bank/${questionBankId}`);
  }

  createQuiz(payload: any): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/lecturer/quizzes`, payload);
  }

  quizzes(courseId?: number): Observable<any[]> {
    const suffix = courseId ? `?courseId=${courseId}` : "";
    return this.http.get<any[]>(`${environment.apiBaseUrl}/lecturer/quizzes${suffix}`);
  }

  publishQuiz(quizId: number, published: boolean): Observable<any> {
    return this.http.patch(`${environment.apiBaseUrl}/lecturer/quizzes/${quizId}/publish`, { published });
  }

  duplicateQuiz(quizId: number): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/lecturer/quizzes/${quizId}/duplicate`, {});
  }

  deleteQuiz(quizId: number): Observable<any> {
    return this.http.delete(`${environment.apiBaseUrl}/lecturer/quizzes/${quizId}`);
  }

  previewQuiz(quizId: number): Observable<any> {
    return this.http.get(`${environment.apiBaseUrl}/lecturer/quizzes/${quizId}/preview`);
  }

  results(quizId?: number, courseId?: number): Observable<any[]> {
    const params = new URLSearchParams();
    if (quizId) {
      params.set("quizId", String(quizId));
    }
    if (courseId) {
      params.set("courseId", String(courseId));
    }
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return this.http.get<any[]>(`${environment.apiBaseUrl}/lecturer/results${suffix}`);
  }

  resultDetail(attemptId: number): Observable<any> {
    return this.http.get(`${environment.apiBaseUrl}/lecturer/results/${attemptId}`);
  }

  adjustAnswerScore(answerId: number, payload: { awardedPoints: number; reason?: string }): Observable<any> {
    return this.http.patch(`${environment.apiBaseUrl}/lecturer/results/answers/${answerId}/adjust`, payload);
  }
}
