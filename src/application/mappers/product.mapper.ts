import { Product, CreateProductInput } from '@gsnake/shared-types';
import { ProductResponseDto } from '../dtos/product/product-response.dto';
import { CreateProductDto } from '../dtos/product/create-product.dto';

/**
 * Mapper to convert between domain models and DTOs
 */
export class ProductMapper {
    /**
     * Convert Product model to ProductResponseDto
     * Maps snake_case fields to camelCase DTO format
     * Note: JSON fields (tags, metadata, etc.) are already parsed by repository
     */
    static toResponseDto(product: Product): ProductResponseDto {
        return new ProductResponseDto({
            id: product.id,
            sellerId: product.seller_id,
            title: product.title,
            description: product.description,
            longDescription: product.long_description,
            type: product.type,
            tags: product.tags, // Already parsed array
            workflowFileUrl: product.workflow_file_url,
            thumbnailUrl: product.thumbnail_url,
            previewImageUrl: product.preview_image_url,
            isFree: product.is_free,
            price: product.price,
            currency: product.currency,
            priceType: product.price_type,
            status: product.status,
            reviewStatus: product.review_status,
            reviewedAt: product.reviewed_at ? product.reviewed_at.toISOString() : null,
            reviewedBy: product.reviewed_by,
            rejectionReason: product.rejection_reason,
            downloads: product.downloads,
            salesCount: product.sales_count,
            rating: product.rating,
            reviewsCount: product.reviews_count,
            version: product.version,
            requirements: product.requirements, // Already parsed array
            features: product.features, // Already parsed array
            installGuide: product.install_guide,
            metadata: product.metadata, // Already parsed object
            // Phase 1 new fields
            changelog: (product as any).changelog,
            license: (product as any).license,
            authorContact: (product as any).author_contact,
            supportUrl: (product as any).support_url,
            screenshots: (product as any).screenshots || [],
            platformRequirements: (product as any).platform_requirements || {},
            ownershipDeclaration: (product as any).ownership_declaration || false,
            ownershipProofUrl: (product as any).ownership_proof_url,
            termsAcceptedAt: (product as any).terms_accepted_at ? (product as any).terms_accepted_at.toISOString() : null,
            securityScanStatus: (product as any).security_scan_status,
            securityScanResult: (product as any).security_scan_result,
            securityScanAt: (product as any).security_scan_at ? (product as any).security_scan_at.toISOString() : null,
            createdAt: product.created_at.toISOString(),
            updatedAt: product.updated_at.toISOString(),
        });
    }

    /**
     * Convert array of Products to array of ProductResponseDto
     */
    static toResponseDtoList(products: Product[]): ProductResponseDto[] {
        return products.map(p => this.toResponseDto(p));
    }

    /**
     * Convert CreateProductDto to CreateProductInput (for repository)
     * Maps camelCase DTO to snake_case input format
     * Note: This method is deprecated - routes should pass snake_case directly from validation schema
     */
    static toCreateInput(data: any, sellerId: string): CreateProductInput {
        // Handle both camelCase DTO and snake_case validation schema output
        // Prefer snake_case from validation schema
        return {
            seller_id: sellerId,
            title: data.title ?? data.title,
            description: data.description ?? data.description,
            long_description: data.longDescription ?? data.long_description,
            type: data.type,
            tags: data.tags,
            workflow_file_url: data.workflowFileUrl ?? data.workflow_file_url,
            thumbnail_url: data.thumbnailUrl ?? data.thumbnail_url,
            preview_image_url: data.previewImageUrl ?? data.preview_image_url,
            is_free: data.isFree ?? data.is_free ?? true,
            price: data.price,
            version: data.version,
            requirements: data.requirements,
            features: data.features,
            install_guide: data.installGuide ?? data.install_guide,
            metadata: data.metadata,
        };
    }
}

