import 'dotenv/config';
import mongoose from 'mongoose';
import AnalyticsEvent from '../../src/models/AnalyticsEvent.js';
import Product from '../../src/models/Product.js';
import Order from '../../src/models/Order.js';

/**
 * Benchmark a query
 */
async function benchmarkQuery(name, queryFn, iterations = 10) {
    console.log(`\n🔍 Benchmarking: ${name}`);
    console.log(`   Iterations: ${iterations}`);
    
    const durations = [];
    let results = null;
    
    for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        results = await queryFn();
        const duration = Date.now() - startTime;
        durations.push(duration);
        process.stdout.write(`\r   Progress: ${i + 1}/${iterations} | Last: ${duration}ms`);
    }
    
    console.log('\n');
    
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const sorted = durations.sort((a, b) => a - b);
    const p95 = sorted[Math.ceil(0.95 * sorted.length) - 1];
    
    console.log('   Results:');
    console.log(`      Average: ${avgDuration.toFixed(2)}ms`);
    console.log(`      Min: ${minDuration}ms`);
    console.log(`      Max: ${maxDuration}ms`);
    console.log(`      P95: ${p95}ms`);
    console.log(`      Records: ${Array.isArray(results) ? results.length : 'N/A'}`);
    
    return { name, avgDuration, minDuration, maxDuration, p95, durations };
}

/**
 * Main benchmark
 */
async function main() {
    try {
        console.log('🚀 Starting Database Performance Benchmark');
        console.log('==========================================\n');
        
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');
        
        // Check data counts
        const eventCount = await AnalyticsEvent.countDocuments();
        const productCount = await Product.countDocuments();
        const orderCount = await Order.countDocuments();
        
        console.log('📊 Database Stats:');
        console.log(`   Analytics Events: ${eventCount.toLocaleString()}`);
        console.log(`   Products: ${productCount.toLocaleString()}`);
        console.log(`   Orders: ${orderCount.toLocaleString()}`);
        
        const benchmarks = [];
        
        // Benchmark 1: Simple analytics query
        benchmarks.push(await benchmarkQuery(
            'Analytics: Find recent events (limit 100)',
            () => AnalyticsEvent.find().sort({ createdAt: -1 }).limit(100).lean()
        ));
        
        // Benchmark 2: Analytics aggregation
        benchmarks.push(await benchmarkQuery(
            'Analytics: Daily aggregation (last 30 days)',
            () => {
                const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                return AnalyticsEvent.aggregate([
                    { $match: { createdAt: { $gte: startDate } } },
                    {
                        $group: {
                            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                            count: { $sum: 1 },
                            revenue: { $sum: { $ifNull: ['$revenue', 0] } }
                        }
                    },
                    { $sort: { _id: 1 } }
                ]);
            }
        ));
        
        // Benchmark 3: Analytics by event type
        benchmarks.push(await benchmarkQuery(
            'Analytics: Group by event type',
            () => AnalyticsEvent.aggregate([
                {
                    $group: {
                        _id: '$eventType',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ])
        ));
        
        // Benchmark 4: Product search
        benchmarks.push(await benchmarkQuery(
            'Products: Paginated list (page 1, limit 20)',
            () => Product.find({ status: 'active' })
                .sort({ createdAt: -1 })
                .limit(20)
                .lean()
        ));
        
        // Benchmark 5: Product search with text
        benchmarks.push(await benchmarkQuery(
            'Products: Text search',
            () => Product.find({
                $text: { $search: 'product' },
                status: 'active'
            }).limit(20).lean()
        ));
        
        // Benchmark 6: Product category filter
        benchmarks.push(await benchmarkQuery(
            'Products: Filter by category',
            () => Product.find({
                category: 'Electronics',
                status: 'active'
            }).limit(20).lean()
        ));
        
        // Benchmark 7: Complex analytics query
        benchmarks.push(await benchmarkQuery(
            'Analytics: Complex aggregation (revenue by country)',
            () => {
                const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                return AnalyticsEvent.aggregate([
                    {
                        $match: {
                            eventType: 'purchase',
                            createdAt: { $gte: startDate }
                        }
                    },
                    {
                        $group: {
                            _id: '$geo.country',
                            totalRevenue: { $sum: '$revenue' },
                            orders: { $sum: 1 }
                        }
                    },
                    { $sort: { totalRevenue: -1 } },
                    { $limit: 10 }
                ]);
            }
        ));
        
        // Benchmark 8: Count query
        benchmarks.push(await benchmarkQuery(
            'Analytics: Count documents',
            () => AnalyticsEvent.countDocuments()
        ));
        
        // Summary
        console.log('\n==========================================');
        console.log('✅ Benchmark Complete');
        console.log('==========================================\n');
        
        console.log('📊 Summary (sorted by average duration):');
        benchmarks.sort((a, b) => a.avgDuration - b.avgDuration);
        benchmarks.forEach((b, i) => {
            console.log(`${i + 1}. ${b.name}`);
            console.log(`   ${b.avgDuration.toFixed(2)}ms avg | ${b.p95}ms p95`);
        });
        
        // Performance warnings
        console.log('\n⚠️  Performance Analysis:');
        const slowQueries = benchmarks.filter(b => b.avgDuration > 500);
        if (slowQueries.length > 0) {
            console.log(`   ${slowQueries.length} queries exceeded 500ms threshold:`);
            slowQueries.forEach(q => {
                console.log(`      - ${q.name}: ${q.avgDuration.toFixed(2)}ms`);
            });
        } else {
            console.log('   ✅ All queries performed well (< 500ms)');
        }
        
        // Index recommendations
        console.log('\n💡 Index Status:');
        const analyticsIndexes = await AnalyticsEvent.collection.getIndexes();
        const productIndexes = await Product.collection.getIndexes();
        console.log(`   Analytics Events: ${Object.keys(analyticsIndexes).length} indexes`);
        console.log(`   Products: ${Object.keys(productIndexes).length} indexes`);
        
        console.log('\n');
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

main();
