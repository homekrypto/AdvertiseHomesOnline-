import { Request, Response, NextFunction } from 'express';
import { db } from './db.js';
import { users, insertUserSchema } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import './types.js';

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: "Account is deactivated" });
    }

    // Store user ID in session
    req.session.userId = user.id;
    
    // Save session explicitly
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
      }
    });
    
    res.json({ 
      message: "Login successful",
      user: { 
        id: user.id, 
        email: user.email, 
        firstName: user.firstName, 
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
        profileImageUrl: user.profileImageUrl
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: "Login failed" });
  }
}

export async function register(req: Request, res: Response) {
  const { email, password, firstName, lastName, role = 'free' } = req.body;
  
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: "All fields required" });
  }

  // Validate input with Zod schema
  try {
    insertUserSchema.parse({ email, password, firstName, lastName, role });
  } catch (validationError) {
    return res.status(400).json({ error: "Invalid input data" });
  }

  try {
    // Check if user already exists
    const [existingUser] = await db.select().from(users).where(eq(users.email, email));
    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    // Create new user
    const [newUser] = await db.insert(users).values({
      email,
      password,
      firstName,
      lastName,
      role,
      isActive: true,
      emailVerified: false,
    }).returning();

    // Set session
    req.session.userId = newUser.id;
    
    // Save session explicitly
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
      }
    });
    
    res.status(201).json({ 
      message: "Registration successful",
      user: { 
        id: newUser.id, 
        email: newUser.email, 
        firstName: newUser.firstName, 
        lastName: newUser.lastName,
        role: newUser.role,
        organizationId: newUser.organizationId,
        profileImageUrl: newUser.profileImageUrl
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: "Registration failed" });
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

export async function getCurrentUser(req: Request, res: Response) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.session.userId));
    
    if (!user || !user.isActive) {
      // Clear invalid session
      req.session.destroy(() => {});
      return res.status(401).json({ error: "Invalid session" });
    }

    res.json({ 
      id: user.id, 
      email: user.email, 
      firstName: user.firstName, 
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId,
      profileImageUrl: user.profileImageUrl,
      phone: user.phone,
      emailVerified: user.emailVerified
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: "Failed to get user" });
  }
}

export async function logout(req: Request, res: Response) {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: "Logout failed" });
    }
    res.clearCookie('connect.sid');
    res.json({ message: "Logged out successfully" });
  });
}