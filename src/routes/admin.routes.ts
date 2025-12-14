import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import adminService from '../services/admin.service';
import productRepository from '../repositories/product.repository';
import sellerService from '../services/seller.service';
import { validate } from '../middleware/validation.middleware';
import { z } from 'zod';
import { successResponse, errorResponse, unauthorizedResponse, badRequestResponse, notFoundResponse } from '../utils/response';
import { requireAdmin } from '../middleware/auth.middleware';
import { ProductMapper } from '../application/mappers/product.mapper';

export default async function adminRoutes(fastify: FastifyInstance) {
    // All admin routes require authentication and admin role
    fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
        // First authenticate JWT token
        await fastify.authenticate(request, reply);
        // Then check if user is admin
        await requireAdmin(request, reply);
    });

    /**
     * GET /api/admin/dashboard
     * Get dashboard statistics
     */
    fastify.get('/dashboard', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const stats = await adminService.getDashboardStats();
            successResponse(reply, stats);
        } catch (error: unknown) {
            errorResponse(reply, 'Failed to get dashboard stats', 500, error);
        }
    });

    /**
     * GET /api/admin/sellers
     * Get all sellers with optional status filter
     */
    fastify.get('/sellers', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const query = request.query as { status?: string };
            const status = query.status as any;
            const sellers = await adminService.getAllSellers(status);
            successResponse(reply, { sellers });
        } catch (error: unknown) {
            errorResponse(reply, 'Failed to get sellers', 500, error);
        }
    });

    /**
     * GET /api/admin/seller-applications
     * Get all seller applications
     */
    fastify.get('/seller-applications', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const query = request.query as { status?: string };
            const status = query.status as any;
            const applications = await adminService.getSellerApplications(status);
            successResponse(reply, { applications });
        } catch (error: unknown) {
            errorResponse(reply, 'Failed to get seller applications', 500, error);
        }
    });

    /**
     * POST /api/admin/sellers/:id/approve
     * Approve seller application
     */
    fastify.post('/sellers/:id/approve', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const userId = request.user?.userId;
            if (!userId) {
                return unauthorizedResponse(reply);
            }

            const { id } = request.params as { id: string };
            const seller = await adminService.approveSeller(id, userId);
            successResponse(reply, { seller }, 'Seller approved successfully');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to approve seller';
            badRequestResponse(reply, message);
        }
    });

    /**
     * POST /api/admin/sellers/:id/reject
     * Reject seller application
     */
    fastify.post('/sellers/:id/reject', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const userId = request.user?.userId;
            if (!userId) {
                return unauthorizedResponse(reply);
            }

            const { id } = request.params as { id: string };
            const body = request.body as { reason: string };
            
            if (!body.reason || body.reason.trim().length === 0) {
                return badRequestResponse(reply, 'Rejection reason is required');
            }

            const seller = await adminService.rejectSeller(id, userId, body.reason);
            successResponse(reply, { seller }, 'Seller rejected');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to reject seller';
            badRequestResponse(reply, message);
        }
    });

    /**
     * GET /api/admin/products
     * Get all products pending review (or filter by status/review_status)
     */
    fastify.get('/products', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const query = request.query as { 
                status?: string;
                review_status?: string;
                limit?: string; 
                offset?: string;
                sort_by?: string;
                sort_order?: string;
            };
            
            const filters: any = {
                limit: query.limit ? parseInt(query.limit, 10) : 50,
                offset: query.offset ? parseInt(query.offset, 10) : 0,
                sort_by: query.sort_by || 'created_at',
                sort_order: query.sort_order as any || 'desc',
                // DEFAULT: Show only PENDING review products
                review_status: query.review_status || 'pending',
            };

            if (query.status) filters.status = query.status;

            const result = await productRepository.findMany(filters);
            
            successResponse(reply, {
                products: ProductMapper.toResponseDtoList(result.products),
                total: result.total,
                limit: filters.limit,
                offset: filters.offset,
            });
        } catch (error: unknown) {
            errorResponse(reply, 'Failed to get products', 500, error);
        }
    });

    /**
     * GET /api/admin/products/pending
     * Get products pending review
     */
    fastify.get('/products/pending', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const query = request.query as { limit?: string; offset?: string };
            const result = await adminService.getProductsPendingReview({
                limit: query.limit ? parseInt(query.limit, 10) : 50,
                offset: query.offset ? parseInt(query.offset, 10) : 0,
            });
            successResponse(reply, {
                ...result,
                products: ProductMapper.toResponseDtoList(result.products),
            });
        } catch (error: unknown) {
            errorResponse(reply, 'Failed to get pending products', 500, error);
        }
    });

    /**
     * POST /api/admin/products/:id/approve
     * Approve product
     */
    fastify.post('/products/:id/approve', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const userId = request.user?.userId;
            if (!userId) {
                return unauthorizedResponse(reply);
            }

            const { id } = request.params as { id: string };
            const body = (request.body || {}) as { 
                checklist?: Record<string, boolean>;
                notes?: string;
            };

            const product = await adminService.approveProduct(
                id,
                userId,
                body.checklist,
                body.notes
            );
            successResponse(reply, { product: ProductMapper.toResponseDto(product) }, 'Product approved successfully');
        } catch (error: unknown) {
            const { NotFoundError, DomainError } = await import('../shared/errors');
            if (error instanceof NotFoundError) return notFoundResponse(reply, error.message);
            if (error instanceof DomainError) return badRequestResponse(reply, error.message);
            const message = error instanceof Error ? error.message : 'Failed to approve product';
            badRequestResponse(reply, message);
        }
    });

    /**
     * POST /api/admin/products/:id/reject
     * Reject product
     */
    fastify.post('/products/:id/reject', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const userId = request.user?.userId;
            if (!userId) {
                return unauthorizedResponse(reply);
            }

            const { id } = request.params as { id: string };
            const body = (request.body || {}) as { 
                reason: string;
                checklist?: Record<string, boolean>;
                notes?: string;
            };
            
            if (!body.reason || body.reason.trim().length === 0) {
                return badRequestResponse(reply, 'Rejection reason is required');
            }

            const product = await adminService.rejectProduct(
                id,
                userId,
                body.reason,
                body.checklist,
                body.notes
            );
            successResponse(reply, { product: ProductMapper.toResponseDto(product) }, 'Product rejected');
        } catch (error: unknown) {
            const { NotFoundError, DomainError } = await import('../shared/errors');
            if (error instanceof NotFoundError) return notFoundResponse(reply, error.message);
            if (error instanceof DomainError) return badRequestResponse(reply, error.message);
            const message = error instanceof Error ? error.message : 'Failed to reject product';
            badRequestResponse(reply, message);
        }
    });

    /**
     * POST /api/admin/products/:id/request-changes
     * Request changes for product (keeps in pending state)
     */
    fastify.post('/products/:id/request-changes', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const userId = request.user?.userId;
            if (!userId) {
                return unauthorizedResponse(reply);
            }

            const { id } = request.params as { id: string };
            const body = request.body as { 
                reason: string;
                checklist?: Record<string, boolean>;
                notes?: string;
            };
            
            if (!body.reason || body.reason.trim().length === 0) {
                return badRequestResponse(reply, 'Reason is required');
            }

            const product = await adminService.requestProductChanges(
                id,
                userId,
                body.reason,
                body.checklist,
                body.notes
            );
            successResponse(reply, { product: ProductMapper.toResponseDto(product) }, 'Changes requested');
        } catch (error: unknown) {
            const { NotFoundError, DomainError } = await import('../shared/errors');
            if (error instanceof NotFoundError) return notFoundResponse(reply, error.message);
            if (error instanceof DomainError) return badRequestResponse(reply, error.message);
            const message = error instanceof Error ? error.message : 'Failed to request changes';
            badRequestResponse(reply, message);
        }
    });

    /**
     * GET /api/admin/products/:id/audit-log
     * Get audit log for a product
     */
    fastify.get('/products/:id/audit-log', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { id } = request.params as { id: string };
            const auditLog = await adminService.getProductAuditLog(id);
            successResponse(reply, { auditLog });
        } catch (error: unknown) {
            errorResponse(reply, 'Failed to get audit log', 500, error);
        }
    });

    /**
     * PUT /api/admin/users/:id/role
     * Update user role
     */
    fastify.put('/users/:id/role', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { id } = request.params as { id: string };
            const body = validate(z.object({
                role: z.enum(['user', 'seller', 'admin']),
            }), request.body);

            const user = await adminService.updateUserRole(id, body.role as any);
            successResponse(reply, { user }, 'User role updated successfully');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to update user role';
            badRequestResponse(reply, message);
        }
    });
}

