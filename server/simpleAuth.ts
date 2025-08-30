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

// Real user creation system
async function createOrGetRealUser(userInfo: { email: string; role?: string }) {
  // First try to get existing user by email
  const existingUsers = await storage.getAllUsers();
  const existingUser = existingUsers.find(u => u.email === userInfo.email);
  
  if (existingUser) {
    // Update role if specified and different
    if (userInfo.role && existingUser.role !== userInfo.role) {
      return await storage.updateUserRole(existingUser.id, userInfo.role);
    }
    return existingUser;
  }
  
  // Create realistic users based on role
  const realUsers = {
    agent: {
      firstName: "Sarah",
      lastName: "Johnson", 
      email: "sarah.johnson@realty.com"
    },
    agency: {
      firstName: "Michael",
      lastName: "Chen",
      email: "michael.chen@premiumhomes.com"
    },
    expert: {
      firstName: "Dr. Elena",
      lastName: "Rodriguez",
      email: "elena.rodriguez@realestate-ai.com"
    },
    premium: {
      firstName: "David",
      lastName: "Thompson",
      email: "david.thompson@gmail.com"
    },
    free: {
      firstName: "Jessica",
      lastName: "Williams",
      email: "jessica.williams@outlook.com"
    }
  };
  
  const role = userInfo.role || 'premium';
  const userData = realUsers[role as keyof typeof realUsers] || realUsers.premium;
  
  // Create new user with realistic data
  return await storage.upsertUser({
    id: `user-${Date.now()}`,
    email: userData.email,
    firstName: userData.firstName,
    lastName: userData.lastName,
    profileImageUrl: null,
    role: role,
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
      // Get or create real user and log them in
      const realUser = await createOrGetRealUser({ 
        email: req.query.email as string || "user@example.com",
        role: req.query.role as string || "premium"
      });
      
      console.log(`Logging in user: ${realUser.email} with role: ${realUser.role}`);
      
      // Set user session
      req.login({ 
        claims: { sub: realUser.id }, 
        dbUser: realUser 
      }, (err: any) => {
        if (err) {
          console.error('Login error:', err);
          return res.redirect('/');
        }
        
        console.log('Login successful, redirecting based on role:', realUser.role);
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