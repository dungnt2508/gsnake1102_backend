import userRepository from '../repositories/user.repository';
import productRepository from '../repositories/product.repository';
import sellerService from './seller.service';
import auditLogService, { ReviewChecklist } from './audit-log.service';
import { UserRole, SellerStatus, ProductReviewStatus, ProductStatus, ProductType } from '@gsnake/shared-types';
import { NotFoundError, DomainError, ERROR_CODES } from '../shared/errors';

export class AdminService {
    /**
     * Get dashboard statistics
     */
    async getDashboardStats() {
        const [
            totalUsers,
            totalSellers,
            pendingSellers,
            totalProducts,
            pendingProducts,
            publishedProducts,
        ] = await Promise.all([
            userRepository.findByRole(UserRole.USER).then(users => users.length),
            userRepository.findByRole(UserRole.SELLER).then(sellers => sellers.length),
            userRepository.findSellersByStatus(SellerStatus.PENDING).then(sellers => sellers.length),
            productRepository.findMany({}).then(result => result.total),
            productRepository.findMany({ review_status: ProductReviewStatus.PENDING }).then(result => result.total),
            productRepository.findMany({ status: ProductStatus.PUBLISHED }).then(result => result.total),
        ]);

        return {
            users: {
                total: totalUsers,
                sellers: totalSellers,
                pending_seller_applications: pendingSellers,
            },
            products: {
                total: totalProducts,
                pending_review: pendingProducts,
                published: publishedProducts,
            },
        };
    }

    /**
     * Get all sellers with status
     */
    async getAllSellers(status?: SellerStatus) {
        if (status) {
            return await userRepository.findSellersByStatus(status);
        }
        return await userRepository.findAllSellers();
    }

    /**
     * Approve seller
     */
    async approveSeller(userId: string, adminId: string) {
        return await sellerService.approveSeller(userId, adminId);
    }

    /**
     * Reject seller
     */
    async rejectSeller(userId: string, adminId: string, reason: string) {
        return await sellerService.rejectSeller(userId, adminId, reason);
    }

    /**
     * Get all seller applications
     */
    async getSellerApplications(status?: SellerStatus) {
        return await sellerService.getAllApplications(status);
    }

    /**
     * Approve product
     */
    async approveProduct(
        productId: string,
        adminId: string,
        checklist?: ReviewChecklist,
        notes?: string
    ) {
        const product = await productRepository.findById(productId);
        if (!product) {
            throw new NotFoundError(ERROR_CODES.PRODUCT_NOT_FOUND, { productId });
        }

        if (product.review_status !== ProductReviewStatus.PENDING) {
            throw new DomainError(ERROR_CODES.PRODUCT_NOT_APPROVED, { message: 'Sản phẩm không ở trạng thái chờ duyệt' });
        }

        // Update review status and automatically publish if product is ready
        const updateData: any = {
            review_status: ProductReviewStatus.APPROVED,
            reviewed_at: new Date(),
            reviewed_by: adminId,
            rejection_reason: null,
        };

        // Auto-publish chỉ khi đủ điều kiện hiển thị public
        const hasPublishRequirements =
            !!product.title &&
            !!product.description &&
            !!product.thumbnail_url &&
            (product.type !== ProductType.WORKFLOW || !!product.workflow_file_url);

        updateData.status = hasPublishRequirements ? ProductStatus.PUBLISHED : ProductStatus.DRAFT;

        const updated = await productRepository.update(productId, updateData);

        if (!updated) {
            throw new DomainError(ERROR_CODES.PRODUCT_UPDATE_FAILED, { productId });
        }

        // Log audit
        await auditLogService.logApproval(
            productId,
            adminId,
            product.review_status,
            checklist,
            notes
        );

        return updated;
    }

    /**
     * Reject product
     */
    async rejectProduct(
        productId: string,
        adminId: string,
        reason: string,
        checklist?: ReviewChecklist,
        notes?: string
    ) {
        const product = await productRepository.findById(productId);
        if (!product) {
            throw new NotFoundError(ERROR_CODES.PRODUCT_NOT_FOUND, { productId });
        }

        if (product.review_status !== ProductReviewStatus.PENDING) {
            throw new DomainError(ERROR_CODES.PRODUCT_NOT_APPROVED, { message: 'Sản phẩm không ở trạng thái chờ duyệt' });
        }

        const updated = await productRepository.update(productId, {
            review_status: ProductReviewStatus.REJECTED,
            reviewed_at: new Date(),
            reviewed_by: adminId,
            rejection_reason: reason,
        } as any);

        if (!updated) {
            throw new DomainError(ERROR_CODES.PRODUCT_UPDATE_FAILED, { productId });
        }

        // Log audit
        await auditLogService.logRejection(
            productId,
            adminId,
            product.review_status,
            reason,
            checklist,
            notes
        );

        return updated;
    }

    /**
     * Get products pending review
     */
    async getProductsPendingReview(filters: {
        limit?: number;
        offset?: number;
    } = {}) {
        return await productRepository.findMany({
            review_status: ProductReviewStatus.PENDING,
            limit: filters.limit || 50,
            offset: filters.offset || 0,
        });
    }

    /**
     * Request changes for product (keeps it in pending state)
     */
    async requestProductChanges(
        productId: string,
        adminId: string,
        reason: string,
        checklist?: ReviewChecklist,
        notes?: string
    ) {
        const product = await productRepository.findById(productId);
        if (!product) {
            throw new NotFoundError(ERROR_CODES.PRODUCT_NOT_FOUND, { productId });
        }

        if (product.review_status !== ProductReviewStatus.PENDING) {
            throw new DomainError(ERROR_CODES.PRODUCT_NOT_APPROVED, { message: 'Sản phẩm không ở trạng thái chờ duyệt' });
        }

        // Product stays in PENDING status, but we log the request for changes
        await auditLogService.logRequestChanges(
            productId,
            adminId,
            product.review_status,
            reason,
            checklist,
            notes
        );

        return product;
    }

    /**
     * Get audit log for a product
     */
    async getProductAuditLog(productId: string) {
        return await auditLogService.getProductAuditLog(productId);
    }

    /**
     * Update user role (admin only)
     */
    async updateUserRole(userId: string, role: UserRole) {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new Error('Người dùng không tồn tại');
        }

        const updated = await userRepository.update(userId, { role });
        if (!updated) {
            throw new Error('Cập nhật role thất bại');
        }

        return updated;
    }
}

export default new AdminService();

