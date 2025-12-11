import { ProductStatus, ProductReviewStatus } from '@gsnake/shared-types';

/**
 * State transition definition
 */
interface StateTransition {
    from: ProductStatus;
    to: ProductStatus;
    guard?: (reviewStatus: ProductReviewStatus) => boolean;
}

/**
 * Product state machine utility
 * Defines valid state transitions and guards
 * Moved from domain to utils as part of Layered Architecture migration
 */
export class ProductStateMachine {
    private static transitions: StateTransition[] = [
        {
            from: ProductStatus.DRAFT,
            to: ProductStatus.PUBLISHED,
            guard: (reviewStatus) => reviewStatus === ProductReviewStatus.APPROVED,
        },
        {
            from: ProductStatus.PUBLISHED,
            to: ProductStatus.DRAFT,
        },
        {
            from: ProductStatus.PUBLISHED,
            to: ProductStatus.ARCHIVED,
        },
        {
            from: ProductStatus.DRAFT,
            to: ProductStatus.ARCHIVED,
        },
    ];

    /**
     * Check if a state transition is allowed
     */
    static canTransition(
        from: ProductStatus,
        to: ProductStatus,
        reviewStatus?: ProductReviewStatus
    ): boolean {
        const transition = this.transitions.find(t => t.from === from && t.to === to);
        if (!transition) return false;

        // Check guard if present
        if (transition.guard && reviewStatus !== undefined) {
            return transition.guard(reviewStatus);
        }

        return true;
    }

    /**
     * Get all allowed transitions from a given state
     */
    static getAllowedTransitions(
        from: ProductStatus,
        reviewStatus?: ProductReviewStatus
    ): ProductStatus[] {
        return this.transitions
            .filter(t => {
                if (t.from !== from) return false;
                if (t.guard && reviewStatus !== undefined) {
                    return t.guard(reviewStatus);
                }
                return true;
            })
            .map(t => t.to);
    }
}

