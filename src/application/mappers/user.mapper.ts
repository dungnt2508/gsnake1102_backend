import { User } from '@gsnake/shared-types';
import { UserDto } from '@gsnake/shared-types';

/**
 * Mapper to convert User domain model to DTOs
 */
export class UserMapper {
    /**
     * Convert User domain model to UserDto
     */
    static toResponseDto(user: User): UserDto {
        return {
            id: user.id,
            email: user.email,
            role: user.role,
            sellerStatus: user.seller_status || null,
            createdAt: user.created_at.toISOString(),
            updatedAt: user.updated_at.toISOString(),
        };
    }
}

