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
      sameSite: 'lax', // Important for cross-origin requests
    },
    name: 'replit.sid', // Custom session name
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
    case 'admin':
      return '/admin/dashboard';
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

// Remove demo user creation - real users only through registration

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: any, cb) => {
    console.log('Serializing user:', user?.claims?.sub);
    cb(null, user?.claims?.sub); // Store only user ID
  });
  
  passport.deserializeUser(async (userId: string, cb) => {
    try {
      console.log('Deserializing user ID:', userId);
      const user = await storage.getUser(userId);
      if (user) {
        // Reconstruct the full user object with claims
        const fullUser = {
          claims: { sub: user.id },
          dbUser: user
        };
        console.log('User deserialized successfully:', user.email);
        cb(null, fullUser);
      } else {
        console.log('User not found during deserialization:', userId);
        cb(null, false);
      }
    } catch (error) {
      console.error('Error deserializing user:', error);
      cb(error, null);
    }
  });

  // User registration endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, firstName, lastName, password, role = "free" } = req.body;
      
      // Validate required fields
      if (!email || !firstName || !lastName || !password) {
        return res.status(400).json({ error: "All fields are required" });
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Please enter a valid email address" });
      }
      
      // Validate password strength
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "An account with this email already exists" });
      }
      
      // Create new user with real data
      const newUser = await storage.upsertUser({
        email: email.toLowerCase().trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(), 
        password: password, // In production, hash this with bcrypt
        role: role || "free",
        status: "active",
        profileImageUrl: null,
        featureFlags: {},
        organizationId: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      });
      
      console.log(`New user registered: ${newUser.email} (Role: ${newUser.role})`);
      
      // Auto-login after successful registration
      req.login({ 
        claims: { sub: newUser.id }, 
        dbUser: newUser 
      }, (err: any) => {
        if (err) {
          console.error('Auto-login after registration error:', err);
          return res.status(500).json({ error: "Registration succeeded but auto-login failed" });
        }
        
        // Remove password from response
        const { password: _, ...userWithoutPassword } = newUser;
        res.status(201).json({ 
          message: "Account created successfully", 
          user: userWithoutPassword,
          redirectUrl: getRedirectUrl(newUser.role)
        });
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: "Registration failed. Please try again." });
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
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      // Check if user has a password set
      if (!user.password) {
        return res.status(401).json({ error: "Please register an account first" });
      }
      
      // Password validation - in production, use bcrypt for password hashing
      if (user.password !== password) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      // Check if user account is active
      if (user.status !== 'active') {
        return res.status(401).json({ error: "Account is suspended or inactive" });
      }
      
      console.log(`Successful login: ${user.email} (Role: ${user.role})`);
      
      // Set user session
      req.login({ 
        claims: { sub: user.id }, 
        dbUser: user 
      }, (err: any) => {
        if (err) {
          console.error('Login session error:', err);
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
  console.log('Auth check - isAuthenticated():', req.isAuthenticated());
  console.log('Auth check - user:', req.user ? 'present' : 'missing');
  console.log('Auth check - session:', req.session ? 'present' : 'missing');
  
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
};