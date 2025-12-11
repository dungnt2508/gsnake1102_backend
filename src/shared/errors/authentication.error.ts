import { ApplicationError } from './base.error';
import { ERROR_CODES, ERROR_MESSAGES } from './codes';

/**
 * Authentication error for auth failures
 */
export class AuthenticationError extends ApplicationError {
    constructor(code: string, details?: Record<string, any>) {
        super(
            code,
            ERROR_MESSAGES[code] || 'Authentication failed',
            401,
            details
        );
    }
}

