import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import dns from 'dns';
import User from './src/models/user.model.js';

dns.setDefaultResultOrder('ipv4first');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (_) {}

dotenv.config();

async function run() {
  try {
    const mongoUri = process.env.DATABASE_URL || process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('No database URI defined in environment');
    }
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB Atlas!');

    // 1. Promote all existing Admin / HR users to Super Admin
    const updateResult = await User.updateMany(
      {
        $or: [
          { role: 'admin' },
          { role: 'hr' },
          { role_id: '1' },
          { role_id: '2' }
        ]
      },
      {
        $set: {
          isSuperAdmin: true,
          role: 'superadmin',
          role_id: '0'
        }
      }
    );
    console.log(`Promoted ${updateResult.modifiedCount} Admin/HR users to Super Admin.`);

    // 2. Also ensure a dedicated Super Admin user account exists: superadmin@gmail.com
    let superAdmin = await User.findOne({ email: 'superadmin@gmail.com' });
    if (!superAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('superadmin@111', salt);
      superAdmin = new User({
        name: 'Super Admin',
        email: 'superadmin@gmail.com',
        phone: '9999999999',
        role: 'superadmin',
        role_id: '0',
        isSuperAdmin: true,
        password: hashedPassword,
        passwordHash: hashedPassword,
        status: 'active',
        isActive: true
      });
      await superAdmin.save();
      console.log('✨ Created NEW dedicated Super Admin account: superadmin@gmail.com / superadmin@111');
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('superadmin@111', salt);
      superAdmin.isSuperAdmin = true;
      superAdmin.role = 'superadmin';
      superAdmin.role_id = '0';
      superAdmin.password = hashedPassword;
      superAdmin.passwordHash = hashedPassword;
      superAdmin.status = 'active';
      superAdmin.isActive = true;
      await superAdmin.save();
      console.log('✨ Reset Super Admin account credentials: superadmin@gmail.com / superadmin@111');
    }

    console.log('\n======================================================');
    console.log('✅ ALL ADMIN ACCOUNTS ARE NOW SUPER ADMINS!');
    console.log('🔑 DEDICATED SUPER ADMIN CREDENTIALS:');
    console.log('   Email:    superadmin@gmail.com');
    console.log('   Password: superadmin@111');
    console.log('======================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Error seeding Super Admin:', err);
    process.exit(1);
  }
}

run();
