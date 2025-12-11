import Parser from 'rss-parser';

export class RssService {
    private parser: Parser;

    constructor() {
        this.parser = new Parser();
    }

    /**
     * Fetch and parse RSS feed
     */
    async fetchFeed(url: string): Promise<{ title: string; items: any[] }> {
        try {
            const feed = await this.parser.parseURL(url);

            return {
                title: feed.title || 'No Title',
                items: feed.items.map(item => ({
                    title: item.title,
                    link: item.link,
                    pubDate: item.pubDate,
                    content: item.content || item.contentSnippet || '',
                    guid: item.guid,
                    author: item.creator
                }))
            };
        } catch (error) {
            console.error(`Error fetching RSS feed ${url}:`, error);
            throw new Error(`Failed to fetch RSS feed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

export default new RssService();
