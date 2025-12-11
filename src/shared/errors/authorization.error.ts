import { ApplicationError } from './base.error';
import { ERROR_CODES, ERROR_MESSAGES } from './codes';

/**
 * Authorization error for permission violations
 */
export class AuthorizationError extends ApplicationError {
    constructor(code: string, details?: Record<string, any>) {
        super(
            code,
            ERROR_MESSAGES[code] || 'Forbidden',
            403,
            details
        );
    }
}

