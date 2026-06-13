import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { TimeoutError, catchError, throwError, timeout } from "rxjs";
import { AuthService } from "./auth.service";

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();
  const requestTimeoutMs = req.url.includes("/api/auth/login") ? 60000 : 30000;
  const request = token
    ? req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  })
    : req;

  return next(request).pipe(
    timeout({ first: requestTimeoutMs }),
    catchError((error: unknown) => {
      if (error instanceof TimeoutError) {
        return throwError(() => ({
          status: 0,
          error: {
            message: "Server is taking too long to respond. Please wait a moment and refresh this page."
          }
        }));
      }

      const httpError = error as HttpErrorResponse;
      const isLoginRequest = req.url.includes("/api/auth/login");
      const shouldResetSession = httpError.status === 401 || (httpError.status === 403 && !token);
      if (!isLoginRequest && shouldResetSession) {
        authService.logout();
        if (router.url !== "/login") {
          void router.navigateByUrl("/login");
        }
      }
      return throwError(() => httpError);
    })
  );
};
