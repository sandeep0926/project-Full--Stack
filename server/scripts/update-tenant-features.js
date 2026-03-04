import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Tenant from '../src/models/Tenant.js';

dotenv.config({ path: '.env' });

async function updateTenantFeatures() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const tenantId = '69a7d0c2391d0e2e4a23c5ea'; // Your tenant ID
    
    console.log(`📝 Updating tenant features...`);
    
    const tenant = await Tenant.findByIdAndUpdate(
      tenantId,
      {
        $set: {
          'settings.features': [
            'analytics_basic',
            'analytics_advanced',
            'real_time_analytics',
            'unlimited_users',
            'priority_support',
            'custom_branding',
            'api_access',
            'webhooks',
            'advanced_reporting',
            'data_export'
          ]
        }
      },
      { new: true }
    );

    if (!tenant) {
      console.log('❌ Tenant not found');
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log('✅ Tenant features updated successfully!');
    console.log(`   Tenant: ${tenant.name}`);
    console.log(`   Features: ${tenant.settings.features.join(', ')}`);

    console.log('\n🎉 Analytics features are now enabled!');
    console.log('🔄 Please refresh your browser to see the analytics data.');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating tenant:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

updateTenantFeatures();
