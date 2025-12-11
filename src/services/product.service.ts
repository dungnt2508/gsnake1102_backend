import productRepository from '../repositories/product.repository';
import downloadLogRepository, { DownloadLogType } from '../repositories/download-log.repository';
import userRepository from '../repositories/user.repository';
import { 
    Product, 
    CreateProductInput, 
    UpdateProductInput, 
    ProductQueryFilters,
    ProductType,
    ProductStatus,
    ProductReviewStatus,
    ProductPriceType
} from '@gsnake/shared-types';
import { NotFoundError, AuthorizationError, DomainError, ERROR_CODES } from '../shared/errors';
import { ProductStateMachine } from '../utils/product-state-machine';

export class ProductService {
    /**
     * Get all products with filters (public products only by default)
     * Only shows published AND approved products for public access
     */
    async getProducts(filters: ProductQueryFilters = {}): Promise<{ products: Product[]; total: number }> {
        // By default, only show published AND approved products unless seller_id is specified
        if (!filters.seller_id) {
            filters.status = ProductStatus.PUBLISHED;
            // Only show approved products to public
            filters.review_status = ProductReviewStatus.APPROVED;
        }

        return await productRepository.findMany(filters);
    }

    /**
     * Get product by ID
     */
    async getProduct(id: string): Promise<Product | null> {
        return await productRepository.findById(id);
    }

    /**
     * Get product with type-specific data (artifacts, workflow details, etc.)
     */
    async getProductWithDetails(id: string): Promise<(Product & { 
        artifacts?: any[];
        workflowDetails?: any;
    }) | null> {
        const product = await productRepository.findById(id);
        if (!product) {
            return null;
        }

        const result: any = { ...product };

        // Load artifacts
        try {
            const artifactRepository = (await import('../repositories/product-artifact.repository')).default;
            result.artifacts = await artifactRepository.findByProductId(id);
        } catch (error) {
            console.error('Failed to load artifacts:', error);
            result.artifacts = [];
        }

        // Load type-specific data
        if (product.type === ProductType.WORKFLOW) {
            try {
                const workflowRepository = (await import('../repositories/product-workflow.repository')).default;
                result.workflowDetails = await workflowRepository.findByProductId(id);
            } catch (error) {
                console.error('Failed to load workflow details:', error);
            }
        }

        return result;
    }

    /**
     * Get product by ID (public only - must be published AND approved)
     */
    async getPublicProduct(id: string): Promise<Product | null> {
        const product = await productRepository.findById(id);
        
        // Only return if published AND approved
        if (product && 
            product.status === ProductStatus.PUBLISHED && 
            product.review_status === ProductReviewStatus.APPROVED) {
            return product;
        }
        
        return null;
    }

    /**
     * Get seller's products
     */
    async getSellerProducts(sellerId: string, includeDrafts: boolean = true): Promise<Product[]> {
        const filters: ProductQueryFilters = {
            seller_id: sellerId,
        };

        if (!includeDrafts) {
            filters.status = ProductStatus.PUBLISHED;
        }

        const result = await productRepository.findMany(filters);
        return result.products;
    }

    /**
     * Create new product
     */
    async createProduct(data: CreateProductInput): Promise<Product> {
        // Business validation
        this.validateProductInput(data);

        // Validate seller exists
        const seller = await userRepository.findById(data.seller_id);
        if (!seller) {
            throw new NotFoundError(ERROR_CODES.SELLER_NOT_FOUND, { sellerId: data.seller_id });
        }

        // Business logic: Set default values
        const productData: CreateProductInput = {
            ...data,
            status: data.status || ProductStatus.DRAFT,
            currency: data.currency || 'VND',
            price_type: data.price_type || (data.is_free ? ProductPriceType.FREE : ProductPriceType.ONETIME),
            is_free: data.is_free ?? true,
            price: data.is_free ? undefined : data.price,
        };

        // Business rule: New products always start as PENDING review
        const createData: CreateProductInput & { review_status: ProductReviewStatus } = {
            ...productData,
            review_status: ProductReviewStatus.PENDING,
        };

        const product = await productRepository.create(createData);

        // Queue security scan (async, non-blocking)
        try {
            const securityScanService = (await import('./security-scan.service')).default;
            securityScanService.queueScan(product.id, 1); // Priority 1 for new products
        } catch (error) {
            // Log error but don't fail product creation
            console.error('Failed to queue security scan:', error);
        }

        return product;
    }

    /**
     * Update product (only by seller)
     */
    async updateProduct(
        productId: string, 
        sellerId: string, 
        data: UpdateProductInput
    ): Promise<Product> {
        // Load product
        const product = await productRepository.findById(productId);
        if (!product) {
            throw new NotFoundError(ERROR_CODES.PRODUCT_NOT_FOUND, { productId });
        }

        // Authorization check
        if (product.seller_id !== sellerId) {
            throw new AuthorizationError(ERROR_CODES.PRODUCT_UPDATE_FORBIDDEN, {
                productId,
                sellerId,
            });
        }

        // Business validation
        if (data.title || data.description || data.type) {
            this.validateProductInput(data as CreateProductInput);
        }

        const priceType = data.price_type ?? product.price_type ?? ProductPriceType.FREE;
        const isFree = data.is_free ?? product.is_free;

        if (!isFree && priceType === ProductPriceType.FREE) {
            throw new DomainError(ERROR_CODES.INVALID_PRICE, { message: 'price_type không thể free khi is_free=false' });
        }
        if (isFree) {
            data.price = undefined;
            data.price_type = ProductPriceType.FREE;
        } else {
            if (!data.price && !product.price) {
                throw new DomainError(ERROR_CODES.INVALID_PRICE);
            }
            if ((data.price ?? product.price ?? 0) <= 0) {
                throw new DomainError(ERROR_CODES.INVALID_PRICE);
            }
            data.price_type = priceType || ProductPriceType.ONETIME;
        }

        // Business rule: Validate tags limit
        if (data.tags !== undefined && data.tags.length > 10) {
            throw new DomainError(ERROR_CODES.TOO_MANY_TAGS, { count: data.tags.length });
        }

        // Nếu sản phẩm đã được duyệt, thay đổi nội dung quan trọng sẽ đưa về pending review
        const wasApproved = product.review_status === ProductReviewStatus.APPROVED;
        const criticalChanged = [
            data.title !== undefined && data.title !== product.title,
            data.description !== undefined && data.description !== product.description,
            data.long_description !== undefined && data.long_description !== product.long_description,
            data.type !== undefined && data.type !== product.type,
            data.workflow_file_url !== undefined && data.workflow_file_url !== product.workflow_file_url,
            data.thumbnail_url !== undefined && data.thumbnail_url !== product.thumbnail_url,
            data.preview_image_url !== undefined && data.preview_image_url !== product.preview_image_url,
            data.is_free !== undefined && data.is_free !== product.is_free,
            data.price !== undefined && data.price !== product.price,
            data.price_type !== undefined && data.price_type !== product.price_type,
            data.version !== undefined && data.version !== product.version,
            data.install_guide !== undefined && data.install_guide !== product.install_guide,
            data.requirements !== undefined && JSON.stringify(data.requirements) !== JSON.stringify(product.requirements),
            data.features !== undefined && JSON.stringify(data.features) !== JSON.stringify(product.features),
        ].some(Boolean);

        const updatePayload = { ...data } as UpdateProductInput & {
            review_status?: ProductReviewStatus;
            reviewed_at?: Date | null;
            reviewed_by?: string | null;
            rejection_reason?: string | null;
            status?: ProductStatus;
        };

        if (wasApproved && criticalChanged) {
            updatePayload.review_status = ProductReviewStatus.PENDING;
            updatePayload.reviewed_at = null;
            updatePayload.reviewed_by = null;
            updatePayload.rejection_reason = null;
            updatePayload.status = ProductStatus.DRAFT; // buộc kiểm duyệt lại trước khi lên published
        }

        // Update product
        const updated = await productRepository.update(productId, updatePayload);
        if (!updated) {
            throw new DomainError(ERROR_CODES.PRODUCT_UPDATE_FAILED, { productId });
        }

        return updated;
    }

    /**
     * Delete product (only by seller)
     */
    async deleteProduct(productId: string, sellerId: string): Promise<void> {
        // Check product exists and belongs to seller
        const product = await productRepository.findById(productId);
        if (!product) {
            throw new NotFoundError(ERROR_CODES.PRODUCT_NOT_FOUND, { productId });
        }

        if (product.seller_id !== sellerId) {
            throw new AuthorizationError(ERROR_CODES.PRODUCT_DELETE_FORBIDDEN, { productId, sellerId });
        }

        const deleted = await productRepository.delete(productId);
        if (!deleted) {
            throw new DomainError(ERROR_CODES.PRODUCT_DELETE_FAILED, { productId });
        }
    }

    /**
     * Publish product (change status from draft to published)
     * Requires product to be approved by admin first
     */
    async publishProduct(productId: string, sellerId: string): Promise<Product> {
        // Load product
        const product = await productRepository.findById(productId);
        if (!product) {
            throw new NotFoundError(ERROR_CODES.PRODUCT_NOT_FOUND, { productId });
        }

        // Authorization check
        if (product.seller_id !== sellerId) {
            throw new AuthorizationError(ERROR_CODES.PRODUCT_PUBLISH_FORBIDDEN, {
                productId,
                sellerId,
            });
        }

        // Nếu chưa được duyệt, gửi về trạng thái chờ duyệt thay vì báo lỗi
        if (product.review_status !== ProductReviewStatus.APPROVED) {
            // Validate các trường tối thiểu trước khi gửi duyệt
            this.validatePublishRequirements(product);

            const updated = await productRepository.update(productId, {
                review_status: ProductReviewStatus.PENDING,
                reviewed_at: null,
                reviewed_by: null,
                rejection_reason: null,
                status: ProductStatus.DRAFT, // vẫn là draft cho tới khi admin duyệt
            } as any);

            if (!updated) {
                throw new DomainError(ERROR_CODES.PRODUCT_UPDATE_FAILED, { productId });
            }

            return updated;
        }

        // Business logic: Validate publish requirements
        this.validatePublishRequirements(product);

        // Business logic: Check state transition
        if (!ProductStateMachine.canTransition(product.status, ProductStatus.PUBLISHED, product.review_status)) {
            throw new DomainError(ERROR_CODES.PRODUCT_NOT_APPROVED, {
                productId,
                message: 'Invalid state transition',
            });
        }

        // Update status
        const updated = await productRepository.update(productId, { status: ProductStatus.PUBLISHED });
        if (!updated) {
            throw new DomainError(ERROR_CODES.PRODUCT_UPDATE_FAILED, { productId });
        }

        return updated;
    }

    /**
     * Unpublish product (change status to draft)
     */
    async unpublishProduct(productId: string, sellerId: string): Promise<Product> {
        // Load product
        const product = await productRepository.findById(productId);
        if (!product) {
            throw new NotFoundError(ERROR_CODES.PRODUCT_NOT_FOUND, { productId });
        }

        // Authorization check
        if (product.seller_id !== sellerId) {
            throw new AuthorizationError(ERROR_CODES.PRODUCT_UPDATE_FORBIDDEN, {
                productId,
                sellerId,
            });
        }

        // Business logic: Check state transition
        if (!ProductStateMachine.canTransition(product.status, ProductStatus.DRAFT)) {
            throw new DomainError(ERROR_CODES.PRODUCT_UPDATE_FAILED, {
                productId,
                message: 'Cannot unpublish from current state',
            });
        }

        // Update status
        const updated = await productRepository.update(productId, { status: ProductStatus.DRAFT });
        if (!updated) {
            throw new DomainError(ERROR_CODES.PRODUCT_UPDATE_FAILED, { productId });
        }

        return updated;
    }

    /**
     * Archive product
     */
    async archiveProduct(productId: string, sellerId: string): Promise<Product> {
        // Load product
        const product = await productRepository.findById(productId);
        if (!product) {
            throw new NotFoundError(ERROR_CODES.PRODUCT_NOT_FOUND, { productId });
        }

        // Authorization check
        if (product.seller_id !== sellerId) {
            throw new AuthorizationError(ERROR_CODES.PRODUCT_UPDATE_FORBIDDEN, {
                productId,
                sellerId,
            });
        }

        // Business logic: Check state transition
        if (!ProductStateMachine.canTransition(product.status, ProductStatus.ARCHIVED)) {
            throw new DomainError(ERROR_CODES.PRODUCT_UPDATE_FAILED, {
                productId,
                message: 'Cannot archive from current state',
            });
        }

        // Update status
        const updated = await productRepository.update(productId, { status: ProductStatus.ARCHIVED });
        if (!updated) {
            throw new DomainError(ERROR_CODES.PRODUCT_UPDATE_FAILED, { productId });
        }

        return updated;
    }

    /**
     * Increment download count (when user downloads product)
     */
    async recordDownload(productId: string): Promise<void> {
        await productRepository.incrementDownloads(productId);
    }

    /**
     * Record download with log + optional sales count
     */
    async recordDownloadWithLog(productId: string, buyerId?: string | null, type: DownloadLogType = 'free'): Promise<{ url: string }> {
        const product = await productRepository.findById(productId);
        if (!product) {
            throw new NotFoundError(ERROR_CODES.PRODUCT_NOT_FOUND, { productId });
        }
        if (product.status !== ProductStatus.PUBLISHED || product.review_status !== ProductReviewStatus.APPROVED) {
            throw new DomainError(ERROR_CODES.PRODUCT_NOT_APPROVED, { productId });
        }
        if (!product.workflow_file_url) {
            throw new DomainError(ERROR_CODES.WORKFLOW_FILE_REQUIRED, { productId });
        }

        await downloadLogRepository.create({
            product_id: productId,
            seller_id: product.seller_id,
            buyer_id: buyerId || null,
            type,
        });

        await productRepository.incrementDownloads(productId);
        if (type !== 'free') {
            await productRepository.incrementSales(productId, 1);
        }

        return { url: product.workflow_file_url };
    }

    /**
     * Search products by query
     */
    async searchProducts(query: string, filters: Omit<ProductQueryFilters, 'search'> = {}): Promise<{ products: Product[]; total: number }> {
        const searchFilters: ProductQueryFilters = {
            ...filters,
            search: query,
            status: ProductStatus.PUBLISHED, // Only search published products
        };

        return await productRepository.findMany(searchFilters);
    }

    /**
     * Get products by type
     */
    async getProductsByType(type: ProductType, limit: number = 50): Promise<Product[]> {
        const result = await productRepository.findMany({
            type,
            status: ProductStatus.PUBLISHED,
            limit,
        });

        return result.products;
    }

    /**
     * Get featured/popular products
     */
    async getFeaturedProducts(limit: number = 6): Promise<Product[]> {
        const result = await productRepository.findMany({
            status: ProductStatus.PUBLISHED,
            sort_by: 'rating',
            sort_order: 'desc',
            limit,
        });

        return result.products;
    }

    /**
     * Validate product input (business rules)
     */
    private validateProductInput(data: Partial<CreateProductInput>): void {
        if (data.title !== undefined && (!data.title || data.title.trim().length < 3)) {
            throw new DomainError(ERROR_CODES.TITLE_TOO_SHORT);
        }

        if (data.title !== undefined && data.title.length > 500) {
            throw new DomainError(ERROR_CODES.TITLE_TOO_LONG);
        }

        if (data.description !== undefined && (!data.description || data.description.trim().length < 10)) {
            throw new DomainError(ERROR_CODES.DESCRIPTION_TOO_SHORT);
        }

        if (data.type !== undefined && !Object.values(ProductType).includes(data.type)) {
            throw new DomainError(ERROR_CODES.INVALID_PRODUCT_TYPE, { 
                type: data.type,
                validTypes: Object.values(ProductType)
            });
        }

        if (data.price_type !== undefined && !Object.values(ProductPriceType).includes(data.price_type)) {
            throw new DomainError(ERROR_CODES.INVALID_PRICE, { message: 'price_type không hợp lệ' });
        }

        if (data.is_free === false && (!data.price || data.price <= 0)) {
            throw new DomainError(ERROR_CODES.INVALID_PRICE);
        }
        if (data.is_free === true && data.price_type && data.price_type !== ProductPriceType.FREE) {
            throw new DomainError(ERROR_CODES.INVALID_PRICE, { message: 'price_type phải là free khi is_free=true' });
        }
        if (data.currency !== undefined && (!data.currency.trim() || data.currency.length > 10)) {
            throw new DomainError(ERROR_CODES.INVALID_PRICE, { message: 'currency không hợp lệ' });
        }

        if (data.tags !== undefined && data.tags.length > 10) {
            throw new DomainError(ERROR_CODES.TOO_MANY_TAGS, { count: data.tags.length });
        }
    }

    /**
     * Validate product has all required fields for publishing
     */
    private validatePublishRequirements(product: Product): void {
        if (!product.workflow_file_url && product.type === ProductType.WORKFLOW) {
            throw new DomainError(ERROR_CODES.WORKFLOW_FILE_REQUIRED, {
                productId: product.id,
                type: product.type,
            });
        }

        if (!product.thumbnail_url) {
            throw new DomainError(ERROR_CODES.THUMBNAIL_URL_REQUIRED, {
                productId: product.id,
            });
        }

        if (!product.title || product.title.trim().length < 3) {
            throw new DomainError(ERROR_CODES.PRODUCT_TITLE_TOO_SHORT, {
                productId: product.id,
            });
        }

        if (!product.description || product.description.trim().length < 10) {
            throw new DomainError(ERROR_CODES.PRODUCT_DESCRIPTION_TOO_SHORT, {
                productId: product.id,
            });
        }
    }
}

export default new ProductService();

