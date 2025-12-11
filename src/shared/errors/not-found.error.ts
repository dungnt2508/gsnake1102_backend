import { ApplicationError } from './base.error';
import { ERROR_CODES, ERROR_MESSAGES } from './codes';

/**
 * Not found error for missing resources
 */
export class NotFoundError extends ApplicationError {
    constructor(code: string, details?: Record<string, any>) {
        super(
            code,
            ERROR_MESSAGES[code] || 'Not found',
            404,
            details
        );
    }
}

