import { FastifyRequest, FastifyReply } from 'fastify';
import userRepository from '../repositories/user.repository';
import { UserRole, SellerStatus } from '@gsnake/shared-types';
import { unauthorizedResponse } from '../utils/response';
import { AuthenticationError, AuthorizationError, ERROR_CODES } from '../shared/errors';

/**
 * Authenticate JWT token (used as preHandler)
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
    try {
        await request.jwtVerify();
    } catch (err) {
        return unauthorizedResponse(reply, 'Invalid or expired token');
    }
}

/**
 * Require user to be authenticated
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
        return unauthorizedResponse(reply, 'Authentication required');
    }
}

/**
 * Require user to be admin
 * Checks role from JWT (no DB query needed)
 */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
        return unauthorizedResponse(reply, 'Authentication required');
    }

    // Role is already in JWT payload, no need to query DB
    if (request.user.role !== UserRole.ADMIN) {
        return unauthorizedResponse(reply, 'Admin access required');
    }
}

/**
 * Require user to be approved seller
 * Checks role from JWT first, then queries DB only for seller_status
 */
export async function requireSeller(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
        return unauthorizedResponse(reply, 'Authentication required');
    }

    // Check role from JWT first (no DB query)
    if (request.user.role !== UserRole.SELLER) {
        return unauthorizedResponse(reply, 'Seller role required');
    }

    // Only query DB when we need to check seller_status (not in JWT)
    const user = await userRepository.findById(request.user.userId);
    if (!user || user.seller_status !== SellerStatus.APPROVED) {
        return unauthorizedResponse(reply, 'Approved seller access required. Please apply for seller status and wait for approval.');
    }
}
