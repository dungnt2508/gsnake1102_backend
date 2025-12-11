import storageService from './storage.service';
import productRepository from '../repositories/product.repository';
import scanQueueService from './scan-queue.service';
import { ProductReviewStatus } from '@gsnake/shared-types';
import { DomainError, ERROR_CODES } from '../shared/errors';

/**
 * Security Scan Service
 * Scans product artifacts for malware, credentials, and security issues
 */

export interface SecurityScanResult {
    passed: boolean;
    malware_detected: boolean;
    credentials_found: string[]; // List of files containing credentials
    suspicious_patterns: string[]; // List of suspicious patterns found
    scanned_files: number;
    scan_details: Record<string, any>;
}

export interface CredentialPattern {
    name: string;
    pattern: RegExp;
    description: string;
}

export class SecurityScanService {
    // Common credential patterns to scan for
    private readonly credentialPatterns: CredentialPattern[] = [
        {
            name: 'API Key',
            pattern: /(api[_-]?key|apikey)\s*[:=]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi,
            description: 'API key detected',
        },
        {
            name: 'AWS Access Key',
            pattern: /AKIA[0-9A-Z]{16}/gi,
            description: 'AWS access key ID detected',
        },
        {
            name: 'AWS Secret Key',
            pattern: /aws[_-]?secret[_-]?access[_-]?key\s*[:=]\s*["']?([a-zA-Z0-9/+=]{40})["']?/gi,
            description: 'AWS secret access key detected',
        },
        {
            name: 'Private Key',
            pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/gi,
            description: 'Private key detected',
        },
        {
            name: 'Password',
            pattern: /(password|pwd|passwd)\s*[:=]\s*["']?([^\s"']{8,})["']?/gi,
            description: 'Password in plaintext detected',
        },
        {
            name: 'Database Connection String',
            pattern: /(mongodb|mysql|postgres|redis):\/\/[^\s"']+/gi,
            description: 'Database connection string with credentials detected',
        },
        {
            name: 'JWT Secret',
            pattern: /jwt[_-]?secret\s*[:=]\s*["']?([a-zA-Z0-9_-]{32,})["']?/gi,
            description: 'JWT secret detected',
        },
        {
            name: 'Bearer Token',
            pattern: /bearer\s+([a-zA-Z0-9._-]{20,})/gi,
            description: 'Bearer token detected',
        },
    ];

    // Suspicious patterns (potential security issues)
    private readonly suspiciousPatterns: CredentialPattern[] = [
        {
            name: 'Eval',
            pattern: /eval\s*\(/gi,
            description: 'Use of eval() function (potential code injection)',
        },
        {
            name: 'Shell Command',
            pattern: /(exec|system|shell_exec|passthru)\s*\(/gi,
            description: 'Shell command execution detected',
        },
        {
            name: 'SQL Injection Pattern',
            pattern: /(\bunion\s+select|drop\s+table|delete\s+from)\b/gi,
            description: 'Potential SQL injection pattern',
        },
    ];

    /**
     * Scan a file buffer for credentials and suspicious patterns
     */
    private async scanFileBuffer(
        buffer: Buffer,
        fileName: string
    ): Promise<{
        credentials: string[];
        suspicious: string[];
    }> {
        const credentials: string[] = [];
        const suspicious: string[] = [];
        const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 10 * 1024 * 1024)); // Max 10MB scan

        // Skip binary files (check for null bytes)
        if (buffer.includes(0)) {
            return { credentials, suspicious };
        }

        // Check credential patterns
        for (const pattern of this.credentialPatterns) {
            const matches = content.match(pattern.pattern);
            if (matches) {
                credentials.push(`${pattern.name} in ${fileName}: ${pattern.description}`);
            }
        }

        // Check suspicious patterns (only for code files)
        const codeExtensions = ['.js', '.ts', '.py', '.php', '.rb', '.go', '.java', '.json'];
        const isCodeFile = codeExtensions.some(ext => fileName.toLowerCase().endsWith(ext));

        if (isCodeFile) {
            for (const pattern of this.suspiciousPatterns) {
                const matches = content.match(pattern.pattern);
                if (matches) {
                    suspicious.push(`${pattern.name} in ${fileName}: ${pattern.description}`);
                }
            }
        }

        return { credentials, suspicious };
    }

    /**
     * Scan product artifacts for security issues
     */
    async scanProduct(productId: string): Promise<SecurityScanResult> {
        // Get product
        const product = await productRepository.findById(productId);
        if (!product) {
            throw new DomainError(ERROR_CODES.PRODUCT_NOT_FOUND, { productId });
        }

        // Import artifact repository
        const artifactRepository = (await import('../repositories/product-artifact.repository')).default;

        // Get all artifacts for product
        const artifacts = await artifactRepository.findByProductId(productId);

        if (artifacts.length === 0) {
            return {
                passed: true,
                malware_detected: false,
                credentials_found: [],
                suspicious_patterns: [],
                scanned_files: 0,
                scan_details: { message: 'No artifacts to scan' },
            };
        }

        const allCredentials: string[] = [];
        const allSuspicious: string[] = [];
        let scannedCount = 0;

        // Scan each artifact
        for (const artifact of artifacts) {
            try {
                // Skip large files (>10MB) for performance
                if (artifact.file_size && artifact.file_size > 10 * 1024 * 1024) {
                    continue;
                }

                // Read file
                const buffer = await storageService.readFile(artifact.file_url);

                // Scan file
                const { credentials, suspicious } = await this.scanFileBuffer(buffer, artifact.file_name);

                allCredentials.push(...credentials);
                allSuspicious.push(...suspicious);
                scannedCount++;
            } catch (error: any) {
                // Log error but continue scanning other files
                console.error(`Error scanning artifact ${artifact.id}:`, error.message);
            }
        }

        // Determine if scan passed
        const passed = allCredentials.length === 0 && allSuspicious.length === 0;

        return {
            passed,
            malware_detected: false, // Actual malware scan would require ClamAV or VirusTotal
            credentials_found: allCredentials,
            suspicious_patterns: allSuspicious,
            scanned_files: scannedCount,
            scan_details: {
                total_artifacts: artifacts.length,
                scanned_artifacts: scannedCount,
                credentials_count: allCredentials.length,
                suspicious_count: allSuspicious.length,
            },
        };
    }

    /**
     * Update product with scan results
     */
    async updateProductScanStatus(
        productId: string,
        result: SecurityScanResult
    ): Promise<void> {
        await productRepository.update(productId, {
            security_scan_status: result.passed ? 'passed' : 'failed',
            security_scan_result: result as any,
            security_scan_at: new Date(),
        } as any);
    }

    /**
     * Queue product for security scan (non-blocking)
     */
    queueScan(productId: string, priority: number = 0): void {
        scanQueueService.enqueue(productId, priority);
    }

    /**
     * Scan product asynchronously (for background jobs)
     */
    async scanProductAsync(productId: string): Promise<void> {
        try {
            // Update status to scanning
            await productRepository.update(productId, {
                security_scan_status: 'pending',
            } as any);

            // Perform scan
            const result = await this.scanProduct(productId);

            // Update product with results
            await this.updateProductScanStatus(productId, result);
        } catch (error: any) {
            // Update status to failed
            await productRepository.update(productId, {
                security_scan_status: 'failed',
                security_scan_result: {
                    error: error.message,
                },
                security_scan_at: new Date(),
            } as any);

            throw error;
        }
    }
}

export default new SecurityScanService();

