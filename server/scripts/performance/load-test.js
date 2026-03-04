import http from 'http';
import https from 'https';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CONCURRENT_REQUESTS = parseInt(process.env.CONCURRENT || '100');
const DURATION_SECONDS = parseInt(process.env.DURATION || '60');
const TEST_TOKEN = process.env.TEST_TOKEN || '';

/**
 * Make HTTP request
 */
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;
        
        const req = client.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data,
                    duration: Date.now() - startTime
                });
            });
        });
        
        const startTime = Date.now();
        req.on('error', reject);
        req.on('timeout', () => reject(new Error('Request timeout')));
        req.setTimeout(10000);
        
        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

/**
 * Test endpoint performance
 */
async function testEndpoint(name, url, options = {}) {
    const results = {
        name,
        requests: 0,
        success: 0,
        errors: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        durations: []
    };
    
    const startTime = Date.now();
    const endTime = startTime + (DURATION_SECONDS * 1000);
    
    console.log(`\n🧪 Testing: ${name}`);
    console.log(`   URL: ${url}`);
    console.log(`   Concurrent: ${CONCURRENT_REQUESTS}`);
    console.log(`   Duration: ${DURATION_SECONDS}s\n`);
    
    while (Date.now() < endTime) {
        const promises = [];
        
        for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
            promises.push(
                makeRequest(url, options)
                    .then(res => {
                        results.requests++;
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            results.success++;
                        } else {
                            results.errors++;
                        }
                        results.totalDuration += res.duration;
                        results.minDuration = Math.min(results.minDuration, res.duration);
                        results.maxDuration = Math.max(results.maxDuration, res.duration);
                        results.durations.push(res.duration);
                    })
                    .catch(() => {
                        results.requests++;
                        results.errors++;
                    })
            );
        }
        
        await Promise.all(promises);
        
        // Progress update
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rps = (results.requests / elapsed).toFixed(1);
        process.stdout.write(`\r  Progress: ${elapsed}s | Requests: ${results.requests} | RPS: ${rps} | Errors: ${results.errors}`);
    }
    
    console.log('\n');
    return results;
}

/**
 * Calculate percentiles
 */
function calculatePercentile(durations, percentile) {
    const sorted = durations.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
}

/**
 * Print results
 */
function printResults(results) {
    const avgDuration = results.totalDuration / results.requests;
    const successRate = (results.success / results.requests * 100).toFixed(2);
    const rps = (results.requests / DURATION_SECONDS).toFixed(2);
    
    const p50 = calculatePercentile(results.durations, 50);
    const p95 = calculatePercentile(results.durations, 95);
    const p99 = calculatePercentile(results.durations, 99);
    
    console.log('📊 Results:');
    console.log(`   Total Requests: ${results.requests}`);
    console.log(`   Successful: ${results.success} (${successRate}%)`);
    console.log(`   Errors: ${results.errors}`);
    console.log(`   Throughput: ${rps} req/sec`);
    console.log(`\n⏱️  Latency:`);
    console.log(`   Average: ${avgDuration.toFixed(2)}ms`);
    console.log(`   Min: ${results.minDuration}ms`);
    console.log(`   Max: ${results.maxDuration}ms`);
    console.log(`   P50: ${p50}ms`);
    console.log(`   P95: ${p95}ms`);
    console.log(`   P99: ${p99}ms`);
}

/**
 * Main load test
 */
async function main() {
    console.log('🚀 Starting Load Test');
    console.log('====================\n');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Concurrent Requests: ${CONCURRENT_REQUESTS}`);
    console.log(`Duration: ${DURATION_SECONDS}s`);
    
    const tests = [
        {
            name: 'GET /health',
            url: `${BASE_URL}/health`,
            options: { method: 'GET' }
        },
        {
            name: 'GET /api/v1/products (paginated)',
            url: `${BASE_URL}/api/v1/products?page=1&limit=20`,
            options: { method: 'GET' }
        }
    ];
    
    // Add authenticated tests if token provided
    if (TEST_TOKEN) {
        tests.push({
            name: 'GET /api/v1/analytics/dashboard',
            url: `${BASE_URL}/api/v1/analytics/dashboard?period=7d`,
            options: {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
            }
        });
        
        tests.push({
            name: 'POST /api/v1/analytics/events',
            url: `${BASE_URL}/api/v1/analytics/events`,
            options: {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${TEST_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    eventType: 'page_view',
                    page: '/test',
                    metadata: { source: 'load-test' }
                })
            }
        });
    }
    
    const allResults = [];
    
    for (const test of tests) {
        const results = await testEndpoint(test.name, test.url, test.options);
        printResults(results);
        allResults.push(results);
        
        // Wait between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Summary
    console.log('\n====================');
    console.log('✅ Load Test Complete');
    console.log('====================\n');
    
    console.log('📊 Summary:');
    allResults.forEach(result => {
        const rps = (result.requests / DURATION_SECONDS).toFixed(1);
        const avgLatency = (result.totalDuration / result.requests).toFixed(1);
        const successRate = (result.success / result.requests * 100).toFixed(1);
        console.log(`   ${result.name}:`);
        console.log(`      ${rps} req/s | ${avgLatency}ms avg | ${successRate}% success`);
    });
    
    console.log('\n');
}

main().catch(console.error);
