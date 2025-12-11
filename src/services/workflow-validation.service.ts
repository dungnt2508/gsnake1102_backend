// No imports needed for this service currently

/**
 * Workflow Validation Service
 * Validates n8n workflow JSON structure and compatibility
 */

export interface WorkflowValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    metadata?: {
        nodesCount: number;
        triggers: string[];
        credentials: string[];
        n8nVersion?: string;
    };
}

export class WorkflowValidationService {
    /**
     * Validate workflow JSON structure
     */
    validateWorkflowJson(workflowJson: any): WorkflowValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        let nodesCount = 0;
        const triggers: Set<string> = new Set();
        const credentials: Set<string> = new Set();
        let n8nVersion: string | undefined;

        try {
            // Check if it's a valid object
            if (!workflowJson || typeof workflowJson !== 'object') {
                errors.push('Workflow must be a valid JSON object');
                return { valid: false, errors, warnings };
            }

            // Check for required fields
            if (!workflowJson.nodes || !Array.isArray(workflowJson.nodes)) {
                errors.push('Workflow must have a "nodes" array');
            } else {
                nodesCount = workflowJson.nodes.length;
                if (nodesCount === 0) {
                    errors.push('Workflow must have at least one node');
                }

                // Extract triggers and credentials
                workflowJson.nodes.forEach((node: any) => {
                    // Check for trigger nodes
                    if (node.type && node.type.includes('Trigger')) {
                        const triggerType = node.type.replace('Trigger', '').toLowerCase();
                        triggers.add(triggerType);
                    }

                    // Check for credentials
                    if (node.credentials) {
                        Object.keys(node.credentials).forEach((credType: string) => {
                            credentials.add(credType);
                        });
                    }
                });
            }

            // Check for connections
            if (!workflowJson.connections || typeof workflowJson.connections !== 'object') {
                warnings.push('Workflow does not have connections defined');
            }

            // Extract n8n version if available
            if (workflowJson.meta?.instanceId) {
                // n8n workflow may have version info in meta
                n8nVersion = workflowJson.meta.instanceId;
            }

            // Check for common issues
            if (nodesCount > 100) {
                warnings.push('Workflow has many nodes (>100). Consider breaking it into smaller workflows.');
            }

            if (credentials.size === 0) {
                warnings.push('Workflow does not use any credentials. This is unusual for most workflows.');
            }

        } catch (error: any) {
            errors.push(`Failed to parse workflow: ${error.message}`);
        }

        const valid = errors.length === 0;

        return {
            valid,
            errors,
            warnings,
            metadata: valid ? {
                nodesCount,
                triggers: Array.from(triggers),
                credentials: Array.from(credentials),
                n8nVersion,
            } : undefined,
        };
    }

    /**
     * Validate n8n version compatibility
     */
    validateN8nVersion(workflowVersion: string | undefined, systemVersion?: string): boolean {
        if (!workflowVersion) {
            return true; // Can't validate if version not specified
        }

        // Simple version check: extract major.minor
        const versionRegex = /(\d+)\.(\d+)/;
        const workflowMatch = workflowVersion.match(versionRegex);
        
        if (!workflowMatch) {
            return false;
        }

        const workflowMajor = parseInt(workflowMatch[1], 10);
        const workflowMinor = parseInt(workflowMatch[2], 10);

        // For now, accept any 1.x version
        // This can be enhanced to check against actual system version
        return workflowMajor >= 1;
    }

    /**
     * Extract workflow metadata
     */
    extractWorkflowMetadata(workflowJson: any): {
        nodesCount: number;
        triggers: string[];
        credentials: string[];
        n8nVersion?: string;
    } {
        const validation = this.validateWorkflowJson(workflowJson);
        if (!validation.valid || !validation.metadata) {
            return {
                nodesCount: 0,
                triggers: [],
                credentials: [],
            };
        }
        return validation.metadata;
    }
}

export default new WorkflowValidationService();

