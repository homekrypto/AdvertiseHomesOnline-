import express from 'express';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { db } from './db.js';
import { properties, subscriptionPlans } from '../shared/schema.js';
import { login, register, requireAuth, getCurrentUser, logout } from './auth.js';
import { eq } from 'drizzle-orm';

const app = express();

// PostgreSQL session store
const PgStore = connectPg(session);
const sessionStore = new PgStore({
  conString: process.env.DATABASE_URL,
  createTableIfMissing: true,
  tableName: 'sessions'
});

// Session middleware with PostgreSQL store
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  }
}));

app.use(express.json());
app.use(express.static('dist/public'));

// CORS headers for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Auth routes
app.post('/api/auth/login', login);
app.post('/api/auth/register', register);
app.get('/api/auth/user', getCurrentUser);
app.post('/api/auth/logout', logout);

// Properties routes
app.get('/api/properties', async (req, res) => {
  try {
    const allProperties = await db.select().from(properties).where(eq(properties.status, 'active'));
    res.json(allProperties);
  } catch (error) {
    console.error('Properties fetch error:', error);
    res.status(500).json({ error: "Failed to fetch properties" });
  }
});

// Create property (authenticated)
app.post('/api/properties', requireAuth, async (req, res) => {
  try {
    const { title, description, price, address, city, state, propertyType, bedrooms, bathrooms, sqft } = req.body;
    
    if (!title || !price || !address || !city || !state || !propertyType) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    const [newProperty] = await db.insert(properties).values({
      title,
      description,
      price: price.toString(),
      address,
      city,
      state,
      propertyType,
      bedrooms: bedrooms || null,
      bathrooms: bathrooms || null,
      sqft: sqft || null,
      agentId: req.session.userId!,
      status: 'active'
    }).returning();

    res.status(201).json(newProperty);
  } catch (error) {
    console.error('Property creation error:', error);
    res.status(500).json({ error: "Failed to create property" });
  }
});

// Subscription plans
app.get('/api/subscription-plans', async (req, res) => {
  try {
    const plans = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
    res.json(plans);
  } catch (error) {
    console.error('Plans fetch error:', error);
    res.status(500).json({ error: "Failed to fetch subscription plans" });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(process.cwd() + '/dist/public/index.html');
});

const PORT = parseInt(process.env.PORT || '5000', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Database connected: ${process.env.DATABASE_URL ? 'YES' : 'NO'}`);
});