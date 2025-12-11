/**
 * Error codes for the application
 * Used to identify error types consistently across the codebase
 */
export const ERROR_CODES = {
    // Auth errors
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
    INVALID_TOKEN: 'INVALID_TOKEN',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
    AZURE_OAUTH_FAILED: 'AZURE_OAUTH_FAILED',
    GOOGLE_OAUTH_FAILED: 'GOOGLE_OAUTH_FAILED',

    // Authorization errors
    ADMIN_ACCESS_REQUIRED: 'ADMIN_ACCESS_REQUIRED',
    SELLER_ACCESS_REQUIRED: 'SELLER_ACCESS_REQUIRED',
    APPROVED_SELLER_REQUIRED: 'APPROVED_SELLER_REQUIRED',
    PRODUCT_UPDATE_FORBIDDEN: 'PRODUCT_UPDATE_FORBIDDEN',
    PRODUCT_DELETE_FORBIDDEN: 'PRODUCT_DELETE_FORBIDDEN',
    PRODUCT_PUBLISH_FORBIDDEN: 'PRODUCT_PUBLISH_FORBIDDEN',

    // Product errors
    PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
    SELLER_NOT_FOUND: 'SELLER_NOT_FOUND',
    PRODUCT_NOT_APPROVED: 'PRODUCT_NOT_APPROVED',
    PRODUCT_UPDATE_FAILED: 'PRODUCT_UPDATE_FAILED',
    PRODUCT_DELETE_FAILED: 'PRODUCT_DELETE_FAILED',
    PRODUCT_PUBLISH_FAILED: 'PRODUCT_PUBLISH_FAILED',
    WORKFLOW_FILE_REQUIRED: 'WORKFLOW_FILE_REQUIRED',
    THUMBNAIL_URL_REQUIRED: 'THUMBNAIL_URL_REQUIRED',
    PRODUCT_TITLE_TOO_SHORT: 'PRODUCT_TITLE_TOO_SHORT',
    PRODUCT_DESCRIPTION_TOO_SHORT: 'PRODUCT_DESCRIPTION_TOO_SHORT',

    // Validation errors
    INVALID_INPUT: 'INVALID_INPUT',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    TITLE_TOO_SHORT: 'TITLE_TOO_SHORT',
    TITLE_TOO_LONG: 'TITLE_TOO_LONG',
    DESCRIPTION_TOO_SHORT: 'DESCRIPTION_TOO_SHORT',
    INVALID_PRODUCT_TYPE: 'INVALID_PRODUCT_TYPE',
    INVALID_PRICE: 'INVALID_PRICE',
    TOO_MANY_TAGS: 'TOO_MANY_TAGS',
    INVALID_RATING: 'INVALID_RATING',

    // User errors
    USER_NOT_FOUND: 'USER_NOT_FOUND',

    // Review errors
    REVIEW_NOT_FOUND: 'REVIEW_NOT_FOUND',
    REVIEW_UPDATE_FORBIDDEN: 'REVIEW_UPDATE_FORBIDDEN',
    REVIEW_DELETE_FORBIDDEN: 'REVIEW_DELETE_FORBIDDEN',
    REVIEW_UPDATE_FAILED: 'REVIEW_UPDATE_FAILED',
    REVIEW_DELETE_FAILED: 'REVIEW_DELETE_FAILED',
    REVIEW_CREATE_FAILED: 'REVIEW_CREATE_FAILED',

    // Article errors
    ARTICLE_NOT_FOUND: 'ARTICLE_NOT_FOUND',

    // Internal errors
    INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

/**
 * Error messages mapped to error codes
 * Supports both English and Vietnamese messages
 */
export const ERROR_MESSAGES: Record<string, string> = {
    // Auth
    INVALID_CREDENTIALS: 'Sai email hoặc mật khẩu',
    EMAIL_ALREADY_EXISTS: 'Email đã được đăng ký',
    INVALID_TOKEN: 'Token không hợp lệ hoặc đã hết hạn',
    TOKEN_EXPIRED: 'Token đã hết hạn',
    AUTHENTICATION_REQUIRED: 'Cần đăng nhập để thực hiện thao tác',
    AZURE_OAUTH_FAILED: 'Xác thực Azure OAuth thất bại',
    GOOGLE_OAUTH_FAILED: 'Xác thực Google OAuth thất bại',

    // Authorization
    ADMIN_ACCESS_REQUIRED: 'Chỉ quản trị viên mới có quyền truy cập',
    SELLER_ACCESS_REQUIRED: 'Yêu cầu quyền người bán',
    APPROVED_SELLER_REQUIRED: 'Bạn cần tài khoản người bán đã được duyệt',
    PRODUCT_UPDATE_FORBIDDEN: 'Bạn chỉ được cập nhật sản phẩm của mình',
    PRODUCT_DELETE_FORBIDDEN: 'Bạn chỉ được xoá sản phẩm của mình',
    PRODUCT_PUBLISH_FORBIDDEN: 'Bạn chỉ được đăng sản phẩm của mình',

    // Product
    PRODUCT_NOT_FOUND: 'Không tìm thấy sản phẩm',
    SELLER_NOT_FOUND: 'Không tìm thấy người bán',
    PRODUCT_NOT_APPROVED: 'Sản phẩm phải được duyệt trước khi đăng',
    PRODUCT_UPDATE_FAILED: 'Cập nhật sản phẩm thất bại',
    PRODUCT_DELETE_FAILED: 'Xoá sản phẩm thất bại',
    PRODUCT_PUBLISH_FAILED: 'Đăng sản phẩm thất bại',
    WORKFLOW_FILE_REQUIRED: 'Thiếu URL file workflow cho sản phẩm dạng workflow',
    THUMBNAIL_URL_REQUIRED: 'Thiếu URL thumbnail',
    PRODUCT_TITLE_TOO_SHORT: 'Tiêu đề phải có ít nhất 3 ký tự',
    PRODUCT_DESCRIPTION_TOO_SHORT: 'Mô tả phải có ít nhất 10 ký tự',

    // Validation
    INVALID_INPUT: 'Dữ liệu gửi lên không hợp lệ',
    VALIDATION_ERROR: 'Lỗi kiểm tra dữ liệu',
    TITLE_TOO_SHORT: 'Tiêu đề phải có ít nhất 3 ký tự',
    TITLE_TOO_LONG: 'Tiêu đề không được vượt quá 500 ký tự',
    DESCRIPTION_TOO_SHORT: 'Mô tả phải có ít nhất 10 ký tự',
    INVALID_PRODUCT_TYPE: 'Loại sản phẩm không hợp lệ',
    INVALID_PRICE: 'Giá phải lớn hơn 0 với sản phẩm trả phí',
    TOO_MANY_TAGS: 'Tối đa 10 thẻ',
    INVALID_RATING: 'Rating phải trong khoảng 1-5',

    // User
    USER_NOT_FOUND: 'Không tìm thấy người dùng',

    // Review
    REVIEW_NOT_FOUND: 'Không tìm thấy review',
    REVIEW_UPDATE_FORBIDDEN: 'Bạn chỉ được cập nhật review của mình',
    REVIEW_DELETE_FORBIDDEN: 'Bạn chỉ được xoá review của mình',
    REVIEW_UPDATE_FAILED: 'Cập nhật review thất bại',
    REVIEW_DELETE_FAILED: 'Xoá review thất bại',
    REVIEW_CREATE_FAILED: 'Tạo review thất bại',

    // Article
    ARTICLE_NOT_FOUND: 'Không tìm thấy bài viết',

    // Internal
    INTERNAL_ERROR: 'Lỗi hệ thống',
};

