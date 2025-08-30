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

  const redirectUrl = getRedirectUrl(role);
  return res.redirect(redirectUrl);
}

// Get redirect URL based on role
function getRedirectUrl(role: string): string {
  switch (role) {
    case 'agent':
      return '/agent/dashboard';
    case 'agency':
      return '/admin/dashboard';
    case 'expert':
      return '/admin/comprehensive';
    case 'premium':
    case 'registered':
    case 'free':
    default:
      return '/';
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

  // User registration endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, firstName, lastName, password, role = "free" } = req.body;
      
      if (!email || !firstName || !lastName) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }
      
      // Create new user
      const newUser = await storage.upsertUser({
        email,
        firstName,
        lastName,
        role,
        status: "active",
        profileImageUrl: null,
      });
      
      console.log(`New user registered: ${newUser.email} with role: ${newUser.role}`);
      
      // Auto-login after registration
      req.login({ 
        claims: { sub: newUser.id }, 
        dbUser: newUser 
      }, (err: any) => {
        if (err) {
          console.error('Auto-login error:', err);
          return res.status(500).json({ error: "Registration succeeded but login failed" });
        }
        
        res.json({ 
          message: "Registration successful", 
          user: newUser,
          redirectUrl: getRedirectUrl(newUser.role)
        });
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // User login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      
      // Get user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Simple password check (in production, use bcrypt)
      console.log(`Password check: user.password='${user.password}' vs provided='${password}'`);
      if (user.password !== password) {
        console.log('Password mismatch - denying login');
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      console.log(`User login: ${user.email} with role: ${user.role}`);
      
      // Set user session
      req.login({ 
        claims: { sub: user.id }, 
        dbUser: user 
      }, (err: any) => {
        if (err) {
          console.error('Login error:', err);
          return res.status(500).json({ error: "Login failed" });
        }
        
        // Remove password from response for security
        const { password: _, ...userWithoutPassword } = user;
        res.json({ 
          message: "Login successful", 
          user: userWithoutPassword,
          redirectUrl: getRedirectUrl(user.role)
        });
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Demo login for testing (temporary)
  // Demo login endpoint removed - use /register and /login pages instead

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