import { Request, Response, NextFunction } from 'express';
import { db } from './db.js';
import { users } from '../shared/schema.js';
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

    // Simple session - store user ID
    req.session.userId = user.id;
    
    res.json({ 
      message: "Login successful",
      user: { 
        id: user.id, 
        email: user.email, 
        firstName: user.firstName, 
        role: user.role 
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
}

export async function register(req: Request, res: Response) {
  const { email, password, firstName, lastName } = req.body;
  
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: "All fields required" });
  }

  try {
    const [newUser] = await db.insert(users).values({
      email,
      password,
      firstName,
      lastName,
    }).returning();

    req.session.userId = newUser.id;
    
    res.json({ 
      message: "Registration successful",
      user: { 
        id: newUser.id, 
        email: newUser.email, 
        firstName: newUser.firstName, 
        role: newUser.role 
      }
    });
  } catch (error) {
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
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ 
      id: user.id, 
      email: user.email, 
      firstName: user.firstName, 
      role: user.role 
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get user" });
  }
}