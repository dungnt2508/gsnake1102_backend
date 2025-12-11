import userRepository from '../repositories/user.repository';
import sellerApplicationRepository from '../repositories/seller-application.repository';
import { User, UserRole, SellerStatus } from '@gsnake/shared-types';

export class SellerService {
    /**
     * Request seller status (create application)
     */
    async requestSellerStatus(userId: string, applicationData?: Record<string, any>): Promise<void> {
        // Check if user exists
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new Error('Người dùng không tồn tại');
        }

        // Check if already a seller
        if (user.role === UserRole.SELLER && user.seller_status === SellerStatus.APPROVED) {
            throw new Error('Bạn đã là seller được phê duyệt');
        }

        // Check if already has pending application
        if (user.seller_status === SellerStatus.PENDING) {
            throw new Error('Bạn đã có đơn xin làm seller đang chờ duyệt');
        }

        // Create application
        await sellerApplicationRepository.create({
            user_id: userId,
            application_data: applicationData,
        });

        // Update user seller_status to pending
        await userRepository.update(userId, {
            seller_status: SellerStatus.PENDING,
        });
    }

    /**
     * Get seller application status
     */
    async getApplicationStatus(userId: string): Promise<{
        status: SellerStatus | null;
        application: any;
        rejection_reason?: string | null;
    }> {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new Error('Người dùng không tồn tại');
        }

        const application = await sellerApplicationRepository.findByUserId(userId);

        return {
            status: user.seller_status || null,
            application: application || null,
            rejection_reason: user.seller_rejection_reason || null,
        };
    }

    /**
     * Approve seller application (admin only)
     */
    async approveSeller(userId: string, adminId: string): Promise<User> {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new Error('Người dùng không tồn tại');
        }

        if (user.seller_status !== SellerStatus.PENDING) {
            throw new Error('Người dùng không có đơn xin làm seller đang chờ duyệt');
        }

        // Update user
        const updated = await userRepository.update(userId, {
            role: UserRole.SELLER,
            seller_status: SellerStatus.APPROVED,
            seller_approved_at: new Date(),
            seller_approved_by: adminId,
            seller_rejection_reason: null,
        });

        if (!updated) {
            throw new Error('Cập nhật seller status thất bại');
        }

        // Update application
        const application = await sellerApplicationRepository.findByUserId(userId);
        if (application) {
            await sellerApplicationRepository.update(application.id, {
                status: SellerStatus.APPROVED,
                reviewed_at: new Date(),
                reviewed_by: adminId,
            });
        }

        return updated;
    }

    /**
     * Reject seller application (admin only)
     */
    async rejectSeller(userId: string, adminId: string, reason: string): Promise<User> {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new Error('Người dùng không tồn tại');
        }

        if (user.seller_status !== SellerStatus.PENDING) {
            throw new Error('Người dùng không có đơn xin làm seller đang chờ duyệt');
        }

        // Update user
        const updated = await userRepository.update(userId, {
            seller_status: SellerStatus.REJECTED,
            seller_rejection_reason: reason,
        });

        if (!updated) {
            throw new Error('Cập nhật seller status thất bại');
        }

        // Update application
        const application = await sellerApplicationRepository.findByUserId(userId);
        if (application) {
            await sellerApplicationRepository.update(application.id, {
                status: SellerStatus.REJECTED,
                reviewed_at: new Date(),
                reviewed_by: adminId,
                rejection_reason: reason,
            });
        }

        return updated;
    }

    /**
     * Get all seller applications (admin only)
     */
    async getAllApplications(status?: SellerStatus) {
        const applications = status
            ? await sellerApplicationRepository.findByStatus(status)
            : await sellerApplicationRepository.findAll();

        // Get user info for each application
        const applicationsWithUsers = await Promise.all(
            applications.map(async (app) => {
                const user = await userRepository.findById(app.user_id);
                return {
                    ...app,
                    user: user ? {
                        id: user.id,
                        email: user.email,
                        created_at: user.created_at,
                    } : null,
                };
            })
        );

        return applicationsWithUsers;
    }
}

export default new SellerService();

