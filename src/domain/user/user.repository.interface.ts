/**
 * User repository interface
 */
export interface IUserRepository {
    findById(id: string): Promise<any | null>;
    findByEmail(email: string): Promise<any | null>;
}

