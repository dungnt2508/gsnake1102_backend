const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5433}/${process.env.DB_NAME}`,
});

async function setAdminRole() {
  const client = await pool.connect();
  
  try {
    const email = process.argv[2];
    
    if (!email) {
      console.error('❌ Vui lòng cung cấp email của user:');
      console.log('   node scripts/set-admin-role.js user@example.com');
      process.exit(1);
    }
    
    console.log(`🔄 Đang set role admin cho user: ${email}`);
    
    // Check if user exists
    const userResult = await client.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      console.error(`❌ Không tìm thấy user với email: ${email}`);
      process.exit(1);
    }
    
    const user = userResult.rows[0];
    console.log(`   User hiện tại: ${user.email}, Role: ${user.role || 'null'}`);
    
    // Update role to admin
    await client.query(
      'UPDATE users SET role = $1 WHERE email = $2',
      ['admin', email]
    );
    
    console.log('✅ Đã set role admin thành công!');
    console.log(`   User: ${email}`);
    console.log(`   Role: admin`);
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setAdminRole();

