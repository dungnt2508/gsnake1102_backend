import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import productArtifactRepository from '../repositories/product-artifact.repository';
import productRepository from '../repositories/product.repository';
import storageService from '../services/storage.service';
import { successResponse, createdResponse, errorResponse, unauthorizedResponse, notFoundResponse, badRequestResponse } from '../utils/response';
import { ArtifactType } from '@gsnake/shared-types';
import { requireSeller } from '../middleware/auth.middleware';
import { AuthorizationError, NotFoundError } from '../shared/errors';

export default async function productArtifactRoutes(fastify: FastifyInstance) {
    /**
     * POST /api/products/:productId/artifacts/upload
     * Upload artifact file for a product
     */
    fastify.post(
        '/:productId/artifacts/upload',
        {
            preHandler: [fastify.authenticate, requireSeller],
            // Note: multipart handling is done via @fastify/multipart plugin
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const userId = request.user?.userId;
                if (!userId) {
                    return unauthorizedResponse(reply);
                }

                const { productId } = request.params as { productId: string };
                const data = await request.file();

                if (!data) {
                    return badRequestResponse(reply, 'No file uploaded');
                }

                // Verify product exists and belongs to seller
                const product = await productRepository.findById(productId);
                if (!product) {
                    return notFoundResponse(reply, 'Product not found');
                }

                if (product.seller_id !== userId) {
                    return unauthorizedResponse(reply, 'You can only upload artifacts for your own products');
                }

                // Read file buffer
                const chunks: Buffer[] = [];
                for await (const chunk of data.file) {
                    chunks.push(chunk);
                }
                const buffer = Buffer.concat(chunks);

                // Determine artifact type from filename or query param
                const queryParams = request.query as any;
                const artifactTypeParam = queryParams.artifact_type as string || 'other';
                const artifactType = artifactTypeParam as ArtifactType;
                const version = queryParams.version as string | undefined;
                const isPrimaryOverride = queryParams.is_primary !== undefined ? queryParams.is_primary === 'true' || queryParams.is_primary === true : undefined;

                // Determine storage subdirectory based on artifact type
                let storageSubdir: 'artifacts' | 'thumbnails' | 'screenshots' = 'artifacts';
                if (artifactType === 'thumbnail') {
                    storageSubdir = 'thumbnails';
                } else if (artifactType === 'screenshot') {
                    storageSubdir = 'screenshots';
                }

                // Upload file
                const uploadResult = await storageService.uploadFile(
                    buffer,
                    data.filename,
                    storageSubdir
                );

                // Determine if this is primary artifact
                const isPrimary = isPrimaryOverride !== undefined
                    ? Boolean(isPrimaryOverride)
                    : artifactType === 'workflow_json' && product.type === 'workflow';

                // Save artifact record
                const artifact = await productArtifactRepository.create({
                    product_id: productId,
                    artifact_type: artifactType,
                    file_name: data.filename,
                    file_url: uploadResult.fileUrl,
                    file_size: uploadResult.fileSize,
                    mime_type: uploadResult.mimeType,
                    checksum: uploadResult.checksum,
                    is_primary: isPrimary,
                    version: version || undefined,
                });

                // Queue security scan for product (async, non-blocking)
                try {
                    const securityScanService = (await import('../services/security-scan.service')).default;
                    securityScanService.queueScan(productId, 1); // Priority 1 for new artifacts
                } catch (error) {
                    // Log error but don't fail upload
                    console.error('Failed to queue security scan:', error);
                }

                successResponse(reply, { artifact }, 'Artifact uploaded successfully');
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Failed to upload artifact';
                errorResponse(reply, message, 500, error);
            }
        }
    );

    /**
     * GET /api/products/:productId/artifacts
     * Get all artifacts for a product
     */
    fastify.get('/:productId/artifacts', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { productId } = request.params as { productId: string };

            // Verify product exists
            const product = await productRepository.findById(productId);
            if (!product) {
                return notFoundResponse(reply, 'Product not found');
            }

            // Check permissions: seller can see all, public can only see published products
            const userId = request.user?.userId;
            const isSeller = product.seller_id === userId;

            if (!isSeller && (product.status !== 'published' || product.review_status !== 'approved')) {
                return unauthorizedResponse(reply, 'Product not available');
            }

            const artifacts = await productArtifactRepository.findByProductId(productId);

            successResponse(reply, { artifacts });
        } catch (error: unknown) {
            errorResponse(reply, 'Failed to get artifacts', 500, error);
        }
    });

    /**
     * DELETE /api/products/:productId/artifacts/:artifactId
     * Delete an artifact
     */
    fastify.delete(
        '/:productId/artifacts/:artifactId',
        { preHandler: [fastify.authenticate, requireSeller] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const userId = request.user?.userId;
                if (!userId) {
                    return unauthorizedResponse(reply);
                }

                const { productId, artifactId } = request.params as { productId: string; artifactId: string };

                // Verify product exists and belongs to seller
                const product = await productRepository.findById(productId);
                if (!product) {
                    return notFoundResponse(reply, 'Product not found');
                }

                if (product.seller_id !== userId) {
                    return unauthorizedResponse(reply, 'You can only delete artifacts from your own products');
                }

                // Get artifact to delete file
                const artifact = await productArtifactRepository.findById(artifactId);
                if (!artifact || artifact.product_id !== productId) {
                    return notFoundResponse(reply, 'Artifact not found');
                }

                // Delete file from storage
                await storageService.deleteFile(artifact.file_url);

                // Delete artifact record
                await productArtifactRepository.delete(artifactId);

                successResponse(reply, null, 'Artifact deleted successfully');
            } catch (error: unknown) {
                errorResponse(reply, 'Failed to delete artifact', 500, error);
            }
        }
    );
}

