/*
  Project: doublePlay (frontend)
  File: src/app/core/guards/admin.guard.ts
  Description: Route guard that restricts admin-only pages to privileged users.
*/

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAdmin()) {
    return true;
  }

  return router.createUrlTree(['/home']);
};
