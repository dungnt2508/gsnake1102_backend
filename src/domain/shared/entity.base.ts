/**
 * Base entity class for all domain entities
 * Provides common functionality like ID and equality comparison
 */
export abstract class Entity<T> {
    protected readonly _id: string;
    protected props: T;

    constructor(props: T, id: string) {
        this._id = id;
        this.props = props;
    }

    get id(): string {
        return this._id;
    }

    /**
     * Check if two entities are equal (same ID)
     */
    equals(entity?: Entity<T>): boolean {
        if (!entity) return false;
        if (this === entity) return true;
        return this._id === entity._id;
    }

    /**
     * Get entity properties (for persistence)
     */
    protected getProps(): T {
        return this.props;
    }
}

