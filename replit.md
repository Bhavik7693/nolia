# AskVerify - AI-Powered Answer Verification Platform

## Overview

AskVerify is a single-page web application that provides verified answers from multiple AI models and web sources. The platform allows users to ask questions and receive accurate, transparent responses with configurable options for web sources, answer style, and output format.

The application follows a client-server architecture with a React frontend and Express backend. It's designed as an MVP with a clean, premium UI/UX focused on a single main interaction flow: ask a question, get a verified answer.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for smooth UI transitions
- **Build Tool**: Vite with custom plugins for Replit integration

The frontend is a single-page application with a home page containing:
- Top navigation bar with logo, theme toggle, and navigation options
- Hero section with headline and question input
- Quick options for web sources, answer style, and output format
- Answer display with copy, share, and regenerate functionality
- Voice search interaction with immersive listening mode
- Personalized onboarding for user preferences
- Keyboard shortcuts for power users (Cmd/Ctrl + K, Esc)

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **HTTP Server**: Node.js native http module wrapping Express
- **Development**: Vite dev server integration with HMR support
- **Static Serving**: Built assets served from dist/public in production

The server uses a modular structure:
- `server/index.ts`: Main entry point with middleware setup
- `server/routes.ts`: API route registration (prefix all routes with /api)
- `server/storage.ts`: Data access layer with in-memory storage (MemStorage)
- `server/vite.ts`: Development server integration
- `server/static.ts`: Production static file serving

### Data Storage
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` for shared type definitions
- **Current Implementation**: In-memory storage (MemStorage class) for development
- **Database Ready**: Drizzle config points to DATABASE_URL for PostgreSQL connection
- **Migrations**: Output to `./migrations` directory via `drizzle-kit push`

### Shared Layer
The `shared/` directory contains code used by both frontend and backend:
- Database schema definitions with Drizzle
- Zod validation schemas generated from Drizzle schemas
- TypeScript types inferred from schemas

### Build System
- **Client Build**: Vite outputs to `dist/public`
- **Server Build**: esbuild bundles server to `dist/index.cjs`
- **Dependencies**: Selected packages bundled for faster cold starts in production

## External Dependencies

### UI Component Libraries
- **shadcn/ui**: Complete component library built on Radix UI primitives
- **Radix UI**: Accessible, unstyled UI primitives (dialog, dropdown, tooltip, etc.)
- **Lucide React**: Icon library
- **Framer Motion**: Animation library

### Data & Forms
- **TanStack React Query**: Server state management and caching
- **React Hook Form**: Form state management
- **Zod**: Schema validation
- **drizzle-zod**: Generates Zod schemas from Drizzle tables

### Database & Backend
- **Drizzle ORM**: Type-safe database ORM
- **PostgreSQL**: Target database (via DATABASE_URL environment variable)
- **connect-pg-simple**: PostgreSQL session store for Express sessions

### Development Tools
- **Vite**: Frontend build tool and dev server
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Fast JavaScript bundler for production server build

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal**: Error overlay in development
- **@replit/vite-plugin-cartographer**: Development tooling
- **@replit/vite-plugin-dev-banner**: Development banner
- **vite-plugin-meta-images**: Custom plugin for OpenGraph image handling