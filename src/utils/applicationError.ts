    // src/utils/applicationError.ts
    export class ApplicationError extends Error {
      statusCode: number;
      originalError?: Error;

      constructor(message: string, statusCode: number = 500, originalError?: Error) {
        super(message);
        this.name = 'ApplicationError';
        this.statusCode = statusCode;
        this.originalError = originalError;

        // This line is essential for proper stack traces in Node.js
        Object.setPrototypeOf(this, ApplicationError.prototype);
      }
    }
    