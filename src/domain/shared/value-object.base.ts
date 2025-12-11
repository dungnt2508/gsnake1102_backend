/**
 * Base class for value objects
 * Value objects are immutable and compared by value, not identity
 */
export abstract class ValueObject<T> {
    protected readonly props: T;

    constructor(props: T) {
        this.props = Object.freeze(props);
    }

    /**
     * Compare value objects by their properties
     */
    equals(vo?: ValueObject<T>): boolean {
        if (!vo) return false;
        if (this === vo) return true;
        return JSON.stringify(this.props) === JSON.stringify(vo.props);
    }

    /**
     * Get value object properties
     */
    protected getProps(): T {
        return this.props;
    }
}

