import { HttpClient } from "@angular/common/http";
import { Injectable, signal } from "@angular/core";
import { Observable, tap } from "rxjs";
import { environment } from "../../environments/environment";

export type UserRole = "STUDENT" | "LECTURER";

export interface UserSession {
  token: string;
  userId: number;
  fullName: string;
  email: string;
  role: UserRole;
}

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly storageKey = "edusim-session";
  readonly session = signal<UserSession | null>(this.readSession());

  constructor(private readonly http: HttpClient) {}

  login(payload: { email: string; password: string }): Observable<UserSession> {
    return this.http.post<UserSession>(`${environment.apiBaseUrl}/auth/login`, payload).pipe(
      tap((session) => {
        localStorage.setItem(this.storageKey, JSON.stringify(session));
        this.session.set(session);
      })
    );
  }

  loadProfile(): Observable<unknown> {
    return this.http.get(`${environment.apiBaseUrl}/auth/me`);
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
    this.session.set(null);
  }

  getToken(): string | null {
    const token = this.session()?.token;
    if (token) {
      return token;
    }

    const fallback = this.readSession();
    if (fallback?.token) {
      this.session.set(fallback);
      return fallback.token;
    }

    return null;
  }

  private readSession(): UserSession | null {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as UserSession;
    } catch {
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }
}
