import reviewRepository from '../repositories/review.repository';
import productRepository from '../repositories/product.repository';
import { Review, ReviewStatus, CreateReviewInput, UpdateReviewInput, ProductReviewStatus, ProductStatus } from '@gsnake/shared-types';
import { NotFoundError, AuthorizationError, DomainError, ERROR_CODES } from '../shared/errors';

export class ReviewService {
    async getProductReviews(productId: string, limit = 50, offset = 0): Promise<{ reviews: Review[]; total: number }> {
        return reviewRepository.findMany({
            product_id: productId,
            status: ReviewStatus.APPROVED,
            limit,
            offset,
        });
    }

    async createReview(userId: string, data: CreateReviewInput): Promise<Review> {
        // ensure product exists and published+approved
        const product = await productRepository.findById(data.product_id);
        if (!product) {
            throw new NotFoundError(ERROR_CODES.PRODUCT_NOT_FOUND, { productId: data.product_id });
        }
        if (product.review_status !== ProductReviewStatus.APPROVED || product.status !== ProductStatus.PUBLISHED) {
            throw new DomainError(ERROR_CODES.PRODUCT_NOT_APPROVED);
        }

        if (data.rating < 1 || data.rating > 5) {
            throw new DomainError(ERROR_CODES.INVALID_RATING || 'INVALID_RATING', { rating: data.rating });
        }

        const review = await reviewRepository.create({
            ...data,
            user_id: userId,
            status: ReviewStatus.PENDING,
        });
        return review;
    }

    async updateReview(id: string, userId: string, data: UpdateReviewInput): Promise<Review> {
        const review = await reviewRepository.findById(id);
        if (!review) {
            throw new NotFoundError(ERROR_CODES.REVIEW_NOT_FOUND || 'REVIEW_NOT_FOUND', { reviewId: id });
        }
        if (review.user_id !== userId) {
            throw new AuthorizationError(ERROR_CODES.REVIEW_UPDATE_FORBIDDEN || 'REVIEW_UPDATE_FORBIDDEN');
        }

        const updated = await reviewRepository.update(id, {
            ...data,
            status: ReviewStatus.PENDING, // require re-approval on edit
        });
        if (!updated) {
            throw new DomainError(ERROR_CODES.REVIEW_UPDATE_FAILED || 'REVIEW_UPDATE_FAILED');
        }
        return updated;
    }

    async deleteReview(id: string, userId: string): Promise<void> {
        const review = await reviewRepository.findById(id);
        if (!review) {
            throw new NotFoundError(ERROR_CODES.REVIEW_NOT_FOUND || 'REVIEW_NOT_FOUND', { reviewId: id });
        }
        if (review.user_id !== userId) {
            throw new AuthorizationError(ERROR_CODES.REVIEW_DELETE_FORBIDDEN || 'REVIEW_DELETE_FORBIDDEN');
        }

        const deleted = await reviewRepository.delete(id);
        if (!deleted) {
            throw new DomainError(ERROR_CODES.REVIEW_DELETE_FAILED || 'REVIEW_DELETE_FAILED');
        }

        // Recompute aggregates if approved was removed
        if (review.status === ReviewStatus.APPROVED) {
            await this.refreshProductAggregate(review.product_id);
        }
    }

    async adminApprove(id: string, adminId: string): Promise<Review> {
        const review = await reviewRepository.findById(id);
        if (!review) {
            throw new NotFoundError(ERROR_CODES.REVIEW_NOT_FOUND || 'REVIEW_NOT_FOUND', { reviewId: id });
        }

        const updated = await reviewRepository.update(id, {
            status: ReviewStatus.APPROVED,
        });
        if (!updated) {
            throw new DomainError(ERROR_CODES.REVIEW_UPDATE_FAILED || 'REVIEW_UPDATE_FAILED');
        }

        await this.refreshProductAggregate(review.product_id);
        return updated;
    }

    async adminReject(id: string, adminId: string): Promise<Review> {
        const review = await reviewRepository.findById(id);
        if (!review) {
            throw new NotFoundError(ERROR_CODES.REVIEW_NOT_FOUND || 'REVIEW_NOT_FOUND', { reviewId: id });
        }

        const updated = await reviewRepository.update(id, {
            status: ReviewStatus.REJECTED,
        });
        if (!updated) {
            throw new DomainError(ERROR_CODES.REVIEW_UPDATE_FAILED || 'REVIEW_UPDATE_FAILED');
        }

        await this.refreshProductAggregate(review.product_id);
        return updated;
    }

    private async refreshProductAggregate(productId: string) {
        const aggregates = await reviewRepository.getAggregates(productId);
        await productRepository.update(productId, {
            rating: aggregates.avg,
            reviews_count: aggregates.count,
        } as any);
    }
}

export default new ReviewService();


