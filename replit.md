# AdvertiseHomes.Online - Real Estate Platform

## Overview

AdvertiseHomes.Online is a comprehensive real estate platform designed as a Zillow-style property listing and management system. The platform serves multiple user types from free browsers to premium subscribers and real estate professionals, providing property search functionality, agent tools, and subscription-based access to advanced features.

The application follows a modern full-stack architecture with a React frontend, Express.js backend, and PostgreSQL database, designed to handle property listings, user management, subscription tiers, and payment processing through Stripe integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Components**: Shadcn/UI component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state management
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework using TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Authentication**: Custom Replit Auth implementation with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL session store
- **API Design**: RESTful API with role-based access control (RBAC)

### Database Design
The system uses PostgreSQL with the following core entities:
- **Users**: Multi-tier user system (free, registered, premium, agent, agency, expert, admin)
- **Organizations**: Support for agency and expert tier group management
- **Properties**: Property listings with analytics tracking
- **Leads**: Lead management and routing system
- **Favorites & Saved Searches**: User preference tracking
- **Sessions**: Secure session management

### Authentication & Authorization
- **Multi-tier Access Control**: Seven user roles with escalating permissions
- **Session Security**: Secure HTTP-only cookies with CSRF protection
- **Feature Flags**: Role-based feature access control
- **SSO Integration**: OpenID Connect implementation for enterprise users

### Subscription Management
- **Stripe Integration**: Complete payment processing with webhooks
- **Tiered Plans**: Free, Premium, Agent, Agency, Expert subscription tiers
- **Usage Enforcement**: Listing caps, seat limits, and feature restrictions
- **Billing Automation**: Automated subscription lifecycle management

### File Storage & Media
- **Object Storage**: Google Cloud Storage integration with ACL policies
- **Media Pipeline**: Property image and document upload handling
- **CDN Integration**: Optimized media delivery

## External Dependencies

### Payment Processing
- **Stripe**: Complete payment infrastructure including Checkout, Billing, and webhook handling
- **Environment Variables**: `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLIC_KEY`

### Database
- **Neon PostgreSQL**: Serverless PostgreSQL database
- **Connection**: Via `@neondatabase/serverless` with connection pooling
- **Environment Variables**: `DATABASE_URL`

### Authentication
- **Replit Auth**: OpenID Connect implementation
- **Environment Variables**: `REPLIT_DOMAINS`, `ISSUER_URL`, `SESSION_SECRET`

### Cloud Services
- **Google Cloud Storage**: Media and file storage
- **Replit Object Storage**: Alternative file storage option
- **Environment Variables**: Object storage configuration via Replit sidecar

### Frontend Libraries
- **UI Framework**: Radix UI primitives with Shadcn/UI components
- **State Management**: TanStack React Query for API state
- **Payment UI**: Stripe Elements for payment forms
- **File Upload**: Uppy for file upload handling

### Development Tools
- **Build System**: Vite with TypeScript compilation
- **Code Quality**: ESBuild for server bundling
- **Development**: tsx for TypeScript execution
- **Schema Management**: Drizzle Kit for database migrations