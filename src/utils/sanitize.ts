import validator from 'validator';

/**
 * Sanitize and validate URL
 * @param url - URL string to sanitize
 * @returns Sanitized URL
 * @throws Error if URL is invalid
 */
export function sanitizeUrl(url: string): string {
    // Trim whitespace
    const trimmed = url.trim();

    // Validate URL format
    if (!validator.isURL(trimmed, { require_protocol: true })) {
        throw new Error('Invalid URL format. URL must include protocol (http:// or https://)');
    }

    // Escape HTML entities to prevent XSS
    return validator.escape(trimmed);
}

/**
 * Sanitize string input
 * @param input - String to sanitize
 * @param maxLength - Maximum allowed length (optional)
 * @returns Sanitized string
 */
export function sanitizeString(input: string, maxLength?: number): string {
    // Trim whitespace
    let sanitized = input.trim();

    // Check length if maxLength is provided
    if (maxLength && sanitized.length > maxLength) {
        throw new Error(`Input exceeds maximum length of ${maxLength} characters`);
    }

    // Escape HTML entities
    return validator.escape(sanitized);
}

/**
 * Sanitize email
 * @param email - Email to sanitize
 * @returns Sanitized email
 * @throws Error if email is invalid
 */
export function sanitizeEmail(email: string): string {
    const trimmed = email.trim().toLowerCase();

    if (!validator.isEmail(trimmed)) {
        throw new Error('Invalid email format');
    }

    return trimmed;
}

/**
 * Sanitize file path (basic validation)
 * @param filePath - File path to sanitize
 * @returns Sanitized file path
 * @throws Error if path contains dangerous characters
 */
export function sanitizeFilePath(filePath: string): string {
    const trimmed = filePath.trim();

    // Prevent directory traversal and dangerous characters
    if (trimmed.includes('..') || trimmed.includes('~') || trimmed.startsWith('/')) {
        throw new Error('Invalid file path');
    }

    // Remove dangerous characters
    return trimmed.replace(/[<>:"|?*\x00-\x1f]/g, '');
}

