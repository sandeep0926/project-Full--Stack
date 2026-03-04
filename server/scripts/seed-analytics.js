import dotenv from 'dotenv';
import mongoose from 'mongoose';
import AnalyticsEvent from '../src/models/AnalyticsEvent.js';

dotenv.config({ path: '.env' });

async function seedAnalytics() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get tenant ID from environment or use a default
    const tenantId = '69a7d0c2391d0e2e4a23c5ea'; // Your tenant ID
    const userId = '69a7d0c1391d0e2e4a23c5e8'; // Your user ID

    const events = [];
    const eventTypes = ['page_view', 'user_login', 'user_signup', 'purchase', 'add_to_cart', 'product_view', 'document_view'];
    const pages = ['/dashboard', '/products', '/orders', '/analytics', '/documents', '/settings'];
    const deviceTypes = ['desktop', 'mobile', 'tablet'];
    const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];
    const countries = ['United States', 'United Kingdom', 'Canada', 'Australia', 'India'];
    const cities = ['New York', 'London', 'Toronto', 'Sydney', 'Mumbai'];

    console.log('📊 Creating 100 analytics events...');

    // Create events for the last 7 days
    const now = new Date();
    for (let i = 0; i < 100; i++) {
      const daysAgo = Math.floor(Math.random() * 7);
      const hoursAgo = Math.floor(Math.random() * 24);
      const timestamp = new Date(now);
      timestamp.setDate(timestamp.getDate() - daysAgo);
      timestamp.setHours(timestamp.getHours() - hoursAgo);

      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const revenue = eventType === 'purchase' ? Math.random() * 500 + 50 : 0;

      events.push({
        eventType,
        userId,
        tenantId,
        page: pages[Math.floor(Math.random() * pages.length)],
        device: {
          type: deviceTypes[Math.floor(Math.random() * deviceTypes.length)],
          browser: browsers[Math.floor(Math.random() * browsers.length)]
        },
        geo: {
          country: countries[Math.floor(Math.random() * countries.length)],
          city: cities[Math.floor(Math.random() * cities.length)],
          ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
        },
        referrer: Math.random() > 0.5 ? 'https://google.com' : 'direct',
        sessionId: `session-${Math.random().toString(36).substring(7)}`,
        revenue,
        createdAt: timestamp
      });
    }

    await AnalyticsEvent.insertMany(events);
    console.log('✅ Created 100 analytics events\n');

    const count = await AnalyticsEvent.countDocuments({ tenantId });
    console.log(`📊 Total analytics events: ${count}`);

    console.log('\n✅ Analytics seeding completed successfully!');
    console.log('🎉 Refresh your dashboard to see the data!');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding analytics:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedAnalytics();
