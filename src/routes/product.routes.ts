import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import productService from '../services/product.service';
import { validate, createProductSchema, updateProductSchema } from '../middleware/validation.middleware';
import { successResponse, createdResponse, errorResponse, unauthorizedResponse, notFoundResponse, badRequestResponse } from '../utils/response';
import { ProductType, ProductStatus, CreateProductInput, UpdateProductInput } from '@gsnake/shared-types';
import { ProductMapper } from '../application/mappers/product.mapper';
import { z } from 'zod';
import { requireSeller } from '../middleware/auth.middleware';

export default async function productRoutes(fastify: FastifyInstance) {
    /**
     * GET /api/products
     * Get all products (public - only published)
     * Query params: type, search, tags, limit, offset, sort_by, sort_order
     */
    fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const query = request.query as {
                type?: string;
                search?: string;
                tags?: string;
                limit?: string;
                offset?: string;
                seller_id?: string;
                price_type?: string;
                is_free?: string;
                sort_by?: string;
                sort_order?: string;
            };

            const filters = {
                type: query.type as ProductType | undefined,
                seller_id: query.seller_id,
                search: query.search,
                tags: query.tags ? query.tags.split(',').map(t => t.trim()) : undefined,
                limit: query.limit ? parseInt(query.limit, 10) : 50,
                offset: query.offset ? parseInt(query.offset, 10) : 0,
                price_type: query.price_type as any,
                is_free: query.is_free === 'true' ? true : query.is_free === 'false' ? false : undefined,
                sort_by: (query.sort_by as 'created_at' | 'rating' | 'downloads' | 'sales_count' | 'price') || 'created_at',
                sort_order: (query.sort_order as 'asc' | 'desc') || 'desc',
            };

            const result = await productService.getProducts(filters);

            // Convert to DTOs
            const productDtos = ProductMapper.toResponseDtoList(result.products);

            successResponse(reply, {
                products: productDtos,
                total: result.total,
                limit: filters.limit,
                offset: filters.offset,
            });
        } catch (error: unknown) {
            errorResponse(reply, 'Failed to get products', 500, error);
        }
    });

    /**
     * GET /api/products/my
     * Get current seller's products (authenticated)
     */
    fastify.get(
        '/my',
        { preHandler: [fastify.authenticate, requireSeller] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const userId = request.user?.userId;
                if (!userId) {
                    return unauthorizedResponse(reply);
                }

                const query = request.query as { include_drafts?: string };
                const includeDrafts = query.include_drafts === 'true';

                const products = await productService.getSellerProducts(userId, includeDrafts);

                // Convert to DTOs
                const productDtos = ProductMapper.toResponseDtoList(products);

                successResponse(reply, { products: productDtos });
            } catch (error: unknown) {
                errorResponse(reply, 'Failed to get seller products', 500, error);
            }
        }
    );

    /**
     * GET /api/products/my/:id
     * Get seller's own product by ID (authenticated - can access drafts)
     */
    fastify.get(
        '/my/:id',
        { preHandler: [fastify.authenticate, requireSeller] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const userId = request.user?.userId;
                if (!userId) {
                    return unauthorizedResponse(reply);
                }

                const { id } = request.params as { id: string };
                const product = await productService.getProduct(id);

                if (!product) {
                    return notFoundResponse(reply, 'Product not found');
                }

                // Check if product belongs to seller
                if (product.seller_id !== userId) {
                    return unauthorizedResponse(reply, 'You can only access your own products');
                }

                successResponse(reply, { product });
            } catch (error: unknown) {
                errorResponse(reply, 'Failed to get product', 500, error);
            }
        }
    );

    /**
     * GET /api/products/featured
     * Get featured/popular products
     */
    fastify.get('/featured', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const query = request.query as { limit?: string };
            const limit = query.limit ? parseInt(query.limit, 10) : 6;

            const products = await productService.getFeaturedProducts(limit);

            const productDtos = ProductMapper.toResponseDtoList(products);

            successResponse(reply, { products: productDtos });
        } catch (error: unknown) {
            errorResponse(reply, 'Failed to get featured products', 500, error);
        }
    });

    /**
     * GET /api/products/:id
     * Get product by ID (public - only published)
     */
    fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { id } = request.params as { id: string };
            const product = await productService.getPublicProduct(id);

            if (!product) {
                return notFoundResponse(reply, 'Product not found');
            }

            // Convert to DTO
            const productDto = ProductMapper.toResponseDto(product);

            successResponse(reply, { product: productDto });
        } catch (error: unknown) {
            errorResponse(reply, 'Failed to get product', 500, error);
        }
    });

    /**
     * POST /api/products/:id/download
     * Log download (public), returns file URL; increments downloads and optional sales_count
     */
    fastify.post('/:id/download', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { id } = request.params as { id: string };
            const body = request.body as { type?: string };
            const type = body?.type === 'manual' ? 'manual' : 'free';

            let buyerId: string | null = null;
            // Optional auth: try jwtVerify, ignore failure
            try {
                const token = await request.jwtVerify();
                buyerId = (token as any).userId || null;
            } catch {
                buyerId = null;
            }

            const result = await productService.recordDownloadWithLog(id, buyerId, type as any);
            successResponse(reply, { downloadUrl: result.url });
        } catch (error: unknown) {
            const { NotFoundError, DomainError } = await import('../shared/errors');
            if (error instanceof NotFoundError) return notFoundResponse(reply, error.message);
            if (error instanceof DomainError) return badRequestResponse(reply, error.message);
            errorResponse(reply, 'Failed to record download', 500, error);
        }
    });

    /**
     * POST /api/products
     * Create new product (authenticated - seller only)
     */
    fastify.post(
        '/',
        { preHandler: [fastify.authenticate, requireSeller] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const userId = request.user?.userId;
                if (!userId) {
                    return unauthorizedResponse(reply);
                }

                const data = validate(createProductSchema, request.body);
                
                // Validation schema already returns snake_case matching CreateProductInput
                // Type assertion needed because Zod enum types don't match exactly
                const input = {
                    ...data,
                    seller_id: userId,
                    type: data.type as ProductType,
                } as CreateProductInput;
                
                const product = await productService.createProduct(input);

                // Convert to DTO for response
                const productDto = ProductMapper.toResponseDto(product);

                createdResponse(reply, { product: productDto }, 'Product created successfully');
            } catch (error: unknown) {
                const { AuthorizationError, NotFoundError, DomainError } = await import('../shared/errors');
                
                if (error instanceof AuthorizationError) {
                    return unauthorizedResponse(reply, error.message);
                }
                
                if (error instanceof NotFoundError) {
                    return notFoundResponse(reply, error.message);
                }

                if (error instanceof DomainError) {
                    return badRequestResponse(reply, error.message);
                }

                const message = error instanceof Error ? error.message : 'Failed to create product';
                badRequestResponse(reply, message);
            }
        }
    );

    /**
     * PUT /api/products/:id
     * Update product (authenticated - seller only)
     */
    fastify.put(
        '/:id',
        { preHandler: [fastify.authenticate, requireSeller] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const userId = request.user?.userId;
                if (!userId) {
                    return unauthorizedResponse(reply);
                }

                const { id } = request.params as { id: string };
                const data = validate(updateProductSchema, request.body);

                // Type assertion needed because Zod enum types don't match exactly
                const updateData = {
                    ...data,
                    type: data.type as ProductType | undefined,
                } as UpdateProductInput;

                const product = await productService.updateProduct(id, userId, updateData);

                // Convert to DTO for response
                const productDto = ProductMapper.toResponseDto(product);

                successResponse(reply, { product: productDto }, 'Product updated successfully');
            } catch (error: unknown) {
                // Use error type checking instead of string matching
                const { AuthorizationError, NotFoundError, DomainError } = await import('../shared/errors');
                
                if (error instanceof AuthorizationError) {
                    return unauthorizedResponse(reply, error.message);
                }
                
                if (error instanceof NotFoundError) {
                    return notFoundResponse(reply, error.message);
                }

                if (error instanceof DomainError) {
                    return badRequestResponse(reply, error.message);
                }

                const message = error instanceof Error ? error.message : 'Failed to update product';
                badRequestResponse(reply, message);
            }
        }
    );

    /**
     * DELETE /api/products/:id
     * Delete product (authenticated - seller only)
     */
    fastify.delete(
        '/:id',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const userId = request.user?.userId;
                if (!userId) {
                    return unauthorizedResponse(reply);
                }

                const { id } = request.params as { id: string };
                await productService.deleteProduct(id, userId);

                successResponse(reply, null, 'Product deleted successfully');
            } catch (error: unknown) {
                const { AuthorizationError, NotFoundError, DomainError } = await import('../shared/errors');
                
                if (error instanceof AuthorizationError) {
                    return unauthorizedResponse(reply, error.message);
                }
                
                if (error instanceof NotFoundError) {
                    return notFoundResponse(reply, error.message);
                }

                if (error instanceof DomainError) {
                    return badRequestResponse(reply, error.message);
                }

                const message = error instanceof Error ? error.message : 'Failed to delete product';
                badRequestResponse(reply, message);
            }
        }
    );

    /**
     * POST /api/products/:id/publish
     * Publish product (draft → published)
     */
    fastify.post(
        '/:id/publish',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const userId = request.user?.userId;
                if (!userId) {
                    return unauthorizedResponse(reply);
                }

                const { id } = request.params as { id: string };
                const product = await productService.publishProduct(id, userId);

                const message =
                    product.review_status === 'pending'
                        ? 'Yêu cầu duyệt sản phẩm đã được gửi. Admin sẽ xem và phê duyệt trước khi đăng.'
                        : 'Product published successfully';

                successResponse(reply, { product }, message);
            } catch (error: unknown) {
                const { AuthorizationError, NotFoundError, DomainError } = await import('../shared/errors');
                
                if (error instanceof AuthorizationError) {
                    return unauthorizedResponse(reply, error.message);
                }
                
                if (error instanceof NotFoundError) {
                    return notFoundResponse(reply, error.message);
                }

                if (error instanceof DomainError) {
                    return badRequestResponse(reply, error.message);
                }

                const message = error instanceof Error ? error.message : 'Failed to publish product';
                badRequestResponse(reply, message);
            }
        }
    );

    /**
     * POST /api/products/:id/unpublish
     * Unpublish product (published → draft)
     */
    fastify.post(
        '/:id/unpublish',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const userId = request.user?.userId;
                if (!userId) {
                    return unauthorizedResponse(reply);
                }

                const { id } = request.params as { id: string };
                const product = await productService.unpublishProduct(id, userId);

                successResponse(reply, { product }, 'Product unpublished successfully');
            } catch (error: unknown) {
                const { AuthorizationError, NotFoundError, DomainError } = await import('../shared/errors');
                
                if (error instanceof AuthorizationError) {
                    return unauthorizedResponse(reply, error.message);
                }
                
                if (error instanceof NotFoundError) {
                    return notFoundResponse(reply, error.message);
                }

                if (error instanceof DomainError) {
                    return badRequestResponse(reply, error.message);
                }

                const message = error instanceof Error ? error.message : 'Failed to unpublish product';
                badRequestResponse(reply, message);
            }
        }
    );

    // Register artifact routes
    await fastify.register(async function (fastify: FastifyInstance) {
        const artifactRoutes = (await import('./product-artifact.routes')).default;
        await artifactRoutes(fastify);
    });

    // Register workflow routes
    await fastify.register(async function (fastify: FastifyInstance) {
        const workflowRoutes = (await import('./product-workflow.routes')).default;
        await workflowRoutes(fastify);
    });

    // Register security scan routes
    await fastify.register(async function (fastify: FastifyInstance) {
        const securityScanRoutes = (await import('./security-scan.routes')).default;
        await securityScanRoutes(fastify);
    });
}

