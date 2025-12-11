import axios from 'axios';
import * as cheerio from 'cheerio';

export class CrawlerService {
    /**
     * Fetch and parse content from URL
     */
    async fetchContent(url: string): Promise<{ title: string; content: string; metadata: any }> {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 10000
            });

            const html = response.data;
            const $ = cheerio.load(html);

            // Remove scripts, styles, and other non-content elements
            $('script, style, nav, footer, iframe, noscript').remove();

            const title = $('title').text().trim() || $('h1').first().text().trim() || 'No Title';

            // Try to find main content
            let content = '';
            const mainSelectors = ['article', 'main', '.content', '#content', '.post-content', '.entry-content'];

            for (const selector of mainSelectors) {
                const element = $(selector);
                if (element.length > 0) {
                    content = element.text().trim();
                    break;
                }
            }

            // Fallback to body if no main content found
            if (!content) {
                content = $('body').text().trim();
            }

            // Clean up whitespace
            content = content.replace(/\s+/g, ' ').trim();

            const metadata = {
                description: $('meta[name="description"]').attr('content') || '',
                keywords: $('meta[name="keywords"]').attr('content') || '',
                ogTitle: $('meta[property="og:title"]').attr('content') || '',
                ogDescription: $('meta[property="og:description"]').attr('content') || '',
                ogImage: $('meta[property="og:image"]').attr('content') || '',
            };

            return { title, content, metadata };
        } catch (error) {
            console.error(`Error fetching URL ${url}:`, error);
            throw new Error(`Failed to fetch content from URL: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

export default new CrawlerService();
