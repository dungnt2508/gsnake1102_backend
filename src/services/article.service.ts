import articleRepository from '../repositories/article.repository';
import llmService from './llm.service';
import { n8nClient, n8nConfig } from '../config/n8n';
import { Article, CreateArticleInput, ArticleStatus, SourceType } from '@gsnake/shared-types';

export class ArticleService {
    /**
     * Get all articles for a user
     */
    async getUserArticles(userId: string, limit: number = 50, offset: number = 0): Promise<Article[]> {
        return await articleRepository.findByUserId(userId, limit, offset);
    }

    /**
     * Get article by ID
     */
    async getArticle(id: string): Promise<Article | null> {
        return await articleRepository.findById(id);
    }

    /**
     * Submit article for summarization
     * This triggers the n8n workflow
     */
    async submitArticle(data: CreateArticleInput): Promise<Article> {
        // Check if article already exists
        // Use findBySource if source info is available, otherwise fallback to findByUrl
        let existingArticle: Article | null = null;

        if (data.source_type && data.source_value) {
            existingArticle = await articleRepository.findBySource(data.source_type, data.source_value);
        } else if (data.url) {
            existingArticle = await articleRepository.findByUrl(data.url);
        }

        if (existingArticle) {
            return existingArticle;
        }

        // Business logic: Prepare article data with defaults
        const articleData: CreateArticleInput & { status?: ArticleStatus } = {
            ...data,
            // Business rule: Set default URL if source_type is URL
            url: data.url || (data.source_type === SourceType.URL ? data.source_value : undefined),
            // Business rule: New articles start as PENDING
            status: ArticleStatus.PENDING,
        };

        // Create article record
        const article = await articleRepository.create(articleData);

        // Trigger n8n workflow asynchronously
        this.triggerSummarizationWorkflow(article).catch((err) => {
            console.error(`Failed to trigger n8n workflow for article ${article.id}:`, err);
            // Update article status to failed
            articleRepository.update(article.id, { status: ArticleStatus.FAILED });
        });

        return article;
    }

    /**
     * Trigger n8n workflow for article summarization
     * n8n workflow will:
     * 1. Fetch article content
     * 2. Call LLM with user persona for summarization
     * 3. Call back to update article via webhook
     */
    private async triggerSummarizationWorkflow(article: Article): Promise<void> {
        try {
            // Update status to processing
            await articleRepository.update(article.id, { status: ArticleStatus.PROCESSING });

            // Call n8n webhook
            const response = await n8nClient.post(n8nConfig.webhooks.articleSummary, {
                articleId: article.id,
                url: article.url,
                userId: article.user_id,
            });

            // Store workflow ID if provided
            if (response.data?.workflowId) {
                await articleRepository.update(article.id, {
                    workflow_id: response.data.workflowId,
                });
            }

            console.log(`✅ n8n workflow triggered for article ${article.id}`);
        } catch (error: any) {
            console.error(`❌ Failed to trigger n8n workflow:`, error.message);
            throw error;
        }
    }

    /**
     * Update article with summary (called by n8n webhook callback)
     * This is the callback endpoint that n8n calls after processing
     */
    async updateArticleSummary(
        articleId: string,
        summary: string,
        title?: string,
        source?: string
    ): Promise<Article> {
        const updated = await articleRepository.update(articleId, {
            summary,
            title,
            source,
            status: ArticleStatus.DONE,
        });

        if (!updated) {
            throw new Error('Article not found');
        }

        return updated;
    }

    /**
     * Mark article as failed (called by n8n webhook on error)
     */
    async markArticleFailed(articleId: string): Promise<Article> {
        const updated = await articleRepository.update(articleId, {
            status: ArticleStatus.FAILED,
        });

        if (!updated) {
            throw new Error('Article not found');
        }

        return updated;
    }

    /**
     * Delete article
     */
    async deleteArticle(id: string): Promise<void> {
        const deleted = await articleRepository.delete(id);
        if (!deleted) {
            throw new Error('Article not found');
        }
    }
}

export default new ArticleService();
