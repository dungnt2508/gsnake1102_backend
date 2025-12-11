import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import authService from '../services/auth.service';
import { validate, registerSchema, loginSchema } from '../middleware/validation.middleware';
import { successResponse, createdResponse, errorResponse, unauthorizedResponse, badRequestResponse } from '../utils/response';
import { UserMapper } from '../application/mappers/user.mapper';

export default async function authRoutes(fastify: FastifyInstance) {
    /**
     * POST /api/auth/register
     * Register new user with email and password
     */
    fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
        // Let ZodError propagate to error middleware for proper validation error handling
        const data = validate(registerSchema, request.body);
        
        try {
            const result = await authService.register(data);

            // Convert to DTO
            const userDto = UserMapper.toResponseDto(result.user);

            createdResponse(reply, {
                user: userDto,
                token: result.token,
            }, 'User registered successfully');
        } catch (error: unknown) {
            // Handle service-level errors (ApplicationError, etc.)
            const { AuthenticationError } = await import('../shared/errors');
            
            if (error instanceof AuthenticationError) {
                // Re-throw to let error middleware handle with proper format
                throw error;
            }

            // Unknown errors - let error middleware handle
            throw error;
        }
    });

    /**
     * POST /api/auth/login
     * Login with email and password
     */
    fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
        // Let ZodError propagate to error middleware for proper validation error handling
        const data = validate(loginSchema, request.body);
        
        try {
            const result = await authService.login(data);

            // Convert to DTO
            const userDto = UserMapper.toResponseDto(result.user);

            successResponse(reply, {
                user: userDto,
                token: result.token,
            }, 'Login successful');
        } catch (error: unknown) {
            // Re-throw to let error middleware handle with proper format
            throw error;
        }
    });

    /**
     * GET /api/auth/google
     * Get Google OAuth authorization URL
     */
    fastify.get('/google', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const query = request.query as { state?: string };
            const authUrl = authService.getGoogleAuthUrl(query.state);
            successResponse(reply, { authUrl });
        } catch (error: unknown) {
            errorResponse(reply, 'Failed to generate Google auth URL', 500, error);
        }
    });

    /**
     * GET /api/auth/google/callback
     * Google OAuth callback handler
     */
    fastify.get('/google/callback', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { code } = request.query as { code?: string };

            if (!code) {
                return reply.status(400).send({
                    error: true,
                    message: 'Authorization code is required',
                });
            }

            const result = await authService.googleCallback(code);

            const userDto = UserMapper.toResponseDto(result.user);

            successResponse(reply, {
                user: userDto,
                token: result.token,
            }, 'Google login successful');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Google authentication failed';
            unauthorizedResponse(reply, message);
        }
    });

    /**
     * GET /api/auth/azure
     * Get Azure OAuth authorization URL
     */
    fastify.get('/azure', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const authUrl = authService.getAzureAuthUrl();
            successResponse(reply, { authUrl });
        } catch (error: unknown) {
            errorResponse(reply, 'Failed to generate Azure auth URL', 500, error);
        }
    });

    /**
     * GET /api/auth/azure/callback
     * Azure OAuth callback handler
     */
    fastify.get('/azure/callback', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { code } = request.query as { code?: string };

            if (!code) {
                return reply.status(400).send({
                    error: true,
                    message: 'Authorization code is required',
                });
            }

            const result = await authService.azureCallback(code);

            // Convert to DTO
            const userDto = UserMapper.toResponseDto(result.user);

            successResponse(reply, {
                user: userDto,
                token: result.token,
            }, 'Azure login successful');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Azure authentication failed';
            unauthorizedResponse(reply, message);
        }
    });

    /**
     * GET /api/auth/me
     * Get current user info (requires authentication)
     */
    fastify.get(
        '/me',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                // Fetch full user data from database to include role and seller_status
                const userRepository = (await import('../repositories/user.repository')).default;
                const user = await userRepository.findById(request.user!.userId);
                
                if (!user) {
                    return unauthorizedResponse(reply, 'User not found');
                }

                successResponse(reply, {
                    user: {
                        userId: user.id,
                        email: user.email,
                        role: user.role,
                        seller_status: user.seller_status,
                        seller_approved_at: user.seller_approved_at,
                        seller_rejection_reason: user.seller_rejection_reason,
                    },
                });
            } catch (error: unknown) {
                errorResponse(reply, 'Failed to get user info', 500, error);
            }
        }
    );
}
