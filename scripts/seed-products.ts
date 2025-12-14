#!/usr/bin/env node

/**
 * Seed Script - Insert 30 Test Products
 * Usage: npm run seed:products
 * 
 * Creates 30 realistic n8n workflow products for marketplace testing
 * with various types, prices, and features
 */

import pool from '../src/config/database';
import { v4 as uuidv4 } from 'uuid';

// Default seller ID - will be created if doesn't exist
let DEFAULT_SELLER_ID = process.env.SEED_SELLER_ID || 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

/**
 * Get or create default seller user
 */
async function getOrCreateSeller(): Promise<string> {
  try {
    // First, try to find any existing user to use as seller
    const existingUser = await pool.query(
      'SELECT id FROM users LIMIT 1'
    );

    if (existingUser.rows.length > 0) {
      console.log(`📤 Using existing user as seller: ${existingUser.rows[0].id}`);
      return existingUser.rows[0].id;
    }

    // If no user exists, create a default seller
    console.log('📝 Creating default seller user...');
    const sellerId = uuidv4();
    
    await pool.query(
      `INSERT INTO users (id, email, name, password_hash, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE SET id = EXCLUDED.id
       RETURNING id`,
      [
        sellerId,
        'seller@gsnake.local',
        'gsnake Team',
        'hashed_password_placeholder', // Will be replaced by proper hash in production
        'seller'
      ]
    );

    console.log(`✅ Created default seller: ${sellerId}\n`);
    return sellerId;
  } catch (error) {
    console.error('❌ Error getting/creating seller:', error);
    throw error;
  }
}

interface SeedProduct {
  title: string;
  description: string;
  long_description: string;
  type: 'workflow' | 'tool' | 'integration';
  tags: string[];
  is_free: boolean;
  price?: number;
  features: string[];
  requirements: string[];
  rating: number;
  reviews_count: number;
  downloads: number;
  thumbnail_url?: string;  // Add this
}

const products: SeedProduct[] = [
  // Marketing & Social Media
  {
    title: 'Email Marketing Automation Pro',
    description: 'Tự động gửi email campaign, tracking engagement, A/B testing',
    long_description: 'Complete email marketing automation solution with advanced segmentation, personalization, and analytics. Support cho Mailchimp, SendGrid, Klaviyo...',
    type: 'workflow',
    tags: ['Email', 'Marketing', 'Automation', 'CRM'],
    is_free: false,
    price: 49900,
    features: ['Auto-send', 'Segmentation', 'A/B Testing', 'Analytics', 'Template Builder'],
    requirements: ['n8n 1.0+', 'Email provider API'],
    rating: 4.8,
    reviews_count: 324,
    downloads: 2500,
  },
  {
    title: 'Instagram Post Scheduler & Auto-Poster',
    description: 'Schedule Instagram posts, stories, reels tự động. Multi-account support',
    long_description: 'Advanced Instagram automation tool với support cho multiple accounts, hashtag optimization, posting schedules, performance analytics',
    type: 'tool',
    tags: ['Social Media', 'Instagram', 'Marketing', 'Automation'],
    is_free: true,
    features: ['Multi-account', 'Hashtag suggestions', 'Schedule posts', 'Performance tracking'],
    requirements: ['n8n 1.0+', 'Instagram Business account'],
    rating: 4.6,
    reviews_count: 189,
    downloads: 1500,
  },
  {
    title: 'LinkedIn Content Distribution',
    description: 'Tự động chia sẻ content lên LinkedIn, schedule posts, track engagement',
    long_description: 'Professional LinkedIn automation for personal brands and business pages. Auto-share articles, schedule posts, track impressions and engagement.',
    type: 'workflow',
    tags: ['Social Media', 'LinkedIn', 'B2B', 'Marketing'],
    is_free: true,
    features: ['Auto-share', 'Schedule posts', 'Engagement tracking', 'Multi-channel support'],
    requirements: ['n8n 1.0+', 'LinkedIn API'],
    rating: 4.5,
    reviews_count: 156,
    downloads: 1200,
  },
  {
    title: 'Facebook & Instagram Ad Manager',
    description: 'Quản lý Facebook & Instagram ads, tối ưu budget, report performance',
    long_description: 'Complete Facebook Ads management automation. Create, monitor, and optimize campaigns across Facebook and Instagram with real-time reporting.',
    type: 'tool',
    tags: ['Ads', 'Marketing', 'Facebook', 'Social Media'],
    is_free: false,
    price: 79900,
    features: ['Campaign management', 'Budget optimization', 'Real-time reports', 'A/B testing'],
    requirements: ['n8n 1.0+', 'Facebook Ads API'],
    rating: 4.7,
    reviews_count: 234,
    downloads: 1800,
  },

  // Sales & CRM
  {
    title: 'CRM to Notion Sync',
    description: 'Đồng bộ dữ liệu CRM sang Notion workspace tự động',
    long_description: 'Real-time sync between your CRM (Salesforce, HubSpot, Pipedrive) and Notion. Keep all data organized and accessible to your team.',
    type: 'integration',
    tags: ['CRM', 'Notion', 'Integration', 'Automation'],
    is_free: false,
    price: 39900,
    features: ['Real-time sync', 'Multiple CRM support', 'Conflict resolution', 'Custom mapping'],
    requirements: ['n8n 1.0+', 'Notion API', 'CRM API'],
    rating: 4.7,
    reviews_count: 145,
    downloads: 1800,
  },
  {
    title: 'Lead Scoring Pipeline',
    description: 'Tự động đánh giá điểm lead từ email interaction, web behavior, purchase history',
    long_description: 'Intelligent lead scoring based on multiple data points. Automatically prioritize high-quality leads for your sales team.',
    type: 'workflow',
    tags: ['Sales', 'CRM', 'AI', 'Lead generation'],
    is_free: true,
    features: ['Auto-scoring', 'Multi-factor analysis', 'Email tracking', 'Behavior tracking'],
    requirements: ['n8n 1.0+', 'Email provider', 'CRM API'],
    rating: 4.7,
    reviews_count: 92,
    downloads: 900,
  },
  {
    title: 'Salesforce to Google Sheets Sync',
    description: 'Tự động export dữ liệu từ Salesforce sang Google Sheets, tạo report',
    long_description: 'Keep your Google Sheets updated with real-time data from Salesforce. Perfect for dashboards and reporting.',
    type: 'integration',
    tags: ['CRM', 'Google Sheets', 'Salesforce', 'Integration'],
    is_free: true,
    features: ['Real-time sync', 'Custom field mapping', 'Scheduled exports', 'Error handling'],
    requirements: ['n8n 1.0+', 'Salesforce API', 'Google Sheets API'],
    rating: 4.6,
    reviews_count: 134,
    downloads: 1400,
  },

  // AI & Automation
  {
    title: 'AI Content Generator for Blog & Email',
    description: 'Tạo content chất lượng cao cho blog, email, social media bằng GPT-4',
    long_description: 'Use OpenAI GPT-4 to generate engaging content. Support templates for blogs, email campaigns, social posts, and product descriptions.',
    type: 'tool',
    tags: ['AI', 'Content', 'GPT-4', 'Automation'],
    is_free: false,
    price: 59900,
    features: ['GPT-4 integration', 'Content templates', 'Batch processing', 'Quality scoring'],
    requirements: ['n8n 1.0+', 'OpenAI API key'],
    rating: 4.9,
    reviews_count: 412,
    downloads: 3200,
  },
  {
    title: 'AI Customer Support Bot',
    description: 'Chatbot tự động xử lý customer inquiries sử dụng AI',
    long_description: 'Deploy AI-powered chatbot to handle customer support tickets. Integrates with Slack, Email, and web forms. Escalates complex issues to humans.',
    type: 'workflow',
    tags: ['AI', 'Customer Support', 'Chatbot', 'Automation'],
    is_free: false,
    price: 99900,
    features: ['AI responses', 'Multi-channel', 'Escalation', 'Analytics'],
    requirements: ['n8n 1.0+', 'OpenAI API', 'Support platform API'],
    rating: 4.8,
    reviews_count: 278,
    downloads: 2100,
  },
  {
    title: 'Sentiment Analysis & Alert System',
    description: 'Phân tích sentiment từ emails, messages, social media. Alert cho cases tiêu cực',
    long_description: 'Real-time sentiment analysis of customer communications. Automatically alert teams to negative feedback for quick response.',
    type: 'tool',
    tags: ['AI', 'Analytics', 'Monitoring', 'Customer Experience'],
    is_free: false,
    price: 44900,
    features: ['Real-time analysis', 'Alerts', 'Trend reports', 'Multi-language'],
    requirements: ['n8n 1.0+', 'Language API'],
    rating: 4.5,
    reviews_count: 78,
    downloads: 650,
  },

  // Data & Analytics
  {
    title: 'Google Analytics to Slack Reports',
    description: 'Tự động gửi Google Analytics report lên Slack hàng ngày',
    long_description: 'Daily, weekly, or custom Google Analytics reports delivered directly to your Slack channel. Supports multiple properties and custom dimensions.',
    type: 'integration',
    tags: ['Analytics', 'Slack', 'Reporting', 'Automation'],
    is_free: true,
    features: ['Scheduled reports', 'Custom metrics', 'Multiple properties', 'Slack formatting'],
    requirements: ['n8n 1.0+', 'Google Analytics API', 'Slack API'],
    rating: 4.4,
    reviews_count: 123,
    downloads: 980,
  },
  {
    title: 'Database Data Pipeline & ETL',
    description: 'Extract data từ multiple sources, transform, load vào warehouse',
    long_description: 'Complete ETL pipeline solution. Extract from databases, APIs, files. Transform, validate, and load into your data warehouse.',
    type: 'workflow',
    tags: ['Data', 'ETL', 'Pipeline', 'Integration'],
    is_free: false,
    price: 149900,
    features: ['Multi-source support', 'Data transformation', 'Scheduling', 'Error handling'],
    requirements: ['n8n 1.0+', 'Database access', 'Data warehouse'],
    rating: 4.8,
    reviews_count: 189,
    downloads: 1450,
  },

  // Integrations
  {
    title: 'Slack Notification Hub',
    description: 'Gửi thông báo từ 50+ apps lên Slack channels',
    long_description: 'Centralized notification management. Send alerts from your entire tech stack to Slack with custom formatting and routing.',
    type: 'integration',
    tags: ['Slack', 'Notification', 'Integration', 'Monitoring'],
    is_free: true,
    features: ['50+ integrations', 'Custom routing', 'Rich messages', 'Filtering'],
    requirements: ['n8n 1.0+', 'Slack API'],
    rating: 4.5,
    reviews_count: 267,
    downloads: 1200,
  },
  {
    title: 'Webhook to Airtable Forms',
    description: 'Capture webhooks từ form submissions, APIs, convert to Airtable records',
    long_description: 'Transform webhook data into structured Airtable records. Support form submissions, API calls, and webhook events.',
    type: 'integration',
    tags: ['Airtable', 'Forms', 'Webhook', 'Integration'],
    is_free: true,
    features: ['Webhook support', 'Data mapping', 'Validation', 'Error logging'],
    requirements: ['n8n 1.0+', 'Airtable API'],
    rating: 4.6,
    reviews_count: 156,
    downloads: 1100,
  },
  {
    title: 'Zapier to Native n8n Migration',
    description: 'Convert Zapier zaps thành n8n workflows tự động',
    long_description: 'Tool to help migrate from Zapier to n8n. Analyze Zaps and generate equivalent n8n workflows.',
    type: 'tool',
    tags: ['Migration', 'Integration', 'n8n', 'Zapier'],
    is_free: true,
    features: ['Zap analysis', 'Workflow generation', 'Mapping', 'Documentation'],
    requirements: ['n8n 1.0+', 'Zapier export'],
    rating: 4.3,
    reviews_count: 89,
    downloads: 450,
  },

  // Security & Monitoring
  {
    title: 'Security Monitoring & Alert Dashboard',
    description: 'Monitor security events từ CloudFlare, AWS, logs. Alert trên anomalies',
    long_description: 'Centralized security monitoring across your infrastructure. Real-time alerts for suspicious activity and security events.',
    type: 'workflow',
    tags: ['Security', 'Monitoring', 'AlertING', 'DevOps'],
    is_free: false,
    price: 129900,
    features: ['Multi-source monitoring', 'Alert rules', 'Escalation', 'Audit logs'],
    requirements: ['n8n 1.0+', 'Cloud provider APIs'],
    rating: 4.7,
    reviews_count: 134,
    downloads: 890,
  },
  {
    title: 'SSL Certificate Expiry Monitoring',
    description: 'Monitor SSL certs của tất cả domains, alert trước khi hết hạn',
    long_description: 'Automated SSL certificate monitoring. Get alerts weeks before expiration to prevent downtime.',
    type: 'tool',
    tags: ['Security', 'Monitoring', 'DevOps', 'Automation'],
    is_free: true,
    features: ['Multi-domain support', 'Advance alerts', 'Email notifications', 'Dashboard'],
    requirements: ['n8n 1.0+'],
    rating: 4.5,
    reviews_count: 98,
    downloads: 650,
  },
  {
    title: 'API Rate Limit & Quota Monitor',
    description: 'Monitor API usage rates, quotas. Alert khi approaching limits',
    long_description: 'Track API usage across all your integrations. Get alerted before hitting rate limits or quota thresholds.',
    type: 'tool',
    tags: ['Monitoring', 'API', 'DevOps', 'Automation'],
    is_free: true,
    features: ['Multi-API support', 'Usage tracking', 'Trend analysis', 'Alerts'],
    requirements: ['n8n 1.0+'],
    rating: 4.4,
    reviews_count: 67,
    downloads: 520,
  },

  // More workflows
  {
    title: 'Newsletter Subscriber Management',
    description: 'Manage subscriber lists, automate welcome sequences, segment users',
    long_description: 'Complete newsletter automation. Manage subscribers, send welcome sequences, segment lists, track opens and clicks.',
    type: 'workflow',
    tags: ['Email', 'Newsletter', 'Marketing', 'Automation'],
    is_free: false,
    price: 34900,
    features: ['List management', 'Sequences', 'Segmentation', 'Analytics'],
    requirements: ['n8n 1.0+', 'Email provider'],
    rating: 4.6,
    reviews_count: 178,
    downloads: 1340,
  },
  {
    title: 'E-commerce Order Processing',
    description: 'Automate order processing từ Shopify/WooCommerce sang fulfillment',
    long_description: 'Streamline e-commerce operations. Auto-process orders, update inventory, notify customers, integrate with shipping.',
    type: 'workflow',
    tags: ['E-commerce', 'Automation', 'Orders', 'Integration'],
    is_free: false,
    price: 69900,
    features: ['Multi-store support', 'Inventory sync', 'Notifications', 'Reporting'],
    requirements: ['n8n 1.0+', 'E-commerce platform API'],
    rating: 4.8,
    reviews_count: 245,
    downloads: 1920,
  },
  {
    title: 'Invoice Generation & Payment Tracking',
    description: 'Tự động tạo invoices, track payments, send reminders',
    long_description: 'Automated invoicing workflow. Generate invoices from orders, track payments, send reminders for unpaid invoices.',
    type: 'workflow',
    tags: ['Accounting', 'Invoicing', 'Automation', 'Finance'],
    is_free: false,
    price: 29900,
    features: ['Template-based', 'Payment tracking', 'Reminders', 'Reports'],
    requirements: ['n8n 1.0+', 'Payment gateway API'],
    rating: 4.5,
    reviews_count: 112,
    downloads: 780,
  },
  {
    title: 'Job Application Screening Bot',
    description: 'Screen job applications, assess fit, score candidates tự động',
    long_description: 'AI-powered recruitment automation. Screen applications, assess qualifications, score candidates, schedule interviews.',
    type: 'tool',
    tags: ['HR', 'Recruitment', 'AI', 'Automation'],
    is_free: false,
    price: 89900,
    features: ['AI screening', 'Scoring', 'Interview scheduling', 'Analytics'],
    requirements: ['n8n 1.0+', 'AI API', 'HR platform API'],
    rating: 4.7,
    reviews_count: 156,
    downloads: 1100,
  },
  {
    title: 'Employee Onboarding Workflow',
    description: 'Automate employee onboarding - access, systems, training materials',
    long_description: 'Complete employee onboarding automation. Provision accounts, assign resources, send training materials, track completion.',
    type: 'workflow',
    tags: ['HR', 'Onboarding', 'Automation', 'Employee'],
    is_free: true,
    features: ['Account provisioning', 'Resource assignment', 'Training', 'Progress tracking'],
    requirements: ['n8n 1.0+', 'HR system API'],
    rating: 4.6,
    reviews_count: 134,
    downloads: 890,
  },
  {
    title: 'Expense Report Automation',
    description: 'Collect expenses, categorize, approve, reimburse tự động',
    long_description: 'Streamline expense management. Collect receipts, categorize expenses, route for approval, process reimbursements.',
    type: 'workflow',
    tags: ['Finance', 'Accounting', 'Automation', 'Expense'],
    is_free: true,
    features: ['Receipt capture', 'Categorization', 'Approval routing', 'Reimbursement'],
    requirements: ['n8n 1.0+', 'Accounting system API'],
    rating: 4.4,
    reviews_count: 98,
    downloads: 620,
  },
  {
    title: 'Backup Automation & Monitoring',
    description: 'Automate backups từ multiple sources, verify integrity, alert on failures',
    long_description: 'Comprehensive backup automation. Schedule backups from databases, files, and APIs. Verify integrity and alert on failures.',
    type: 'tool',
    tags: ['DevOps', 'Backup', 'Monitoring', 'Automation'],
    is_free: false,
    price: 54900,
    features: ['Multi-source', 'Verification', 'Scheduling', 'Alerts'],
    requirements: ['n8n 1.0+', 'Storage access'],
    rating: 4.7,
    reviews_count: 145,
    downloads: 980,
  },
  {
    title: 'Log Aggregation & Analysis',
    description: 'Collect logs từ apps, analyze patterns, alert on errors',
    long_description: 'Centralized log management. Aggregate logs from all sources, analyze patterns, alert on critical errors.',
    type: 'workflow',
    tags: ['DevOps', 'Monitoring', 'Logging', 'Analytics'],
    is_free: false,
    price: 64900,
    features: ['Multi-source', 'Pattern analysis', 'Alerts', 'Dashboard'],
    requirements: ['n8n 1.0+', 'Log sources'],
    rating: 4.6,
    reviews_count: 167,
    downloads: 1120,
  },
  {
    title: 'Calendar & Meeting Scheduler',
    description: 'Schedule meetings, find common availability, send invites tự động',
    long_description: 'Smart meeting automation. Check availability across calendars, find optimal meeting times, send invitations.',
    type: 'workflow',
    tags: ['Productivity', 'Automation', 'Calendar', 'Meetings'],
    is_free: true,
    features: ['Multi-calendar', 'Availability detection', 'Invitations', 'Reminders'],
    requirements: ['n8n 1.0+', 'Calendar API'],
    rating: 4.5,
    reviews_count: 123,
    downloads: 850,
  },
  {
    title: 'Knowledge Base Auto-Generator',
    description: 'Tạo knowledge base từ support tickets, documentation, FAQs',
    long_description: 'Automated knowledge base generation from support history. Extract FAQs, create documentation, keep it updated.',
    type: 'tool',
    tags: ['Documentation', 'AI', 'Automation', 'Support'],
    is_free: true,
    features: ['Ticket analysis', 'FAQ extraction', 'Auto-documentation', 'Updates'],
    requirements: ['n8n 1.0+', 'Support system API', 'AI API'],
    rating: 4.4,
    reviews_count: 89,
    downloads: 540,
  },
];

async function seedProducts() {
  try {
    console.log('🌱 Starting product seeding...\n');

    // Get or create seller
    DEFAULT_SELLER_ID = await getOrCreateSeller();

    console.log(`📊 Inserting ${products.length} products\n`);

    let inserted = 0;

    for (const product of products) {
      try {
        const id = uuidv4();
        
        // Set random dates within last 3 months for realistic data
        const daysAgo = Math.floor(Math.random() * 90);
        const created_at = new Date();
        created_at.setDate(created_at.getDate() - daysAgo);

        const query = `
          INSERT INTO products (
            id,
            seller_id,
            title,
            description,
            long_description,
            type,
            tags,
            is_free,
            price,
            status,
            review_status,
            rating,
            reviews_count,
            downloads,
            features,
            requirements,
            thumbnail_url,
            created_at,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
          )
          ON CONFLICT (id) DO NOTHING
        `;

        const values = [
          id,
          DEFAULT_SELLER_ID,
          product.title,
          product.description,
          product.long_description,
          product.type,
          JSON.stringify(product.tags),
          product.is_free,
          product.price || null,
          'draft',  // status - draft not published
          'pending',  // review_status - pending for approval
          product.rating,
          product.reviews_count,
          product.downloads,
          JSON.stringify(product.features),
          JSON.stringify(product.requirements),
          product.thumbnail_url || `https://via.placeholder.com/400x300?text=${encodeURIComponent(product.title)}`,  // thumbnail
          created_at.toISOString(),
          new Date().toISOString(),
        ];

        await pool.query(query, values);
        
        console.log(`✅ [${++inserted}/${products.length}] ${product.title}`);
      } catch (error) {
        console.error(`❌ Error inserting product: ${product.title}`, error);
      }
    }

    console.log(`\n✅ Seeding complete!`);
    console.log(`📊 ${inserted} products inserted successfully`);
    console.log(`\n📝 Notes:`);
    console.log(`   - Status: All set to "published"`);
    console.log(`   - Seller ID: ${DEFAULT_SELLER_ID}`);
    console.log(`   - Rating: Realistic ratings between 4.3-4.9`);
    console.log(`   - Downloads: Realistic download counts`);
    console.log(`   - Created dates: Spread across last 90 days`);

    process.exit(0);
  } catch (error) {
    console.error('💥 Fatal error during seeding:', error);
    process.exit(1);
  }
}

// Run seeding
seedProducts();

