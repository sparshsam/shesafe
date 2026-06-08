# Security & Privacy Model

## Authentication

SheSafe uses Supabase Auth with SSR (server-side rendering) sessions:

- Session tokens are stored in HTTP-only cookies (not accessible from JavaScript)
- Admin routes are protected by middleware that checks authentication before rendering
- Guest users can view the map without authentication

## Data Protection

- All database access is governed by PostgreSQL Row-Level Security (RLS)
- Each RLS policy is scoped to the authenticated user or admin role
- API routes validate session tokens before returning protected data

## Location Privacy

- No passive or background location tracking
- Pins are placed intentionally by the user through map clicks
- Location data is limited to latitude/longitude coordinates for each pin
- No device GPS access, geofencing, or continuous position monitoring

## Moderation

- Users can flag inappropriate pins
- Flagged content is reviewed through an admin panel
- Admins can remove pins that violate community guidelines
- Flag reasons are stored to provide context for moderation decisions

## Infrastructure Security

- Supabase handles database encryption at rest and in transit
- HTTPS is enforced on all production deployments
- No analytics, telemetry, or third-party tracking scripts are included
- Dependencies should be kept current with `npm audit`
