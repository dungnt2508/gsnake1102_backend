import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { createHash } from 'crypto';

/**
 * Storage Service
 * Handles file uploads and storage
 * Currently supports local filesystem, can be extended to support S3/cloud storage
 */

export interface UploadResult {
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    checksum: string;
}

export class StorageService {
    private readonly uploadDir: string;
    private readonly baseUrl: string;

    constructor() {
        // Get upload directory from env or use default
        this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
        this.baseUrl = process.env.UPLOAD_BASE_URL || '/uploads';
        
        // Ensure upload directory exists
        this.ensureUploadDir();
    }

    /**
     * Ensure upload directory exists
     */
    private async ensureUploadDir(): Promise<void> {
        try {
            await fs.access(this.uploadDir);
        } catch {
            await fs.mkdir(this.uploadDir, { recursive: true });
        }

        // Create subdirectories for different artifact types
        const subdirs = ['artifacts', 'thumbnails', 'screenshots', 'temp'];
        for (const subdir of subdirs) {
            const subdirPath = path.join(this.uploadDir, subdir);
            try {
                await fs.access(subdirPath);
            } catch {
                await fs.mkdir(subdirPath, { recursive: true });
            }
        }
    }

    /**
     * Calculate SHA256 checksum of a file buffer
     */
    private calculateChecksum(buffer: Buffer): string {
        return createHash('sha256').update(buffer).digest('hex');
    }

    /**
     * Generate unique filename
     */
    private generateFileName(originalName: string): string {
        const ext = path.extname(originalName);
        const baseName = path.basename(originalName, ext);
        const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
        const uuid = uuidv4();
        return `${sanitizedBaseName}_${uuid}${ext}`;
    }

    /**
     * Upload file buffer to storage
     */
    async uploadFile(
        buffer: Buffer,
        originalFileName: string,
        artifactType: 'artifacts' | 'thumbnails' | 'screenshots' | 'temp' = 'artifacts'
    ): Promise<UploadResult> {
        // Validate file size (max 100MB for artifacts, 10MB for images)
        const maxSize = artifactType === 'artifacts' ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
        if (buffer.length > maxSize) {
            throw new Error(`File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`);
        }

        // Generate unique filename
        const fileName = this.generateFileName(originalFileName);
        const filePath = path.join(this.uploadDir, artifactType, fileName);

        // Calculate checksum
        const checksum = this.calculateChecksum(buffer);

        // Write file
        await fs.writeFile(filePath, buffer);

        // Get MIME type
        const mimeType = this.getMimeType(originalFileName);

        // Return result
        const fileUrl = `${this.baseUrl}/${artifactType}/${fileName}`;
        return {
            fileUrl,
            fileName,
            fileSize: buffer.length,
            mimeType,
            checksum,
        };
    }

    /**
     * Get MIME type from filename
     */
    private getMimeType(fileName: string): string {
        const ext = path.extname(fileName).toLowerCase();
        const mimeTypes: Record<string, string> = {
            '.json': 'application/json',
            '.md': 'text/markdown',
            '.txt': 'text/plain',
            '.env': 'text/plain',
            '.zip': 'application/zip',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.pdf': 'application/pdf',
            '.js': 'application/javascript',
            '.ts': 'application/typescript',
            '.py': 'text/x-python',
            '.sh': 'text/x-shellscript',
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }

    /**
     * Delete file from storage
     */
    async deleteFile(fileUrl: string): Promise<void> {
        // Extract path from URL
        const urlPath = fileUrl.replace(this.baseUrl, '').replace(/^\//, '');
        const filePath = path.join(this.uploadDir, urlPath);

        try {
            await fs.unlink(filePath);
        } catch (error: any) {
            // Ignore file not found errors
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }

    /**
     * Read file from storage
     */
    async readFile(fileUrl: string): Promise<Buffer> {
        const urlPath = fileUrl.replace(this.baseUrl, '').replace(/^\//, '');
        const filePath = path.join(this.uploadDir, urlPath);
        return await fs.readFile(filePath);
    }

    /**
     * Check if file exists
     */
    async fileExists(fileUrl: string): Promise<boolean> {
        const urlPath = fileUrl.replace(this.baseUrl, '').replace(/^\//, '');
        const filePath = path.join(this.uploadDir, urlPath);
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
}

export default new StorageService();

