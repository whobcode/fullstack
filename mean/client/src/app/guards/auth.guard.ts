import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Wait for auth check to complete
  if (authService.isLoading()) {
    return new Promise<boolean>((resolve) => {
      const checkAuth = () => {
        if (!authService.isLoading()) {
          if (authService.isAuthenticated()) {
            resolve(true);
          } else {
            router.navigate(['/login']);
            resolve(false);
          }
        } else {
          setTimeout(checkAuth, 50);
        }
      };
      checkAuth();
    });
  }

  router.navigate(['/login']);
  return false;
};
