import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/database.js';
import authRoutes from './routes/auth.js';
import dataRoutes from './routes/data.js';

dotenv.config();

const app: Express = express();
const PORT = Number(process.env.PORT) || 3001;

// Trust proxy for X-Forwarded-For header (needed for IP logging when behind reverse proxy)
app.set('trust proxy', true);

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server is running' });
});

// Routes
app.use('/auth', authRoutes);
app.use('/', dataRoutes);

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Test database connection and start server
const startServer = async () => {
  try {
    // Test database connection
    const result = await pool.query('SELECT NOW()');
    console.log('✓ Database connected:', result.rows[0].now);

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✓ Backend server running on http://0.0.0.0:${PORT}`);
      console.log(`✓ Backend server running ${PORT}`);
      console.log(`✓ CORS enabled for all origins (dynamic)`);
    });
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    console.error('✗ Make sure PostgreSQL is running on', process.env.DB_HOST);
    process.exit(1);
  }
};

startServer();

export default app;
