import productReviewAuditLogRepository from '../repositories/product-review-audit-log.repository';
import { CreateProductReviewAuditLogInput, ProductReviewStatus, ReviewAuditAction } from '@gsnake/shared-types';

/**
 * Audit Log Service
 * Handles audit logging for product review actions
 */

export interface ReviewChecklist {
    ownership_verified?: boolean;
    security_scan_passed?: boolean;
    files_valid?: boolean;
    license_valid?: boolean;
    no_credentials_in_code?: boolean;
    demo_tested?: boolean;
    content_appropriate?: boolean;
    [key: string]: boolean | undefined;
}

export class AuditLogService {
    /**
     * Log product approval
     */
    async logApproval(
        productId: string,
        reviewerId: string,
        statusBefore: ProductReviewStatus,
        checklist?: ReviewChecklist,
        notes?: string
    ): Promise<void> {
        await productReviewAuditLogRepository.create({
            product_id: productId,
            reviewer_id: reviewerId,
            action: 'approved',
            review_status_before: statusBefore,
            review_status_after: ProductReviewStatus.APPROVED,
            checklist_items: checklist || {},
            notes: notes || null,
        });
    }

    /**
     * Log product rejection
     */
    async logRejection(
        productId: string,
        reviewerId: string,
        statusBefore: ProductReviewStatus,
        reason: string,
        checklist?: ReviewChecklist,
        notes?: string
    ): Promise<void> {
        await productReviewAuditLogRepository.create({
            product_id: productId,
            reviewer_id: reviewerId,
            action: 'rejected',
            review_status_before: statusBefore,
            review_status_after: ProductReviewStatus.REJECTED,
            reason,
            checklist_items: checklist || {},
            notes: notes || null,
        });
    }

    /**
     * Log request for changes
     */
    async logRequestChanges(
        productId: string,
        reviewerId: string,
        statusBefore: ProductReviewStatus,
        reason: string,
        checklist?: ReviewChecklist,
        notes?: string
    ): Promise<void> {
        await productReviewAuditLogRepository.create({
            product_id: productId,
            reviewer_id: reviewerId,
            action: 'requested_changes',
            review_status_before: statusBefore,
            review_status_after: ProductReviewStatus.PENDING, // Still pending after requesting changes
            reason,
            checklist_items: checklist || {},
            notes: notes || null,
        });
    }

    /**
     * Log product flag (for manual review)
     */
    async logFlag(
        productId: string,
        reviewerId: string,
        reason: string,
        checklist?: ReviewChecklist,
        notes?: string
    ): Promise<void> {
        await productReviewAuditLogRepository.create({
            product_id: productId,
            reviewer_id: reviewerId,
            action: 'flagged',
            review_status_before: null,
            review_status_after: null,
            reason,
            checklist_items: checklist || {},
            notes: notes || null,
        });
    }

    /**
     * Get audit log for a product
     */
    async getProductAuditLog(productId: string) {
        return await productReviewAuditLogRepository.findByProductId(productId);
    }

    /**
     * Get audit log by reviewer
     */
    async getReviewerAuditLog(reviewerId: string) {
        return await productReviewAuditLogRepository.findByReviewerId(reviewerId);
    }
}

export default new AuditLogService();

