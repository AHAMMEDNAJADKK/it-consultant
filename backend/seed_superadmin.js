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

const maskMongoUri = (uri) => {
  if (!uri) return '<none>';
  try {
    const parsed = new URL(uri);
    return `${parsed.protocol}//***:***@${parsed.host}${parsed.pathname}`;
  } catch (_) {
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  }
};

// Parse command line arguments (e.g. --password=secret --force-reset --db-name=crm --db-uri=...)
const parseArgs = () => {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--password=')) {
      args.password = arg.split('=')[1];
    } else if (arg.startsWith('--db-uri=')) {
      args.dbUri = arg.split('=')[1];
    } else if (arg.startsWith('--db-name=')) {
      args.dbName = arg.split('=')[1];
    } else if (arg === '--force-reset') {
      args.forceReset = true;
    }
  });
  return args;
};

async function provisionSuperAdmin() {
  const args = parseArgs();
  const rawPassword = process.env.INITIAL_SUPERADMIN_PASSWORD || args.password;
  const isForceReset = Boolean(args.forceReset || process.env.FORCE_RESET === 'true');

  if (!rawPassword || typeof rawPassword !== 'string' || !rawPassword.trim()) {
    console.error('\n❌ ERROR: Initial Super Admin password is required.');
    console.error('   Please provide it securely via environment variable or CLI argument:');
    console.error('   Usage: INITIAL_SUPERADMIN_PASSWORD="<secret>" node seed_superadmin.js [--force-reset]');
    console.error('   Or:    node seed_superadmin.js --password="<secret>" [--force-reset]\n');
    process.exit(1);
  }

  const cleanPassword = rawPassword.trim();
  if (cleanPassword.length < 8) {
    console.error('\n❌ ERROR: Super Admin password must be at least 8 characters long for security.\n');
    process.exit(1);
  }

  const mongoUri = args.dbUri || process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/student_attendance_db';
  const targetDbName = args.dbName || process.env.MONGODB_DB_NAME || 'crm';

  try {
    console.log(`🔌 Connecting to database: ${maskMongoUri(mongoUri)} [database: ${targetDbName}]...`);
    await mongoose.connect(mongoUri.trim().replace(/^["']|["']$/g, ''), {
      dbName: targetDbName,
      serverSelectionTimeoutMS: 10000
    });
    console.log('✅ Connected to MongoDB successfully.');

    const targetEmail = 'superadmin@gmail.com';
    let existingUser = await User.findOne({ email: targetEmail });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(cleanPassword, salt);

    if (existingUser) {
      if (!isForceReset) {
        console.log(`\nℹ️  ACCOUNT ALREADY EXISTS:`);
        console.log(`   Email:        ${existingUser.email}`);
        console.log(`   Name:         ${existingUser.name}`);
        console.log(`   Role:         ${existingUser.role} (role_id: ${existingUser.role_id})`);
        console.log(`   isSuperAdmin: ${existingUser.isSuperAdmin}`);
        console.log(`   Status:       ${existingUser.status} (active: ${existingUser.isActive})`);
        console.log('\n🔒 To safely update the password and permissions for this existing account, rerun with --force-reset:');
        console.log('   INITIAL_SUPERADMIN_PASSWORD="<secret>" node seed_superadmin.js --force-reset\n');
        await mongoose.connection.close();
        process.exit(0);
      }

      // Explicitly authorized update
      existingUser.name = existingUser.name || 'Super Admin';
      existingUser.role = 'superadmin';
      existingUser.role_id = '0';
      existingUser.isSuperAdmin = true;
      existingUser.status = 'active';
      existingUser.isActive = true;
      existingUser.password = hashedPassword;
      existingUser.passwordHash = hashedPassword;

      await existingUser.save();
      console.log(`\n✅ Successfully updated existing Super Admin account [${targetEmail}]:`);
      console.log('   - Role set to: superadmin (role_id: 0)');
      console.log('   - Full Super Admin privileges verified');
      console.log('   - Password hash securely updated using bcrypt\n');
    } else {
      // Create new Super Admin account
      const newSuperAdmin = new User({
        name: 'Super Admin',
        email: targetEmail,
        phone: '9999999999',
        role: 'superadmin',
        role_id: '0',
        isSuperAdmin: true,
        status: 'active',
        isActive: true,
        password: hashedPassword,
        passwordHash: hashedPassword,
        joining_date: new Date()
      });

      await newSuperAdmin.save();
      console.log(`\n✨ Successfully provisioned new Super Admin account:`);
      console.log(`   - Email: ${targetEmail}`);
      console.log('   - Role: superadmin (role_id: 0)');
      console.log('   - isSuperAdmin: true');
      console.log('   - Status: active');
      console.log('   - Password securely stored as bcrypt hash\n');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Provisioning Error:', err.message);
    try { await mongoose.connection.close(); } catch (_) {}
    process.exit(1);
  }
}

provisionSuperAdmin();
