/**
 * Database mapper utilities
 * Automatically handles JSON field parsing and type conversion
 */

/**
 * Parse JSON field from database
 * Handles both string and already-parsed objects
 */
export function parseJsonField(value: any, defaultValue: any = null): any {
    if (value === null || value === undefined) {
        return defaultValue;
    }
    
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch {
            return defaultValue;
        }
    }
    
    if (Array.isArray(value) || typeof value === 'object') {
        return value;
    }
    
    return defaultValue;
}

/**
 * Parse JSON array field
 */
export function parseJsonArray(value: any, defaultValue: any[] = []): any[] {
    const parsed = parseJsonField(value, defaultValue);
    return Array.isArray(parsed) ? parsed : defaultValue;
}

/**
 * Parse JSON object field
 */
export function parseJsonObject(value: any, defaultValue: Record<string, any> = {}): Record<string, any> {
    const parsed = parseJsonField(value, defaultValue);
    return typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : defaultValue;
}

/**
 * Parse number field (handles string numbers from DB)
 */
export function parseNumber(value: any, defaultValue: number = 0): number {
    if (value === null || value === undefined) {
        return defaultValue;
    }
    
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return isNaN(num) ? defaultValue : num;
}

/**
 * Map database row to model
 * Automatically handles:
 * - JSON field parsing (tags, metadata, etc.)
 * - Number parsing (price, rating, etc.)
 * - Date parsing (if needed)
 */
export function mapDbRow<T extends Record<string, any>>(
    row: any,
    jsonFields: string[] = [],
    jsonArrayFields: string[] = [],
    jsonObjectFields: string[] = [],
    numberFields: string[] = []
): T {
    const mapped: any = { ...row };
    
    // Parse JSON array fields
    jsonArrayFields.forEach(field => {
        if (mapped[field] !== undefined) {
            mapped[field] = parseJsonArray(mapped[field], []);
        }
    });
    
    // Parse JSON object fields
    jsonObjectFields.forEach(field => {
        if (mapped[field] !== undefined) {
            mapped[field] = parseJsonObject(mapped[field], {});
        }
    });
    
    // Parse generic JSON fields (can be array or object)
    jsonFields.forEach(field => {
        if (mapped[field] !== undefined) {
            mapped[field] = parseJsonField(mapped[field], null);
        }
    });
    
    // Parse number fields
    numberFields.forEach(field => {
        if (mapped[field] !== undefined) {
            mapped[field] = parseNumber(mapped[field], 0);
        }
    });
    
    return mapped as T;
}

/**
 * Prepare data for database insertion
 * Converts arrays/objects to JSON strings if needed
 */
export function prepareDbData(data: Record<string, any>, jsonFields: string[] = []): Record<string, any> {
    const prepared: Record<string, any> = { ...data };
    
    jsonFields.forEach(field => {
        if (prepared[field] !== undefined && prepared[field] !== null) {
            if (typeof prepared[field] === 'object') {
                prepared[field] = JSON.stringify(prepared[field]);
            }
        }
    });
    
    return prepared;
}

