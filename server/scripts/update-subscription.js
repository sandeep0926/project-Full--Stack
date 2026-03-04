import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../src/models/User.js';

dotenv.config({ path: '.env' });

async function updateSubscription() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const email = 'admin@enterprise.com';
    
    console.log(`📝 Updating subscription for ${email}...`);
    
    const user = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          'subscription.plan': 'enterprise',
          'subscription.status': 'active',
          'subscription.features': [
            'analytics_basic',
            'analytics_advanced',
            'real_time_analytics',
            'unlimited_users',
            'priority_support',
            'custom_branding',
            'api_access',
            'webhooks'
          ]
        }
      },
      { new: true }
    );

    if (!user) {
      console.log('❌ User not found');
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log('✅ Subscription updated successfully!');
    console.log(`   Plan: ${user.subscription.plan}`);
    console.log(`   Status: ${user.subscription.status}`);
    console.log(`   Features: ${user.subscription.features.join(', ')}`);

    console.log('\n🎉 You now have access to all analytics features!');
    console.log('🔄 Please refresh your browser to see the changes.');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating subscription:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

updateSubscription();
