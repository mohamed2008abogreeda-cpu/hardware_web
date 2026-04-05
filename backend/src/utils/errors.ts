/**
 * Custom Error Classes for the Hardware Portal API.
 * Following the error-handling-patterns skill.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public readonly errors?: { field: string; message: string }[];

  constructor(message: string, errors?: { field: string; message: string }[]) {
    super(message, 400);
    this.errors = errors;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'غير مصرح لك بالوصول') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'ليس لديك صلاحية كافية') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'المورد غير موجود') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'عدد كبير جداً من الطلبات. حاول لاحقاً.') {
    super(message, 429);
  }
}
