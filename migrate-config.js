const dotenv = require('dotenv');
const path = require('path');

// Load .env file
const result = dotenv.config({ path: path.join(__dirname, '.env') });

if (result.error) {
    console.error('Error loading .env file:', result.error);
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.error('DATABASE_URL is not defined in .env');
} else {
    // Mask password for logging
    const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
    console.log('Using DATABASE_URL:', maskedUrl);
}

module.exports = {
    'database-url': process.env.DATABASE_URL,
    'migrations-dir': 'migrations',
    'migrations-table': 'pgmigrations',
    dir: 'migrations',
    direction: 'up',
    schema: 'public',
    count: Infinity,
    timestamp: false,
    verbose: true,
};
