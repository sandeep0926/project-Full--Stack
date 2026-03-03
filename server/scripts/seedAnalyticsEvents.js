import 'dotenv/config';
import mongoose from 'mongoose';
import AnalyticsEvent from '../src/models/AnalyticsEvent.js';
import connectDB from '../src/config/database.js';

const EVENT_TYPES = [
    'page_view',
    'user_signup',
    'user_login',
    'purchase',
    'add_to_cart',
    'remove_from_cart',
    'checkout_start',
    'search',
    'product_view',
];

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

const generateEvent = () => {
    const eventType = randomItem(EVENT_TYPES);
    return {
        eventType,
        page: ['/home', '/products', '/checkout', '/dashboard'][Math.floor(Math.random() * 4)],
        revenue: eventType === 'purchase' ? Math.round(Math.random() * 20000) / 100 : 0,
        device: {
            type: randomItem(['desktop', 'mobile', 'tablet']),
        },
        geo: {
            country: randomItem(['US', 'IN', 'DE', 'UK', 'CA']),
        },
        createdAt: new Date(
            Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)
        ),
    };
};

const main = async () => {
    const total = parseInt(process.env.ANALYTICS_SEED_COUNT || '1000000', 10);
    const batchSize = 5000;

    await connectDB();

    for (let inserted = 0; inserted < total; inserted += batchSize) {
        const batch = [];
        for (let i = 0; i < batchSize && inserted + i < total; i += 1) {
            batch.push(generateEvent());
        }
        // eslint-disable-next-line no-await-in-loop
        await AnalyticsEvent.insertMany(batch, { ordered: false });
        // eslint-disable-next-line no-console
        console.log(`Inserted ${Math.min(inserted + batch.length, total)} / ${total} events`);
    }

    await mongoose.disconnect();
    // eslint-disable-next-line no-console
    console.log('Seeding completed');
};

main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
});

