const redis = require('ioredis');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const client = new redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
});

async function resetRateLimit() {
  try {
    console.log('🔄 Resetting rate limit keys...');
    
    // Get all rate limit keys
    const keys = await client.keys('rate_limit:*');
    
    if (keys.length === 0) {
      console.log('✅ No rate limit keys found');
      await client.quit();
      return;
    }
    
    // Delete all rate limit keys
    const deleted = await client.del(...keys);
    
    console.log(`✅ Deleted ${deleted} rate limit key(s)`);
    console.log('✅ Rate limit reset complete!');
    
    await client.quit();
  } catch (error) {
    console.error('❌ Error resetting rate limit:', error.message);
    await client.quit();
    process.exit(1);
  }
}

resetRateLimit();

