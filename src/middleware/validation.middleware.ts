import { z } from 'zod';

// Auth validation schemas
export const registerSchema = z.object({
    email: z.string().email('Invalid email format'),
    // Format validation only - min length is a business rule, validated in service if needed
    password: z.string().min(1, 'Password is required'),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});

// Persona validation schemas
export const createPersonaSchema = z.object({
    language_style: z.string().min(1, 'Language style is required'),
    tone: z.string().min(1, 'Tone is required'),
    topics_interest: z.array(z.string()).min(1, 'At least one topic of interest is required'),
});

export const updatePersonaSchema = z.object({
    language_style: z.string().optional(),
    tone: z.string().optional(),
    topics_interest: z.array(z.string()).optional(),
}).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
});

// Article validation schemas
export const createArticleSchema = z.object({
    url: z.string().url('Invalid URL format').optional(),
    source_type: z.enum(['url', 'rss', 'file']).default('url'),
    source_value: z.string().optional(),
    title: z.string().optional(),
    metadata: z.record(z.any()).optional(),
}).refine(data => data.url || data.source_value, {
    message: 'Either url or source_value is required'
}).transform(data => ({
    ...data,
    source_value: data.source_value || data.url || '',
    source_type: data.source_type as 'url' | 'rss' | 'file'
}));

// Schedule validation schemas
export const createScheduleSchema = z.object({
    article_url: z.string().url('Invalid URL format').optional(),
    source_type: z.enum(['url', 'rss', 'file']).default('url'),
    source_value: z.string().optional(),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'hourly'], {
        errorMap: () => ({ message: 'Frequency must be daily, weekly, monthly, or hourly' }),
    }),
}).refine(data => data.article_url || data.source_value, {
    message: 'Either article_url or source_value is required'
}).transform(data => ({
    ...data,
    source_value: data.source_value || data.article_url || '',
    source_type: data.source_type as 'url' | 'rss' | 'file'
}));

// Tool request validation schemas
export const createToolRequestSchema = z.object({
    request_payload: z.record(z.any()).refine(data => Object.keys(data).length > 0, {
        message: 'Request payload cannot be empty',
    }),
});

// Chat validation schemas
export const chatMessageSchema = z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1, 'Content cannot be empty'),
});

export const chatRequestSchema = z.object({
    messages: z.array(chatMessageSchema).min(1, 'At least one message is required'),
    stream: z.boolean().optional(),
});

// Product validation schemas
// Middleware: Format validation only (types, structure)
// Business rules (min/max length, etc.) are validated in service layer
export const createProductSchema = z.object({
    title: z.string().optional().or(z.literal('')), // Format only - business rules in service
    description: z.string().optional().or(z.literal('')),
    long_description: z.string().optional().or(z.literal('')),
    type: z.enum(['workflow', 'tool', 'integration'], {
        errorMap: () => ({ message: 'Loại sản phẩm phải là workflow, tool, hoặc integration' }),
    }),
    tags: z.array(z.string()).optional(), // Format only - max 10 validated in service
    workflow_file_url: z.union([
        z.string().url('URL không hợp lệ'),
        z.literal(''),
        z.undefined()
    ]).optional(),
    thumbnail_url: z.union([
        z.string().url('URL không hợp lệ'),
        z.literal(''),
        z.undefined()
    ]).optional(),
    preview_image_url: z.union([
        z.string().url('URL không hợp lệ'),
        z.literal(''),
        z.undefined()
    ]).optional(),
    is_free: z.boolean().default(true),
    price_type: z.enum(['free', 'onetime', 'subscription']).optional(),
    currency: z.string().max(10, 'Currency tối đa 10 ký tự').optional(),
    // Format validation only - business rules (positive, max length) validated in service
    price: z.number().optional(),
    version: z.string().optional().or(z.literal('')),
    requirements: z.array(z.string()).optional(),
    features: z.array(z.string()).optional(),
    install_guide: z.string().optional().or(z.literal('')),
    metadata: z.record(z.any()).optional(),
}).refine(data => {
    // Only validate price if product is not free
    if (data.is_free === false && data.price !== undefined) {
        return data.price > 0;
    }
    return true;
}, {
    message: 'Giá phải lớn hơn 0 cho sản phẩm trả phí',
    path: ['price'],
}).transform(data => {
    // Convert empty strings to undefined
    return {
        ...data,
        title: data.title === '' ? undefined : data.title,
        description: data.description === '' ? undefined : data.description,
        workflow_file_url: data.workflow_file_url === '' ? undefined : data.workflow_file_url,
        thumbnail_url: data.thumbnail_url === '' ? undefined : data.thumbnail_url,
        preview_image_url: data.preview_image_url === '' ? undefined : data.preview_image_url,
        long_description: data.long_description === '' ? undefined : data.long_description,
        version: data.version === '' ? undefined : data.version,
        install_guide: data.install_guide === '' ? undefined : data.install_guide,
        currency: data.currency === '' ? undefined : data.currency,
    };
});

// Review validation schemas
export const createReviewSchema = z.object({
    product_id: z.string().uuid('product_id không hợp lệ'),
    rating: z.number().int().min(1, 'Rating tối thiểu 1').max(5, 'Rating tối đa 5'),
    content: z.string().optional().or(z.literal('')),
}).transform(data => ({
    ...data,
    content: data.content === '' ? undefined : data.content,
}));

export const updateReviewSchema = z.object({
    rating: z.number().int().min(1, 'Rating tối thiểu 1').max(5, 'Rating tối đa 5').optional(),
    content: z.string().optional().or(z.literal('')),
}).refine(data => Object.keys(data).length > 0, {
    message: 'Phải cung cấp ít nhất một trường để cập nhật',
}).transform(data => ({
    ...data,
    content: data.content === '' ? undefined : data.content,
}));

export const updateProductSchema = z.object({
    // Format validation only - business rules (min 3, max 500) validated in service
    title: z.string().optional().or(z.literal('')),
    description: z.string().optional().or(z.literal('')),
    long_description: z.string().optional().or(z.literal('')),
    type: z.enum(['workflow', 'tool', 'integration'], {
        errorMap: () => ({ message: 'Loại sản phẩm phải là workflow, tool, hoặc integration' }),
    }).optional(),
    tags: z.array(z.string()).max(10, 'Tối đa 10 tags được phép').optional(),
    workflow_file_url: z.union([
        z.string().url('URL không hợp lệ'),
        z.literal(''),
        z.undefined()
    ]).optional(),
    thumbnail_url: z.union([
        z.string().url('URL không hợp lệ'),
        z.literal(''),
        z.undefined()
    ]).optional(),
    preview_image_url: z.union([
        z.string().url('URL không hợp lệ'),
        z.literal(''),
        z.undefined()
    ]).optional(),
    is_free: z.boolean().optional(),
    price: z.number().positive('Giá phải là số dương').optional(),
    price_type: z.enum(['free', 'onetime', 'subscription']).optional(),
    currency: z.string().max(10, 'Currency tối đa 10 ký tự').optional(),
    status: z.enum(['draft', 'published', 'archived'], {
        errorMap: () => ({ message: 'Trạng thái phải là draft, published, hoặc archived' }),
    }).optional(),
    version: z.string().max(50, 'Phiên bản không được vượt quá 50 ký tự').optional().or(z.literal('')),
    requirements: z.array(z.string()).optional(),
    features: z.array(z.string()).optional(),
    install_guide: z.string().optional().or(z.literal('')),
    metadata: z.record(z.any()).optional(),
}).refine(data => {
    if (data.is_free === false && (!data.price || data.price <= 0)) {
        return false;
    }
    return true;
}, {
    message: 'Giá phải lớn hơn 0 cho sản phẩm trả phí',
    path: ['price'],
}).refine(data => Object.keys(data).length > 0, {
    message: 'Phải cung cấp ít nhất một trường để cập nhật',
}).transform(data => {
    // Convert empty strings to undefined
    return {
        ...data,
        title: data.title === '' ? undefined : data.title,
        description: data.description === '' ? undefined : data.description,
        workflow_file_url: data.workflow_file_url === '' ? undefined : data.workflow_file_url,
        thumbnail_url: data.thumbnail_url === '' ? undefined : data.thumbnail_url,
        preview_image_url: data.preview_image_url === '' ? undefined : data.preview_image_url,
        long_description: data.long_description === '' ? undefined : data.long_description,
        version: data.version === '' ? undefined : data.version,
        install_guide: data.install_guide === '' ? undefined : data.install_guide,
        currency: data.currency === '' ? undefined : data.currency,
    };
});

/**
 * Validation helper function
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated data or throws error
 */
export const validate = <T>(schema: z.ZodSchema<T>, data: any): T => {
    return schema.parse(data);
};
