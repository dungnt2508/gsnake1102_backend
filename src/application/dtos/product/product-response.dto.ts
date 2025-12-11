import { ProductDto, ProductReviewStatus, ProductStatus, ProductType, ProductPriceType } from '@gsnake/shared-types';

/**
 * Product response DTO
 * Re-export from shared types for consistency
 */
export class ProductResponseDto implements ProductDto {
    id: string = '';
    sellerId: string = '';
    title: string = '';
    description: string = '';
    longDescription?: string;
    type: ProductType = ProductType.WORKFLOW;
    tags: string[] = [];
    workflowFileUrl?: string;
    thumbnailUrl?: string = '';
    previewImageUrl?: string = '';
    videoUrl?: string;
    contactChannel?: string;
    isFree: boolean = false;
    price?: number;
    currency?: string = 'VND';
    priceType?: ProductPriceType = ProductPriceType.FREE;
    status: ProductStatus = ProductStatus.DRAFT;
    reviewStatus: ProductReviewStatus = ProductReviewStatus.PENDING;
    reviewedAt?: string | null;
    reviewedBy?: string | null;
    rejectionReason?: string | null;
    downloads: number = 0;
    salesCount?: number = 0;
    rating: number = 0;
    reviewsCount: number = 0;
    version?: string;
    requirements: string[] = [];
    features: string[] = [];
    installGuide?: string;
    metadata: Record<string, any> = {};
    // Phase 1 fields + catalog-open
    changelog?: string;
    license?: string;
    authorContact?: string;
    supportUrl?: string;
    screenshots?: string[];
    platformRequirements?: Record<string, any>;
    requiredCredentials?: string[];
    ownershipDeclaration?: boolean;
    ownershipProofUrl?: string;
    termsAcceptedAt?: string | null;
    securityScanStatus?: string;
    securityScanResult?: Record<string, any>;
    securityScanAt?: string | null;
    createdAt: string = '';
    updatedAt: string = '';

    constructor(data: Partial<ProductResponseDto>) {
        Object.assign(this, data);
    }
}

// Re-export types from shared package
export type { ProductDto, CreateProductDto, UpdateProductDto } from '@gsnake/shared-types';

