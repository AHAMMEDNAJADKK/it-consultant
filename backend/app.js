import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

// Ensure IPv4 lookup precedence
dns.setDefaultResultOrder('ipv4first');
if (process.env.CUSTOM_DNS_SERVERS) {
  try {
    dns.setServers(process.env.CUSTOM_DNS_SERVERS.split(',').map(s => s.trim()).filter(Boolean));
  } catch (err) {
    // Fallback to system default DNS if custom DNS setting fails
  }
}

// Route Imports
import authRoutes from './src/routes/auth.routes.js';
import userRoutes from './src/routes/user.routes.js';
import attendanceRoutes from './src/routes/attendance.routes.js';
import taskRoutes from './src/routes/task.routes.js';
import studentRoutes from './src/routes/student.routes.js';
import crmRoutes from './src/routes/index.js';
import apiRoutes from './src/routes/api.js';
import aiRoutes from './src/routes/ai.routes.js';
import mdDashboardRoutes from './src/routes/mdDashboard.routes.js';
import accountRoutes from './src/routes/account.routes.js';
import academyRoutes from './src/routes/academy.routes.js';
import notificationRoutes from './src/routes/notification.routes.js';
import leaveRoutes from './src/routes/leave.routes.js';
import recruitmentRoutes from './src/routes/recruitment.routes.js';
import dashboardRoutes from './src/routes/dashboard.routes.js';
import sprintRoutes from './src/routes/sprint.routes.js';
import gitRoutes from './src/routes/git.routes.js';
import supportTicketRoutes from './src/routes/supportTicket.routes.js';
import slaContractRoutes from './src/routes/slaContract.routes.js';
import { servePublicPdf } from './src/controllers/account.controller.js';
import Designation from './src/models/designation.model.js';
import Department from './src/modules/departments/department.model.js';
const app = express();

const cloudinaryEnvWarnings = [];
if (!process.env.CLOUDINARY_CLOUD_NAME) cloudinaryEnvWarnings.push('CLOUDINARY_CLOUD_NAME');
if (!process.env.CLOUDINARY_API_KEY) cloudinaryEnvWarnings.push('CLOUDINARY_API_KEY');
if (!process.env.CLOUDINARY_API_SECRET) cloudinaryEnvWarnings.push('CLOUDINARY_API_SECRET');

if (cloudinaryEnvWarnings.length > 0) {
  console.warn(`Cloudinary configuration is incomplete: missing ${cloudinaryEnvWarnings.join(', ')}`);
} else {
  console.info('Cloudinary configuration loaded successfully.');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. CORS Configuration
const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000'
];

const envOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, server-to-server, Render health checks)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    // Automatically allow Vercel production and preview deployment URLs
    if (/^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }

    // Automatically allow Render internal/app domains
    if (/^https:\/\/[a-zA-Z0-9_-]+\.onrender\.com$/.test(origin)) {
      return callback(null, true);
    }

    const corsError = new Error(`CORS blocked for unauthorized origin: ${origin}`);
    corsError.status = 403;
    return callback(corsError, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

app.options('*', cors());

// 2. Security Headers & Performance Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());

// 3. Parsers Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 3. Public PDF Download Route (Unauthenticated for WhatsApp Link Customers & Rich Cards)
app.get('/api/v1/public/pdf/:token/raw', servePublicPdf);
app.get('/api/v1/public/pdf/:token', servePublicPdf);
app.get('/api/public/pdf/:token/raw', servePublicPdf);
app.get('/api/public/pdf/:token', servePublicPdf);
app.get('/public/pdf/:token/raw', servePublicPdf);
app.get('/public/pdf/:token', servePublicPdf);

// Database state helper & diagnostic tracking
let lastDbError = null;
let lastDbAttempt = null;

const getDatabaseState = () => {
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return dbStates[mongoose.connection.readyState] || 'unknown';
};

// 1. Process Readiness Check (Accurately reflects database dependency readiness — returns 200 when ready, 503 when degraded)
app.get('/health', (req, res) => {
  const isDbReady = mongoose.connection.readyState === 1;
  return res.status(isDbReady ? 200 : 503).json({
    status: isDbReady ? 'healthy' : 'degraded',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'IT Consultant API',
    database: {
      status: getDatabaseState(),
      readyState: mongoose.connection.readyState,
      lastError: isDbReady ? null : lastDbError,
      lastAttempt: lastDbAttempt
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// 2. Database Readiness Check (Reports database readiness — returns 200 when ready, 503 when degraded)
app.get('/api/health', (req, res) => {
  const isDbReady = mongoose.connection.readyState === 1;
  return res.status(isDbReady ? 200 : 503).json({
    status: isDbReady ? 'healthy' : 'degraded',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'IT Consultant API',
    database: {
      status: getDatabaseState(),
      readyState: mongoose.connection.readyState,
      lastError: isDbReady ? null : lastDbError,
      lastAttempt: lastDbAttempt
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// Database readiness guard: do not accept normal API traffic if database is required but unavailable
app.use(['/api', '/v1', '/auth'], (req, res, next) => {
  if (req.path === '/health' || req.path === '/health/' || req.path === '/' || req.path.startsWith('/public/')) {
    return next();
  }
  if (mongoose.connection.readyState !== 1) {
    // If disconnected, trigger a connection attempt in the background
    if (mongoose.connection.readyState === 0 && typeof connectToDatabase === 'function') {
      connectToDatabase().catch(() => {});
    }
    return res.status(503).json({
      success: false,
      message: 'Database service is currently unavailable. Please try again shortly.',
      code: 'DATABASE_UNAVAILABLE',
      reason: lastDbError || 'Database connection pending or disconnected'
    });
  }
  next();
});

// 4. Specific/Dedicated API Routers
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes); 
app.use('/api/v1/attendance', attendanceRoutes); 
app.use('/api/user', userRoutes); 
app.use('/api/v1/user', userRoutes); 
app.use('/api/users', userRoutes); 
app.use('/api/v1/users', userRoutes); 
app.use('/users', userRoutes); 
app.use('/v1/users', userRoutes); 
app.use('/api/tasks', taskRoutes);
app.use('/api/v1/tasks', taskRoutes);
// app.use('/api/v1/leaves', leaveRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/md-dashboard', mdDashboardRoutes);
app.use('/api/md-dashboard', mdDashboardRoutes);
app.use('/api/v1/accounts', accountRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/v1/academy', academyRoutes);
app.use('/api/academy', academyRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/v1/notifications', notificationRoutes);
app.use('/notifications', notificationRoutes);
app.use('/api/v1/recruitment', recruitmentRoutes);
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/v1/sprints', sprintRoutes);
app.use('/api/sprints', sprintRoutes);
app.use('/api/v1/git', gitRoutes);
app.use('/api/git', gitRoutes);
app.use('/api/v1/bugs', supportTicketRoutes);
app.use('/api/bugs', supportTicketRoutes);
app.use('/api/v1/support-tickets', supportTicketRoutes);
app.use('/api/support-tickets', supportTicketRoutes);
app.use('/api/v1/sla-contracts', slaContractRoutes);
app.use('/api/sla-contracts', slaContractRoutes);

// 4. Broad, Versioned, & Catch-all Fallbacks (Broadest matching paths go lower)
app.use('/api/v1', studentRoutes);
app.use('/api/v1', crmRoutes);
app.use('/api', studentRoutes); 
app.use('/api', crmRoutes);
app.use('/v1', studentRoutes);
app.use('/v1', crmRoutes);
app.use('/api', apiRoutes);      // Legacy base fallback route handler

// Welcome / Root Health Check Route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: "IT Consultant CRM Backend Server is running successfully."
  });
});

// 5. Global 404 Route Catch-All
// Prevents missing endpoints from crashing headers or responding with standard Express HTML
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route Not Found: ${req.method} ${req.originalUrl}`
  });
});

import logger from './src/utils/logger.util.js';

// 6. Global 500 Error Catch-All
// Intercepts unhandled synchronous crashes, preserving correct headers and standard JSON feedback
app.use((err, req, res, next) => {
  console.error('🚨 Global Server Exception Error:', err.message);
  if (logger && typeof logger.error === 'function') {
    logger.error('Global Server Exception Error', { errorStack: err.stack, message: err.message });
  }

  // Handle Multer file size errors specifically
  if (err.code === 'LIMIT_FILE_SIZE' || (err.name === 'MulterError' && err.message === 'File too large')) {
    return res.status(413).json({
      success: false,
      message: `File too large. Maximum allowed size is 50MB. Please reduce the file size and try again.`
    });
  }

  const statusCode = (typeof err.statusCode === 'number' && err.statusCode >= 100 && err.statusCode < 600)
    ? err.statusCode
    : ((typeof err.status === 'number' && err.status >= 100 && err.status < 600) ? err.status : 500);

  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error Fallback',
    message: err.message || 'Internal Server Error Fallback'
  });
});

// 7. Database Connection Section (Secure MongoDB Atlas Configuration with Auto-Retry)
let reconnectTimer = null;
let isConnecting = false;

const maskMongoUri = (uri) => {
  if (!uri) return '<none>';
  try {
    const parsed = new URL(uri);
    return `${parsed.protocol}//***:***@${parsed.host}${parsed.pathname}`;
  } catch (_) {
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  }
};

export const connectToDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  if (mongoose.connection.readyState === 2 || isConnecting) {
    return new Promise((resolve) => {
      const finish = () => {
        cleanup();
        resolve();
      };
      const cleanup = () => {
        mongoose.connection.removeListener('connected', finish);
        mongoose.connection.removeListener('error', finish);
        clearTimeout(timer);
      };
      const timer = setTimeout(finish, 11000);
      mongoose.connection.once('connected', finish);
      mongoose.connection.once('error', finish);
    });
  }

  const rawUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;
  const fallbackClusterUri = (process.env.MONGODB_FALLBACK_URI || '').trim().replace(/^["']|["']$/g, '');

  if (!rawUri || !rawUri.trim()) {
    lastDbError = 'Missing database connection URI in environment variables (MONGODB_URI)';
    console.error('❌ CRITICAL CONFIGURATION ERROR: No MongoDB Atlas connection URI provided.');
    console.error('   Please define MONGODB_URI (or MONGO_URI / DATABASE_URL) in your environment variables.');
    return;
  }

  const cleanUri = rawUri.trim().replace(/^["']|["']$/g, '');
  isConnecting = true;
  lastDbAttempt = new Date().toISOString();

  const connectWithSeed = async (targetUri) => {
    console.log(`🔌 Connecting to MongoDB Atlas: ${maskMongoUri(targetUri)}`);

    await mongoose.connect(targetUri, {
      dbName: process.env.MONGODB_DB_NAME || 'it_consultant_crm',
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10
    });

    const host = mongoose.connection.host || 'MongoDB Atlas';
    const dbName = mongoose.connection.name || 'it_consultant_crm';
    console.log(` ✅ Successfully connected to MongoDB Atlas [database: ${dbName}, host: ${host}].`);
    lastDbError = null;

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    try {
      const count = await Designation.countDocuments();
      if (count === 0) {
        const defaultDesignations = [
          "HR Manager",
          "Graphic Designer",
          "Digital Marketer",
          "React Developer",
          "Node Developer",
          "Flutter Developer",
          "Fullstack",
          "Admin",
          "Manager"
        ];
        await Designation.insertMany(defaultDesignations.map(name => ({ name, isActive: true })));
        console.log(' 🌱 Successfully seeded default designations.');
      }
    } catch (seedErr) {
      console.error(' ❌ Failed to seed default designations:', seedErr.message);
    }

    try {
      const deptCount = await Department.countDocuments();
      if (deptCount === 0) {
        const defaultDepartments = [
          { name: "HR & Admin", code: "HR" },
          { name: "Marketing", code: "MKT" },
          { name: "Development", code: "DEV" },
          { name: "Designing", code: "DSN" }
        ];
        await Department.insertMany(defaultDepartments.map(d => ({ 
          name: d.name, 
          code: d.code, 
          status: true 
        })));
        console.log(' 🌱 Successfully seeded default departments.');
      }
    } catch (seedErr) {
      console.error(' ❌ Failed to seed default departments:', seedErr.message);
    }
  };

  try {
    await connectWithSeed(cleanUri);
  } catch (error) {
    const rawErrorMsg = error.message || String(error);
    const sanitizedErrorMsg = rawErrorMsg.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');

    console.warn(' ⚠️ Primary database connection attempt failed:', sanitizedErrorMsg);

    // If primary failed due to authentication failure or unreachable host, try fallback cluster if configured
    if (fallbackClusterUri && fallbackClusterUri !== cleanUri) {
      console.warn(` 🔄 Attempting fallback connection to active CRM cluster: ${maskMongoUri(fallbackClusterUri)}`);
      try {
        await connectWithSeed(fallbackClusterUri);
        return;
      } catch (fallbackError) {
        const sanitizedFallback = (fallbackError.message || String(fallbackError)).replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
        console.error(' ❌ Fallback database connection error:', sanitizedFallback);
        lastDbError = sanitizedFallback;
      }
    } else {
      lastDbError = sanitizedErrorMsg;
    }

    console.error(' ❌ CRITICAL DATABASE CONNECTION ERROR:', lastDbError);
    console.error('    API endpoints requiring database operations will respond with 503 Service Unavailable.');

    // Auto-retry connection after 10 seconds if not already scheduled
    if (!reconnectTimer && mongoose.connection.readyState !== 1) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connectToDatabase().catch(() => {});
      }, 10000);
    }
  } finally {
    isConnecting = false;
  }
};

// Initial connection attempt on startup
connectToDatabase().catch(() => {});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB Atlas connection lost. Service is degraded. Scheduling auto-reconnect...');
  if (!reconnectTimer && mongoose.connection.readyState !== 1) {
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connectToDatabase().catch(() => {});
    }, 5000);
  }
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB Atlas reconnected successfully.');
});

export default app;
