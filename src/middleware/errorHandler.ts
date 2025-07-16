// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { ApplicationError } from '../utils/applicationError.js'; // Ensure this path is correct

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Global Error Handler Caught:', err);

  // Default status code and message
  let statusCode = 500;
  let message = 'An unexpected server error occurred.';

  // Check if it's a custom ApplicationError
  if (err instanceof ApplicationError) {
    statusCode = err.statusCode;
    message = err.message;
    console.error(`ApplicationError: ${err.message} (Status: ${err.statusCode})`);
  } else if (err.name === 'JsonWebTokenError') {
    // Handle specific JWT errors that might not be ApplicationError
    statusCode = 401;
    message = 'Invalid authentication token.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired.';
  }
  // Add more specific error handling if needed (e.g., Joi validation errors)

  // Send the error response
  res.status(statusCode).json({
    message: message,
    // Only send stack trace in development for security
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack, originalError: err instanceof ApplicationError ? err.originalError?.message : err.message })
  });
};
