import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { sequelize } from './models';
import { User } from './models';

// Import routes
import authRoutes from './routes/authRoutes';
import taskRoutes from './routes/taskRoutes';
import messageRoutes from './routes/messageRoutes';
import summaryRoutes from './routes/summaryRoutes';
import qaRoutes from './routes/qaRoutes';
import attachmentsRoutes from './routes/attachments';

// Import WebSocket handlers
import setupWebSocketHandlers from './socket';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Set up Socket.io
const io = new SocketServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Rate limiting middleware for API requests
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Rate limiting middleware for file uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP to 20 file uploads per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many file uploads from this IP, please try again after an hour'
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  // Log request details
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // Log request body if it exists and isn't a file upload
  if (req.body && Object.keys(req.body).length > 0 && !req.is('multipart/form-data')) {
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
  }
  
  // Log request headers (optional, can be verbose)
  // console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
  
  // Once response is finished, log the response status and timing
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' } // Allow images to be served cross-origin
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting to all routes
app.use('/api/', apiLimiter);

// Apply upload rate limiting to routes that handle file uploads
app.use('/api/messages', uploadLimiter);
app.use('/api/attachments', uploadLimiter);

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Set up routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/summaries', summaryRoutes);
app.use('/api/qa', qaRoutes);
app.use('/api/attachments', attachmentsRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Debug route to check user count
app.get('/debug/users', async (req, res) => {
  try {
    const userCount = await User.count();
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json({ 
      count: userCount, 
      users: users,
      message: `Found ${userCount} users in database`
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Set up WebSocket handlers
setupWebSocketHandlers(io);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Sync database models safely - only create tables if they don't exist
    // try {
    //   // Use sync without force to avoid deleting existing data
    //   await sequelize.sync({ alter: false });
    //   console.log('Database models synchronized successfully (safe mode).');
      
    //   // Log current user count to help track deletions
    //   const userCount = await User.count();
    //   console.log(`[DATABASE] Current user count: ${userCount}`);
      
    //   // Create a test user if none exist (for debugging)
    //   if (userCount === 0) {
    //     console.log('[DATABASE] No users found. Creating test user...');
    //     try {
    //       const testUser = await User.create({
    //         name: 'Test User',
    //         email: 'test@example.com',
    //         password: 'password123',
    //         role: 'admin'
    //       });
    //       console.log(`[DATABASE] Test user created: ${testUser.email} (ID: ${testUser.id})`);
    //     } catch (createError) {
    //       console.error('[DATABASE] Failed to create test user:', createError);
    //     }
    //   }
    // } catch (syncError) {
    //   console.error('Database sync error:', syncError);
    //   console.log('Note: Some tables may already exist. This is normal.');
    // }
    
    // Start server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
};

startServer(); 