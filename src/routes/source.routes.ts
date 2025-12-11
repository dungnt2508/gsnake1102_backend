import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crawlerService from '../services/crawler.service';
import rssService from '../services/rss.service';
import fileParserService from '../services/file-parser.service';
import summarizationService from '../services/summarization.service';
import articleRepository from '../repositories/article.repository';
import summaryRepository from '../repositories/summary.repository';
import { SourceType, ArticleStatus } from '@gsnake/shared-types';
import fs from 'fs';
import util from 'util';
import { pipeline } from 'stream';

const pump = util.promisify(pipeline);

export default async function sourceRoutes(fastify: FastifyInstance) {
    // Schema for URL input
    const urlSchema = z.object({
        url: z.string().url(),
    });

    // POST /api/sources/url
    fastify.post('/url', {
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const { url } = urlSchema.parse(request.body);
        const user = request.user as { userId: string };

        try {
            // 1. Fetch content
            const { title, content, metadata } = await crawlerService.fetchContent(url);

            // 2. Create Article
            const article = await articleRepository.create({
                user_id: user.userId,
                source_type: SourceType.URL,
                source_value: url,
                title,
                url,
                metadata
            });

            // 3. Summarize
            const summaryResult = await summarizationService.summarize(user.userId, content, url);

            // 4. Save Summary
            const summary = await summaryRepository.create({
                article_id: article.id,
                summary_text: summaryResult.summary,
                insights_json: summaryResult.insights,
                data_points_json: summaryResult.data_points
            });

            // 5. Update Article Status
            await articleRepository.update(article.id, {
                status: ArticleStatus.DONE,
                summary: summaryResult.summary, // Simple summary in article table
                raw_text: content
            });

            return { article, summary };
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({ error: 'Failed to process URL' });
        }
    });

    // POST /api/sources/rss
    fastify.post('/rss', {
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const { url } = urlSchema.parse(request.body);
        const user = request.user as { userId: string };

        try {
            // 1. Fetch RSS Feed
            const { title, items } = await rssService.fetchFeed(url);

            // Process each item (limit to 5 for now to avoid timeout/rate limits)
            const processedItems = [];
            for (const item of items.slice(0, 5)) {
                // Create Article for each item
                const article = await articleRepository.create({
                    user_id: user.userId,
                    source_type: SourceType.RSS,
                    source_value: item.link || url,
                    title: item.title,
                    url: item.link,
                    metadata: { pubDate: item.pubDate, author: item.author, feedTitle: title }
                });

                // Summarize content
                const content = item.content || item.summary || '';
                if (content) {
                    const summaryResult = await summarizationService.summarize(user.userId, content, item.link || url);

                    await summaryRepository.create({
                        article_id: article.id,
                        summary_text: summaryResult.summary,
                        insights_json: summaryResult.insights,
                        data_points_json: summaryResult.data_points
                    });

                    await articleRepository.update(article.id, {
                        status: ArticleStatus.DONE,
                        summary: summaryResult.summary,
                        raw_text: content
                    });

                    processedItems.push(article);
                }
            }

            return { message: `Processed ${processedItems.length} articles from RSS feed`, articles: processedItems };
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({ error: 'Failed to process RSS feed' });
        }
    });

    // POST /api/sources/file
    fastify.post('/file', {
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const user = request.user as { userId: string };
        const data = await request.file();

        if (!data) {
            return reply.status(400).send({ error: 'No file uploaded' });
        }

        try {
            // Save file temporarily (or process stream directly if supported by parser)
            // For simplicity, we'll save to temp dir
            const tempPath = `./temp_${data.filename}`;
            await pump(data.file, fs.createWriteStream(tempPath));

            // 1. Parse File
            const content = await fileParserService.parseFile(tempPath, data.mimetype);

            // 2. Create Article
            const article = await articleRepository.create({
                user_id: user.userId,
                source_type: SourceType.FILE,
                source_value: data.filename,
                title: data.filename,
                metadata: { mimetype: data.mimetype }
            });

            // 3. Summarize
            const summaryResult = await summarizationService.summarize(user.userId, content, data.filename);

            // 4. Save Summary
            await summaryRepository.create({
                article_id: article.id,
                summary_text: summaryResult.summary,
                insights_json: summaryResult.insights,
                data_points_json: summaryResult.data_points
            });

            // 5. Update Article Status
            await articleRepository.update(article.id, {
                status: ArticleStatus.DONE,
                summary: summaryResult.summary,
                raw_text: content
            });

            // Cleanup
            fs.unlinkSync(tempPath);

            return { article, summary: summaryResult };
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({ error: 'Failed to process file' });
        }
    });
}
