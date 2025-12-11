import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import productWorkflowRepository from '../repositories/product-workflow.repository';
import productRepository from '../repositories/product.repository';
import workflowValidationService from '../services/workflow-validation.service';
import storageService from '../services/storage.service';
import { validate } from '../middleware/validation.middleware';
import { z } from 'zod';
import { successResponse, createdResponse, errorResponse, unauthorizedResponse, notFoundResponse, badRequestResponse } from '../utils/response';
import { requireSeller } from '../middleware/auth.middleware';
import { ProductType } from '@gsnake/shared-types';

// Schema for workflow details
const createWorkflowDetailsSchema = z.object({
    n8n_version: z.string().optional(),
    workflow_json_url: z.string().url().optional(),
    env_example_url: z.string().url().optional(),
    readme_url: z.string().url().optional(),
});

const updateWorkflowDetailsSchema = createWorkflowDetailsSchema.partial();

export default async function productWorkflowRoutes(fastify: FastifyInstance) {
    /**
     * POST /api/products/:productId/workflow-details
     * Create or update workflow-specific details
     */
    fastify.post(
        '/:productId/workflow-details',
        { preHandler: [fastify.authenticate, requireSeller] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const userId = request.user?.userId;
                if (!userId) {
                    return unauthorizedResponse(reply);
                }

                const { productId } = request.params as { productId: string };
                const data = validate(createWorkflowDetailsSchema, request.body);

                // Verify product exists, belongs to seller, and is workflow type
                const product = await productRepository.findById(productId);
                if (!product) {
                    return notFoundResponse(reply, 'Product not found');
                }

                if (product.seller_id !== userId) {
                    return unauthorizedResponse(reply, 'You can only update workflow details for your own products');
                }

                if (product.type !== ProductType.WORKFLOW) {
                    return badRequestResponse(reply, 'Product is not a workflow type');
                }

                // Check if workflow details already exist
                const existing = await productWorkflowRepository.findByProductId(productId);

                // Prepare workflow data with metadata
                const workflowData: any = {
                    ...data,
                };

                // If workflow_json_url is provided, validate the workflow JSON
                if (data.workflow_json_url) {
                    try {
                        const workflowBuffer = await storageService.readFile(data.workflow_json_url);
                        const workflowJson = JSON.parse(workflowBuffer.toString());
                        const validation = workflowValidationService.validateWorkflowJson(workflowJson);

                        if (!validation.valid) {
                            return badRequestResponse(reply, `Invalid workflow JSON: ${validation.errors.join(', ')}`);
                        }

                        // Extract metadata if validation passed
                        const metadata = workflowValidationService.extractWorkflowMetadata(workflowJson);
                        workflowData.nodes_count = metadata.nodesCount;
                        workflowData.triggers = metadata.triggers;
                        workflowData.credentials_required = metadata.credentials;
                    } catch (error: any) {
                        return badRequestResponse(reply, `Failed to validate workflow JSON: ${error.message}`);
                    }
                }

                let workflow;
                if (existing) {
                    // Update existing
                    workflow = await productWorkflowRepository.update(productId, workflowData);
                } else {
                    // Create new
                    workflow = await productWorkflowRepository.create({
                        product_id: productId,
                        ...workflowData,
                    });
                }

                if (!workflow) {
                    return errorResponse(reply, 'Failed to save workflow details', 500);
                }

                successResponse(reply, { workflow }, 'Workflow details saved successfully');
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Failed to save workflow details';
                errorResponse(reply, message, 500, error);
            }
        }
    );

    /**
     * GET /api/products/:productId/workflow-details
     * Get workflow-specific details
     */
    fastify.get('/:productId/workflow-details', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { productId } = request.params as { productId: string };

            // Verify product exists
            const product = await productRepository.findById(productId);
            if (!product) {
                return notFoundResponse(reply, 'Product not found');
            }

            // Check permissions
            const userId = request.user?.userId;
            const isSeller = product.seller_id === userId;

            if (!isSeller && (product.status !== 'published' || product.review_status !== 'approved')) {
                return unauthorizedResponse(reply, 'Product not available');
            }

            const workflow = await productWorkflowRepository.findByProductId(productId);
            if (!workflow) {
                return notFoundResponse(reply, 'Workflow details not found');
            }

            successResponse(reply, { workflow });
        } catch (error: unknown) {
            errorResponse(reply, 'Failed to get workflow details', 500, error);
        }
    });
}

