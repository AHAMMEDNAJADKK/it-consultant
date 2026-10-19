import mongoose from 'mongoose';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (err) {}

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;
  if (!uri) {
    console.error('Database Connection Error: Missing database connection URI in environment variables (MONGODB_URI)');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri.trim().replace(/^["']|["']$/g, ''), {
      dbName: process.env.MONGODB_DB_NAME || 'it_consultant_crm',
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000
    });
    console.log(`MongoDB Connected Safely: ${conn.connection.host} [db: ${conn.connection.name}]`);
    return conn;
  } catch (error) {
    const sanitized = (error.message || String(error)).replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.error(`Database Connection Error: ${sanitized}`);
    process.exit(1);
  }
};

export default connectDB;