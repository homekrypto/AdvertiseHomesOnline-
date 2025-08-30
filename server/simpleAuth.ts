import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Allow non-HTTPS for development
      maxAge: sessionTtl,
    },
  });
}

// Role-based redirect logic
function handleAuthSuccess(req: any, res: any) {
  const user = req.user;
  if (!user?.dbUser) {
    return res.redirect('/');
  }

  const role = user.dbUser.role;
  console.log(`Redirecting user with role: ${role}`);

  switch (role) {
    case 'agent':
      return res.redirect('/agent/dashboard');
    case 'agency':
      return res.redirect('/admin/dashboard');
    case 'expert':
      return res.redirect('/admin/comprehensive');
    case 'premium':
    case 'registered':
    case 'free':
    default:
      return res.redirect('/');
  }
}

// Simple demo auth system
async function createDemoUser(userInfo: { email: string; role?: string }) {
  return await storage.upsertUser({
    id: `demo-${Date.now()}`,
    email: userInfo.email,
    firstName: "Demo",
    lastName: "User",
    profileImageUrl: null,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: any, cb) => cb(null, user));
  passport.deserializeUser((user: any, cb) => cb(null, user));

  // Simple internal login - no external redirects
  app.get("/api/login", async (req, res) => {
    try {
      // Create demo user and log them in
      const demoUser = await createDemoUser({ 
        email: "demo@advertise-homes.online",
        role: req.query.role as string || "premium"
      });
      
      // Set user session
      req.login({ 
        claims: { sub: demoUser.id }, 
        dbUser: demoUser 
      }, (err: any) => {
        if (err) {
          console.error('Login error:', err);
          return res.redirect('/');
        }
        
        // Role-based redirect after successful authentication
        handleAuthSuccess(req, res);
      });
    } catch (error) {
      console.error('Auth setup error:', error);
      res.redirect('/');
    }
  });

  app.get("/api/logout", (req, res) => {
    req.logout((err: any) => {
      if (err) console.error('Logout error:', err);
      res.redirect('/');
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
};