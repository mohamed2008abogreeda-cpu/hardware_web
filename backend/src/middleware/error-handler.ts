import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../utils/errors';

/**
 * Global error handler middleware.
 * Catches all errors and returns structured JSON responses.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle operational errors (expected)
  if (err instanceof AppError) {
    const response: Record<string, unknown> = {
      success: false,
      error: err.message,
      code: err.statusCode,
    };

    if (err instanceof ValidationError && err.errors) {
      response.errors = err.errors;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle unexpected errors
  console.error('[ERROR] Unexpected error:', err);

  const message =
    process.env.NODE_ENV === 'production'
      ? 'حدث خطأ داخلي في الخادم'
      : err.message;

  res.status(500).json({
    success: false,
    error: message,
    code: 500,
  });
}

/**
 * Async route handler wrapper — catches promise rejections
 * and forwards them to the error handler.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => void | Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
