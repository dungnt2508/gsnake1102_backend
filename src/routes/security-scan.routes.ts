import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import securityScanService from '../services/security-scan.service';
import productRepository from '../repositories/product.repository';
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse, badRequestResponse } from '../utils/response';
import { requireAdmin, requireSeller } from '../middleware/auth.middleware';
import { NotFoundError } from '../shared/errors';

export default async function securityScanRoutes(fastify: FastifyInstance) {
    /**
     * POST /api/products/:productId/security-scan
     * Trigger security scan for a product (seller or admin)
     */
    fastify.post(
        '/:productId/security-scan',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const userId = request.user?.userId;
                if (!userId) {
                    return unauthorizedResponse(reply);
                }

                const { productId } = request.params as { productId: string };

                // Verify product exists
                const product = await productRepository.findById(productId);
                if (!product) {
                    return notFoundResponse(reply, 'Product not found');
                }

                // Check permissions: seller can scan own products, admin can scan any
                const isSeller = product.seller_id === userId;
                const isAdmin = (request.user as any).role === 'admin';

                if (!isSeller && !isAdmin) {
                    return unauthorizedResponse(reply, 'You can only scan your own products');
                }

                // Queue scan (non-blocking)
                securityScanService.queueScan(productId);

                successResponse(reply, { message: 'Security scan started' }, 'Security scan queued successfully');
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Failed to start security scan';
                errorResponse(reply, message, 500, error);
            }
        }
    );

    /**
     * GET /api/products/:productId/security-scan-status
     * Get security scan status and results
     */
    fastify.get('/:productId/security-scan-status', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const userId = request.user?.userId;
            const { productId } = request.params as { productId: string };

            // Verify product exists
            const product = await productRepository.findById(productId);
            if (!product) {
                return notFoundResponse(reply, 'Product not found');
            }

            // Check permissions
            const isSeller = product.seller_id === userId;
            const isAdmin = (request.user as any)?.role === 'admin';

            if (!isSeller && !isAdmin && product.status !== 'published') {
                return unauthorizedResponse(reply, 'Product not available');
            }

            // Return scan status from product
            successResponse(reply, {
                status: product.security_scan_status || 'pending',
                result: product.security_scan_result || null,
                scannedAt: product.security_scan_at || null,
            });
        } catch (error: unknown) {
            errorResponse(reply, 'Failed to get security scan status', 500, error);
        }
    });

    /**
     * POST /api/admin/products/:productId/security-scan/force
     * Force security scan (admin only, synchronous)
     */
    fastify.post(
        '/:productId/security-scan/force',
        { preHandler: [fastify.authenticate, requireAdmin] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const { productId } = request.params as { productId: string };

                // Perform scan synchronously
                const result = await securityScanService.scanProduct(productId);

                // Update product
                await securityScanService.updateProductScanStatus(productId, result);

                successResponse(reply, { result }, 'Security scan completed');
            } catch (error: unknown) {
                const { NotFoundError } = await import('../shared/errors');
                if (error instanceof NotFoundError) return notFoundResponse(reply, error.message);
                const message = error instanceof Error ? error.message : 'Failed to scan product';
                errorResponse(reply, message, 500, error);
            }
        }
    );
}

