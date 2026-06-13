import { CanActivateFn, Router } from "@angular/router";
import { inject } from "@angular/core";
import { AuthService } from "../services/auth.service";

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const requiredRole = route.data?.["role"];
  const currentRole = authService.session()?.role;

  if (requiredRole && requiredRole === currentRole) {
    return true;
  }

  if (currentRole === "STUDENT") {
    return router.parseUrl("/student/my-courses");
  }
  if (currentRole === "LECTURER") {
    return router.parseUrl("/lecturer/dashboard");
  }
  return router.parseUrl("/login");
};
