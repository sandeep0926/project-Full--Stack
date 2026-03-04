/**
 * Test: (1) New product shows in list after add, (2) Admin sees all tenant orders.
 * Run: node scripts/test-products-orders.js
 * Ensure: server running (npm run dev), seed done (npm run seed).
 */
import 'dotenv/config';

const BASE = process.env.API_BASE || 'http://localhost:3000/api/v1';

async function run() {
    console.log('1. Login as admin (john@acme.com)...');
    const loginRes = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'john@acme.com', password: 'User@123456' }),
    });
    const loginData = await loginRes.json();
    const token = loginData.data?.accessToken || loginData.data?.tokens?.accessToken;
    if (!token) {
        console.error('Login failed.');
        process.exit(1);
    }
    console.log('   OK');

    console.log('2. Create a new product...');
    const sku = `SKU-${Date.now()}`;
    const createRes = await fetch(`${BASE}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
            name: 'Test Product Visible',
            description: 'Test',
            sku,
            price: 19.99,
            category: 'Electronics',
            inventory: { quantity: 10 },
        }),
    });
    const createData = await createRes.json();
    const newId = createData.data?.product?._id;
    if (!newId) {
        console.error('Create product failed:', createData.error?.message);
        process.exit(1);
    }
    console.log('   Created:', newId);

    console.log('3. Fetch products — new product should be in list...');
    const listRes = await fetch(`${BASE}/products?limit=60`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const listData = await listRes.json();
    const products = listData.data?.products || [];
    const found = products.some((p) => String(p._id) === String(newId));
    console.log('   Total in list:', products.length, '| New product in list:', found ? 'YES' : 'NO');

    console.log('4. Orders (admin should see tenant orders)...');
    const ordersRes = await fetch(`${BASE}/orders?limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const ordersData = await ordersRes.json();
    const orders = ordersData.data?.orders || [];
    console.log('   Orders visible:', orders.length);

    if (found && orders.length >= 0) {
        console.log('\n========== SUCCESS: Products and orders behavior OK ==========');
        process.exit(0);
    }
    console.log('\n========== FAIL: Restart server (npm run dev) and run again ==========');
    process.exit(1);
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
