# Global Access Shipping - Product Requirements Document

## Original Problem Statement
Build an enterprise-grade shipping website for "Global Access" with:
- Dashboard to view and update shipment tracking
- User roles: Admin, Customers, and Drivers
- Advanced tracking statuses
- Email notifications (Elastic Mail)
- Frontend: React with .jsx extension
- Backend: Native Supabase (Auth, RLS, Realtime)

## Architecture (Supabase Native)
```
Frontend (React + Tailwind + Shadcn UI)
├── Uses @supabase/supabase-js directly
├── Supabase Auth for authentication  
├── Direct database access via Supabase client
├── Supabase Realtime for live updates
└── No custom backend needed for CRUD

Supabase Backend
├── PostgreSQL database
├── Row Level Security (RLS) for permissions
├── Database triggers for profile creation
├── RPC functions for public tracking
└── Realtime subscriptions enabled
```

## Database Schema (Supabase)
- **profiles** - User profiles linked to auth.users (id, role, name, phone)
- **shipments** - Shipment records with tracking (tracking_number, origin, destination, status, assigned_driver_id)
- **tracking_events** - Status update history (shipment_id, status, description, location)

## User Roles & RLS
- **Admin**: Full access to all shipments and users
- **Customer**: Can create shipments, view own shipments
- **Driver**: Can view/update assigned shipments only

## What's Been Implemented

### March 2026
- [x] **Session Persistence Fix** - CRITICAL bug fixed where users were logged out on page refresh
  - Fixed AuthContext.jsx to handle INITIAL_SESSION event from Supabase
  - Set up auth subscription before getSession() call
  - Added fallback session check with proper timing

### January 2026
- [x] Supabase Auth integration
- [x] Profile auto-creation via database trigger  
- [x] RLS policies for role-based access
- [x] Shipment CRUD operations
- [x] Tracking timeline with status updates
- [x] Public tracking via RPC function
- [x] Enterprise UI with Global Access branding
- [x] Responsive dashboard with sidebar navigation
- [x] Supabase Realtime subscriptions for live updates
- [x] Live indicator badge on dashboard

## Supabase Setup Required
1. Run `/app/supabase_setup.sql` in SQL Editor
2. Disable email confirmation in Auth settings
3. Enable Realtime in database settings for shipments and tracking_events tables
4. Set Site URL to app URL

## Environment Variables
```
REACT_APP_SUPABASE_URL=https://[project].supabase.co
REACT_APP_SUPABASE_ANON_KEY=[anon-key]
```

## Prioritized Backlog

### P0 (Critical)
- [x] ~~Session persistence bug~~ - FIXED

### P1 (High)
- [x] ~~Elastic Mail integration for email notifications~~ - DONE (March 2026)
  - Welcome emails on registration
  - Shipment created notifications to recipients
  - Status update notifications to recipients
  - Note: Free tier can only send to registered email (sasbaws22@gmail.com)
- [x] ~~Cleanup obsolete /app/backend directory~~ - DONE (March 2026)
  - Removed old FastAPI/SQLAlchemy/Alembic code
  - Preserved Elastic Mail reference in /app/docs/elastic_mail_reference.md
  - Kept minimal health check server for monitoring

### P2 (Medium)
- [ ] Password reset flow
- [ ] Analytics dashboard for admins
- [ ] Export shipments to CSV
- [ ] Add admin role selection in registration

### P3 (Future)
- [ ] Live driver location tracking (map integration)
- [ ] Enhanced dashboard analytics with charts
- [ ] Driver mobile-optimized view

## Test Credentials
- Register new accounts at /register page
- Test user from latest test: test_session_1774377726@test.com / TestPassword123! (Customer role)
- First user can be promoted to admin via Supabase dashboard (profiles table)

## Key Files Reference
- `/app/frontend/src/context/AuthContext.jsx` - Auth state management
- `/app/frontend/src/lib/supabase.js` - Supabase client and data access functions
- `/app/frontend/src/App.js` - Routing and protected routes
- `/app/supabase_setup.sql` - Database schema and RLS policies
