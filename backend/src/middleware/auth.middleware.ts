import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../modules/auth/auth.service';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

/**
 * Authenticate customer or admin via JWT in httpOnly cookie.
 * Attaches user payload to req.user.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.jwt;
  if (!token) {
    throw new UnauthorizedError('انتهت جلستك، ادخل تاني');
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    throw new UnauthorizedError('جلسة غير صالحة');
  }
}

/**
 * Optional auth — tries to authenticate but allows unauthenticated access.
 * Used for endpoints that work for both kiosk (public) and logged-in users.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.jwt;
  if (token) {
    try {
      const payload = verifyToken(token);
      req.user = payload;
    } catch {
      // Invalid token — treat as unauthenticated
    }
  }
  next();
}

/**
 * Authorize by role. Must be used AFTER authenticate middleware.
 */
export function authorize(...roles: ('admin' | 'tech' | 'viewer' | 'customer')[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('ليس لديك صلاحية كافية');
    }

    next();
  };
}
