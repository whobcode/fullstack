import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Cookies are automatically sent with withCredentials
  const authReq = req.clone({
    withCredentials: true
  });

  return next(authReq);
};
