const pdf = require('pdf-parse');
import mammoth from 'mammoth';
import fs from 'fs';

export class FileParserService {
    /**
     * Parse file content based on mimetype
     */
    async parseFile(filePath: string, mimetype: string): Promise<string> {
        try {
            if (mimetype === 'application/pdf') {
                return await this.parsePdf(filePath);
            } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                return await this.parseDocx(filePath);
            } else if (mimetype === 'text/plain') {
                return await this.parseTxt(filePath);
            } else {
                throw new Error(`Unsupported file type: ${mimetype}`);
            }
        } catch (error) {
            console.error(`Error parsing file ${filePath}:`, error);
            throw new Error(`Failed to parse file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async parsePdf(filePath: string): Promise<string> {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        return data.text;
    }

    private async parseDocx(filePath: string): Promise<string> {
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
    }

    private async parseTxt(filePath: string): Promise<string> {
        return fs.readFileSync(filePath, 'utf-8');
    }
}

export default new FileParserService();
