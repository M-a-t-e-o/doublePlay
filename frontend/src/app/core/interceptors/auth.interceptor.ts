/*
  Project: doublePlay (frontend)
  File: src/app/core/interceptors/auth.interceptor.ts
  Description: HTTP interceptor that attaches the auth token and centralizes auth error handling.
*/

import { HttpInterceptorFn } from '@angular/common/http'

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token')
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    })
  }
  return next(req)
}