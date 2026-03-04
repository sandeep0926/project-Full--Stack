import 'dotenv/config';
import mongoose from 'mongoose';
import AnalyticsEvent from '../../src/models/AnalyticsEvent.js';
import Product from '../../src/models/Product.js';
import User from '../../src/models/User.js';
import Tenant from '../../src/models/Tenant.js';

const BATCH_SIZE = 10000;

/**
 * Seed 1M+ Analytics Events for performance testing
 */
async function seedAnalyticsEvents(count = 1000000) {
    console.log(`\n📊 Seeding ${count.toLocaleString()} analytics events...`);
    const startTime = Date.now();
    
    // Get or create test tenant and user
    let tenant = await Tenant.findOne({ slug: 'perf-test-tenant' });
    if (!tenant) {
        tenant = await Tenant.create({
            name: 'Performance Test Tenant',
            slug: 'perf-test-tenant',
            owner: new mongoose.Types.ObjectId(),
            settings: { features: ['analytics_basic', 'analytics_advanced'] }
        });
    }
    
    let user = await User.findOne({ email: 'perftest@example.com' });
    if (!user) {
        user = await User.create({
            name: 'Performance Test User',
            email: 'perftest@example.com',
            password: 'password123',
            role: 'admin',
            tenantId: tenant._id
        });
    }
    
    const eventTypes = ['page_view', 'user_login', 'product_view', 'purchase', 'add_to_cart', 'checkout_start'];
    const pages = ['/home', '/products', '/checkout', '/dashboard', '/settings', '/profile', '/cart', '/orders'];
    const devices = ['desktop', 'mobile', 'tablet'];
    const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];
    const countries = ['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'JP', 'IN'];
    const cities = ['New York', 'London', 'Toronto', 'Sydney', 'Berlin', 'Paris', 'Tokyo', 'Mumbai'];
    
    const batches = Math.ceil(count / BATCH_SIZE);
    let totalInserted = 0;
    
    for (let batch = 0; batch < batches; batch++) {
        const events = [];
        const batchSize = Math.min(BATCH_SIZE, count - totalInserted);
        
        for (let i = 0; i < batchSize; i++) {
            const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
            events.push({
                eventType,
                userId: user._id,
                tenantId: tenant._id,
                page: pages[Math.floor(Math.random() * pages.length)],
                revenue: eventType === 'purchase' ? Math.floor(Math.random() * 1000) + 10 : 0,
                device: {
                    type: devices[Math.floor(Math.random() * devices.length)],
                    browser: browsers[Math.floor(Math.random() * browsers.length)]
                },
                geo: {
                    country: countries[Math.floor(Math.random() * countries.length)],
                    city: cities[Math.floor(Math.random() * cities.length)],
                    ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
                },
                referrer: Math.random() > 0.5 ? 'https://google.com' : 'https://facebook.com',
                sessionId: `session-${Math.floor(Math.random() * 10000)}`,
                createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000) // Random date within last year
            });
        }
        
        await AnalyticsEvent.insertMany(events, { ordered: false });
        totalInserted += batchSize;
        
        const progress = ((batch + 1) / batches * 100).toFixed(1);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rate = (totalInserted / elapsed).toFixed(0);
        console.log(`  Progress: ${progress}% | Inserted: ${totalInserted.toLocaleString()} | Rate: ${rate} events/sec`);
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Completed in ${duration}s | Total: ${totalInserted.toLocaleString()} events`);
    
    return { tenant, user, count: totalInserted };
}

/**
 * Seed 100K Products for performance testing
 */
async function seedProducts(count = 100000) {
    console.log(`\n📦 Seeding ${count.toLocaleString()} products...`);
    const startTime = Date.now();
    
    const categories = ['Electronics', 'Clothing', 'Home', 'Sports', 'Books', 'Toys', 'Food', 'Beauty'];
    const batches = Math.ceil(count / BATCH_SIZE);
    let totalInserted = 0;
    
    for (let batch = 0; batch < batches; batch++) {
        const products = [];
        const batchSize = Math.min(BATCH_SIZE, count - totalInserted);
        
        for (let i = 0; i < batchSize; i++) {
            const productNum = totalInserted + i;
            products.push({
                name: `Product ${productNum}`,
                slug: `product-${productNum}`,
                sku: `SKU-${productNum}`,
                description: `Description for product ${productNum}`,
                price: Math.floor(Math.random() * 1000) + 10,
                compareAtPrice: Math.floor(Math.random() * 1500) + 100,
                category: categories[Math.floor(Math.random() * categories.length)],
                inventory: {
                    quantity: Math.floor(Math.random() * 1000),
                    trackInventory: true,
                    lowStockThreshold: 10
                },
                status: 'active',
                isPublished: true,
                publishedAt: new Date()
            });
        }
        
        await Product.insertMany(products, { ordered: false });
        totalInserted += batchSize;
        
        const progress = ((batch + 1) / batches * 100).toFixed(1);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rate = (totalInserted / elapsed).toFixed(0);
        console.log(`  Progress: ${progress}% | Inserted: ${totalInserted.toLocaleString()} | Rate: ${rate} products/sec`);
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Completed in ${duration}s | Total: ${totalInserted.toLocaleString()} products`);
    
    return totalInserted;
}

/**
 * Main seeding function
 */
async function main() {
    try {
        console.log('🚀 Starting Performance Test Data Seeding');
        console.log('==========================================\n');
        
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');
        
        // Check existing data
        const existingEvents = await AnalyticsEvent.countDocuments();
        const existingProducts = await Product.countDocuments();
        
        console.log(`📊 Current Data:`);
        console.log(`   Analytics Events: ${existingEvents.toLocaleString()}`);
        console.log(`   Products: ${existingProducts.toLocaleString()}\n`);
        
        // Seed analytics events (1M)
        if (existingEvents < 1000000) {
            const eventsToSeed = 1000000 - existingEvents;
            await seedAnalyticsEvents(eventsToSeed);
        } else {
            console.log('✅ Already have 1M+ analytics events');
        }
        
        // Seed products (100K)
        if (existingProducts < 100000) {
            const productsToSeed = 100000 - existingProducts;
            await seedProducts(productsToSeed);
        } else {
            console.log('✅ Already have 100K+ products');
        }
        
        // Final summary
        const finalEvents = await AnalyticsEvent.countDocuments();
        const finalProducts = await Product.countDocuments();
        
        console.log('\n==========================================');
        console.log('✅ Seeding Complete!');
        console.log('==========================================');
        console.log(`📊 Final Data:`);
        console.log(`   Analytics Events: ${finalEvents.toLocaleString()}`);
        console.log(`   Products: ${finalProducts.toLocaleString()}`);
        console.log('\n🎯 Database is ready for performance testing!\n');
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

main();
