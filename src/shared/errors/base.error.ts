/**
 * Base error class for all application errors
 */
export abstract class ApplicationError extends Error {
    constructor(
        public readonly code: string,
        public readonly message: string,
        public readonly statusCode: number,
        public readonly details?: Record<string, any>
    ) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

