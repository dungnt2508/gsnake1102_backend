const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5433}/${process.env.DB_NAME}`,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    // Get migration file from command line argument or use default
    const migrationFile = process.argv[2] || '008_add_role_and_approval_system.sql';
    const migrationPath = path.join(__dirname, '../migrations', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationFile}`);
    }
    
    console.log(`🔄 Running migration: ${migrationFile}`);
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    
    // Check if already exists errors
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log('ℹ️  Migration may have already been applied, skipping...');
    } else {
      throw error;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);

