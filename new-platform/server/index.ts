import express from 'express';
import session from 'express-session';
import { db } from './db.js';
import { properties } from '../shared/schema.js';
import { login, register, requireAuth, getCurrentUser } from './auth.js';
import { eq } from 'drizzle-orm';

const app = express();

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

app.use(express.json());
app.use(express.static('dist/public'));

// Auth routes
app.post('/api/auth/login', login);
app.post('/api/auth/register', register);
app.get('/api/auth/user', getCurrentUser);
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out" });
  });
});

// Properties routes
app.get('/api/properties', async (req, res) => {
  try {
    const allProperties = await db.select().from(properties).where(eq(properties.active, true));
    res.json(allProperties);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch properties" });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(process.cwd() + '/dist/public/index.html');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});