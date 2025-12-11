import { n8nClient, n8nConfig } from '../config/n8n';

export class WorkflowService {
    /**
     * Trigger article summarization workflow
     * @param articleId - Article ID
     * @param url - Article URL
     * @param userId - User ID for persona injection
     */
    async triggerArticleSummary(articleId: string, url: string, userId: string): Promise<string> {
        try {
            const response = await n8nClient.post(n8nConfig.webhooks.articleSummary, {
                articleId,
                url,
                userId,
                timestamp: new Date().toISOString(),
            });

            return response.data?.workflowId || '';
        } catch (error: any) {
            throw new Error(`Failed to trigger article summary workflow: ${error.message}`);
        }
    }

    /**
     * Trigger scheduled fetch workflow
     * @param scheduleId - Schedule ID
     * @param articleUrl - Article URL to fetch
     * @param userId - User ID
     */
    async triggerScheduledFetch(scheduleId: string, articleUrl: string, userId: string): Promise<string> {
        try {
            const response = await n8nClient.post(n8nConfig.webhooks.scheduledFetch, {
                scheduleId,
                articleUrl,
                userId,
                timestamp: new Date().toISOString(),
            });

            return response.data?.workflowId || '';
        } catch (error: any) {
            throw new Error(`Failed to trigger scheduled fetch workflow: ${error.message}`);
        }
    }

    /**
     * Trigger tool generation workflow
     * @param toolRequestId - Tool request ID
     * @param requestPayload - Tool generation request payload
     * @param userId - User ID for persona injection
     */
    async triggerToolGeneration(
        toolRequestId: string,
        requestPayload: Record<string, any>,
        userId: string
    ): Promise<string> {
        try {
            const response = await n8nClient.post(n8nConfig.webhooks.toolGeneration, {
                toolRequestId,
                requestPayload,
                userId,
                timestamp: new Date().toISOString(),
            });

            return response.data?.workflowId || '';
        } catch (error: any) {
            throw new Error(`Failed to trigger tool generation workflow: ${error.message}`);
        }
    }

    /**
     * Get workflow status from n8n
     * @param workflowId - n8n workflow execution ID
     */
    async getWorkflowStatus(workflowId: string): Promise<any> {
        try {
            const response = await n8nClient.get(`/executions/${workflowId}`);
            return response.data;
        } catch (error: any) {
            throw new Error(`Failed to get workflow status: ${error.message}`);
        }
    }

    /**
     * MODULAR TOOL EXTENSION GUIDE:
     * 
     * To add a new workflow type:
     * 
     * 1. Add webhook URL to n8nConfig in config/n8n.ts:
     *    webhooks: {
     *      yourNewWorkflow: `${process.env.N8N_BASE_URL}/webhook/your-new-workflow`
     *    }
     * 
     * 2. Create a trigger method here:
     *    async triggerYourNewWorkflow(params): Promise<string> {
     *      const response = await n8nClient.post(n8nConfig.webhooks.yourNewWorkflow, {
     *        // your payload
     *      });
     *      return response.data?.workflowId || '';
     *    }
     * 
     * 3. Create the corresponding n8n workflow in your n8n instance at abc.pnj.com
     * 
     * 4. Create a callback route to handle workflow results (see routes/article.routes.ts)
     * 
     * 5. Update your database schema if needed to track the new workflow type
     */
}

export default new WorkflowService();
