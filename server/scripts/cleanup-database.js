import 'dotenv/config';
import mongoose from 'mongoose';
import AnalyticsEvent from '../src/models/AnalyticsEvent.js';
import Product from '../src/models/Product.js';

async function cleanup() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');
        
        // Get current stats
        console.log('📊 Current Database Stats:');
        const beforeEvents = await AnalyticsEvent.countDocuments();
        const beforeProducts = await Product.countDocuments();
        console.log(`   Analytics Events: ${beforeEvents.toLocaleString()}`);
        console.log(`   Products: ${beforeProducts.toLocaleString()}\n`);
        
        // Delete all analytics events
        console.log('🗑️  Deleting analytics events...');
        const eventsResult = await AnalyticsEvent.deleteMany({});
        console.log(`✅ Deleted ${eventsResult.deletedCount.toLocaleString()} analytics events\n`);
        
        // Delete test products (created by performance tests)
        console.log('🗑️  Deleting test products...');
        const productsResult = await Product.deleteMany({ sku: /^SKU-\d+$/ });
        console.log(`✅ Deleted ${productsResult.deletedCount.toLocaleString()} test products\n`);
        
        // Get final stats
        console.log('📊 Final Database Stats:');
        const afterEvents = await AnalyticsEvent.countDocuments();
        const afterProducts = await Product.countDocuments();
        console.log(`   Analytics Events: ${afterEvents.toLocaleString()}`);
        console.log(`   Products: ${afterProducts.toLocaleString()}\n`);
        
        console.log('✅ Database cleanup completed successfully!');
        console.log('🎉 You can now login without storage quota errors.\n');
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

cleanup();
