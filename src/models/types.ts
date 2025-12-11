/**
 * @deprecated This file is deprecated. Use @gsnake/shared-types instead.
 * 
 * Migration status: All imports have been migrated to @gsnake/shared-types
 * This file will be removed in the next phase.
 * 
 * If you see this file imported anywhere, please migrate to @gsnake/shared-types:
 * - Internal types (snake_case): User, Product, Article, etc. → from '@gsnake/shared-types'
 * - DTOs (camelCase): UserDto, ProductDto, etc. → from '@gsnake/shared-types'
 * 
 * See ARCHITECTURE.md for migration guidelines.
 */

// Re-export from shared-types for backward compatibility during migration
export * from '@gsnake/shared-types';
