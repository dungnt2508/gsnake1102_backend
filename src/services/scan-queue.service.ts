/**
 * Simple in-memory queue for background security scans
 * In production, consider using Redis Queue (BullMQ) or similar
 */

import securityScanService from './security-scan.service';

interface ScanJob {
    productId: string;
    priority: number;
    createdAt: Date;
}

export class ScanQueueService {
    private queue: ScanJob[] = [];
    private processing: Set<string> = new Set();
    private maxConcurrentScans: number = 3;
    private processingInterval: NodeJS.Timeout | null = null;

    constructor() {
        // Start processing queue
        this.startProcessor();
    }

    /**
     * Add product to scan queue
     */
    enqueue(productId: string, priority: number = 0): void {
        // Check if already in queue or processing
        if (this.queue.some(job => job.productId === productId) || this.processing.has(productId)) {
            return;
        }

        // Add to queue (sorted by priority, then by creation time)
        this.queue.push({
            productId,
            priority,
            createdAt: new Date(),
        });

        // Sort queue: higher priority first, then older jobs first
        this.queue.sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority; // Higher priority first
            }
            return a.createdAt.getTime() - b.createdAt.getTime(); // Older first
        });
    }

    /**
     * Process queue
     */
    private async processQueue(): Promise<void> {
        // Check if we can process more scans
        if (this.processing.size >= this.maxConcurrentScans || this.queue.length === 0) {
            return;
        }

        // Get next job from queue
        const job = this.queue.shift();
        if (!job) {
            return;
        }

        // Mark as processing
        this.processing.add(job.productId);

        // Process scan asynchronously
        securityScanService
            .scanProductAsync(job.productId)
            .catch((error) => {
                console.error(`Security scan failed for product ${job.productId}:`, error);
            })
            .finally(() => {
                // Remove from processing set
                this.processing.delete(job.productId);
            });
    }

    /**
     * Start queue processor
     */
    private startProcessor(): void {
        // Process queue every 2 seconds
        this.processingInterval = setInterval(() => {
            this.processQueue().catch((error) => {
                console.error('Error processing scan queue:', error);
            });
        }, 2000);
    }

    /**
     * Stop queue processor
     */
    stopProcessor(): void {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
    }

    /**
     * Get queue status
     */
    getStatus(): {
        queueLength: number;
        processing: number;
        processingIds: string[];
    } {
        return {
            queueLength: this.queue.length,
            processing: this.processing.size,
            processingIds: Array.from(this.processing),
        };
    }
}

export default new ScanQueueService();

