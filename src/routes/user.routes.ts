import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import userRepository from '../repositories/user.repository';
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse, badRequestResponse } from '../utils/response';

export default async function userRoutes(fastify: FastifyInstance) {
    /**
     * GET /api/users/profile
     * Get current user's profile (protected route)
     */
    fastify.get(
        '/profile',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const userId = request.user?.userId;
                if (!userId) {
                    return unauthorizedResponse(reply);
                }

                const user = await userRepository.findById(userId);
                if (!user) {
                    return notFoundResponse(reply, 'User not found');
                }

                // Don't send password hash
                const { password_hash, ...userWithoutPassword } = user;

                successResponse(reply, { user: userWithoutPassword });
            } catch (error: unknown) {
                errorResponse(reply, 'Failed to get profile', 500, error);
            }
        }
    );

    /**
     * PUT /api/users/profile
     * Update current user's profile (protected route)
     */
    fastify.put(
        '/profile',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const userId = request.user?.userId;
                if (!userId) {
                    return unauthorizedResponse(reply);
                }

                const { email } = request.body as { email?: string };

                if (!email) {
                    return badRequestResponse(reply, 'Email is required');
                }

                const updated = await userRepository.update(userId, { email });
                if (!updated) {
                    return notFoundResponse(reply, 'User not found');
                }

                const { password_hash, ...userWithoutPassword } = updated;

                successResponse(reply, { user: userWithoutPassword }, 'Profile updated successfully');
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Failed to update profile';
                errorResponse(reply, message, 500, error);
            }
        }
    );
}
