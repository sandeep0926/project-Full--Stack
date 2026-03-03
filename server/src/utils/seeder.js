const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Product = require('../models/Product');
const AnalyticsEvent = require('../models/AnalyticsEvent');

const connectDB = require('../config/database');

const seedData = async () => {
    await connectDB();
    console.log('🌱 Seeding database...');

    // Clear existing data
    await Promise.all([User.deleteMany(), Tenant.deleteMany(), Product.deleteMany(), AnalyticsEvent.deleteMany()]);

    // Create super admin
    const superAdmin = await User.create({ name: 'Super Admin', email: 'admin@enterprise.com', password: 'Admin@123456', role: 'superadmin', isEmailVerified: true });

    // Create tenant
    const tenant = await Tenant.create({
        name: 'Acme Corp', slug: 'acme-corp', owner: superAdmin._id,
        members: [{ user: superAdmin._id, role: 'owner' }],
        subscription: { plan: 'enterprise', status: 'active' },
        settings: { features: ['basic_access', 'team_collaboration', 'unlimited_projects', 'analytics_advanced', 'api_access', 'audit_logs'], maxUsers: -1, maxProjects: -1 },
    });

    superAdmin.tenantId = tenant._id;
    await superAdmin.save();

    // Create users
    const users = await User.insertMany([
        { name: 'John Admin', email: 'john@acme.com', password: await bcrypt.hash('User@123456', 12), role: 'admin', tenantId: tenant._id, isEmailVerified: true },
        { name: 'Jane User', email: 'jane@acme.com', password: await bcrypt.hash('User@123456', 12), role: 'user', tenantId: tenant._id, isEmailVerified: true },
        { name: 'Bob User', email: 'bob@acme.com', password: await bcrypt.hash('User@123456', 12), role: 'user', tenantId: tenant._id, isEmailVerified: true },
    ]);

    // Add users as tenant members
    tenant.members.push(...users.map(u => ({ user: u._id, role: u.role === 'admin' ? 'admin' : 'member' })));
    await tenant.save();

    // Create products
    const categories = ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'];
    const products = [];
    for (let i = 1; i <= 50; i++) {
        products.push({
            name: `Product ${i}`, slug: `product-${i}`, sku: `SKU-${String(i).padStart(5, '0')}`,
            description: `High-quality product ${i} with premium features.`,
            price: Math.round(Math.random() * 500 * 100) / 100 + 10,
            compareAtPrice: Math.round(Math.random() * 600 * 100) / 100 + 50,
            category: categories[i % categories.length],
            brand: ['TechPro', 'StyleMax', 'BookWorm', 'HomeStyle', 'SportFit'][i % 5],
            inventory: { quantity: Math.floor(Math.random() * 500) + 10, lowStockThreshold: 10, trackInventory: true },
            status: 'active', isPublished: true, publishedAt: new Date(),
            ratings: { average: Math.round((Math.random() * 2 + 3) * 10) / 10, count: Math.floor(Math.random() * 200) },
            tenantId: tenant._id, createdBy: superAdmin._id,
            images: [{ url: `https://picsum.photos/seed/${i}/400/400`, alt: `Product ${i}`, isPrimary: true }],
        });
    }
    await Product.insertMany(products);

    // Generate analytics events (simulate 1M+ records concept with 10K for demo)
    const eventTypes = ['page_view', 'user_login', 'product_view', 'add_to_cart', 'purchase', 'search'];
    const devices = ['desktop', 'mobile', 'tablet'];
    const countries = ['US', 'UK', 'IN', 'DE', 'FR', 'JP', 'BR', 'AU'];
    const pages = ['/home', '/products', '/cart', '/checkout', '/profile', '/docs', '/analytics'];
    const analyticsEvents = [];

    for (let i = 0; i < 10000; i++) {
        const daysAgo = Math.floor(Math.random() * 90);
        analyticsEvents.push({
            eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
            userId: [superAdmin._id, ...users.map(u => u._id)][Math.floor(Math.random() * 4)],
            tenantId: tenant._id,
            page: pages[Math.floor(Math.random() * pages.length)],
            device: { type: devices[Math.floor(Math.random() * devices.length)] },
            geo: { country: countries[Math.floor(Math.random() * countries.length)] },
            revenue: Math.random() > 0.8 ? Math.round(Math.random() * 200 * 100) / 100 : 0,
            createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - Math.random() * 86400000),
        });
    }

    // Batch insert
    const batchSize = 1000;
    for (let i = 0; i < analyticsEvents.length; i += batchSize) {
        await AnalyticsEvent.insertMany(analyticsEvents.slice(i, i + batchSize));
        console.log(`  Inserted ${Math.min(i + batchSize, analyticsEvents.length)} analytics events`);
    }

    console.log('✅ Seed completed!');
    console.log('  Super Admin: admin@enterprise.com / Admin@123456');
    console.log('  Admin: john@acme.com / User@123456');
    console.log('  Users: jane@acme.com, bob@acme.com / User@123456');
    console.log(`  Products: 50 | Analytics Events: ${analyticsEvents.length}`);
    process.exit(0);
};

seedData().catch(err => { console.error('Seed failed:', err); process.exit(1); });
