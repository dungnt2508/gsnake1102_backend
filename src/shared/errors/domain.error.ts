import { ApplicationError } from './base.error';
import { ERROR_CODES, ERROR_MESSAGES } from './codes';

/**
 * Domain error for business logic violations
 */
export class DomainError extends ApplicationError {
    constructor(code: string, details?: Record<string, any>) {
        super(
            code,
            ERROR_MESSAGES[code] || 'Domain error',
            400,
            details
        );
    }
}

