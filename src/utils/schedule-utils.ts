/**
 * Schedule utility functions
 * Business logic for schedule calculations
 */

/**
 * Calculate next fetch time based on frequency
 * Business logic: Determines when next fetch should occur
 */
export function calculateNextFetch(frequency: string): Date {
    const now = new Date();
    switch (frequency.toLowerCase()) {
        case 'daily':
            now.setDate(now.getDate() + 1);
            break;
        case 'weekly':
            now.setDate(now.getDate() + 7);
            break;
        case 'monthly':
            now.setMonth(now.getMonth() + 1);
            break;
        case 'hourly':
            now.setHours(now.getHours() + 1);
            break;
        default:
            now.setDate(now.getDate() + 1); // Default to daily
    }
    return now;
}

