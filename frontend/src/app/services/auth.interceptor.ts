import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, throwError } from "rxjs";
import { AuthService } from "./auth.service";

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();
  const request = token
    ? req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  })
    : req;

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      const isLoginRequest = req.url.includes("/api/auth/login");
      const shouldResetSession = error.status === 401 || (error.status === 403 && !token);
      if (!isLoginRequest && shouldResetSession) {
        authService.logout();
        if (router.url !== "/login") {
          void router.navigateByUrl("/login");
        }
      }
      return throwError(() => error);
    })
  );
};
