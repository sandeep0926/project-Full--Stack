/**
 * Run after server is up: node scripts/test-stripe-payment.js
 * Requires: npm run seed (for john@acme.com + products), then restart server (npm run dev)
 */
import 'dotenv/config';

const BASE = process.env.API_BASE || 'http://localhost:3000/api/v1';

async function run() {
    console.log('1. Login (john@acme.com)...');
    const loginRes = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'john@acme.com', password: 'User@123456' }),
    });
    const loginData = await loginRes.json();
    const token = loginData.data?.accessToken || loginData.data?.tokens?.accessToken;
    if (!token) {
        console.error('Login failed. Run npm run seed and ensure server is on port 3000.');
        process.exit(1);
    }
    console.log('   OK');

    console.log('2. Get first product...');
    const prodsRes = await fetch(`${BASE}/products?limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const prodsData = await prodsRes.json();
    const productId = prodsData.data?.products?.[0]?._id;
    if (!productId) {
        console.error('No products. Run npm run seed.');
        process.exit(1);
    }
    console.log('   Product ID:', productId);

    console.log('3. Create order...');
    const orderRes = await fetch(`${BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
            items: [{ product: productId, quantity: 1 }],
            shippingAddress: { firstName: 'T', lastName: 'U', address1: '123 Main', city: 'NYC', postalCode: '10001', country: 'US' },
        }),
    });
    const orderData = await orderRes.json();
    const orderId = orderData.data?.order?._id;
    if (!orderId) {
        console.error('Order failed:', orderData.error?.message || orderData);
        process.exit(1);
    }
    console.log('   Order ID:', orderId);

    console.log('4. Create Stripe payment intent...');
    const payRes = await fetch(`${BASE}/payments/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId }),
    });
    const payData = await payRes.json();
    if (payData.data?.clientSecret) {
        console.log('   clientSecret received (length:', payData.data.clientSecret.length, ')');
        console.log('\n========== SUCCESS: Stripe payment flow is working. ==========');
        process.exit(0);
    }
    console.error('Payment intent failed:', payData.error?.message || payData);
    process.exit(1);
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
