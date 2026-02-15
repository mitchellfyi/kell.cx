# AI Integration with Static Export

This project uses Next.js with `output: 'export'` which creates a fully static site. This means traditional API routes cannot be used for server-side AI processing.

## Current Implementation

The AI integration architecture is prepared but requires one of these deployment strategies:

### Option 1: Vercel Edge Functions (Recommended)
- Deploy to Vercel
- Convert API routes to Edge Functions
- Remove `output: 'export'` from next.config.ts
- Use the existing API routes in `/app/api/ai/`

### Option 2: External AI Service
- Create a separate backend service for AI
- Use the `AIClient` in `lib/ai/client.ts`
- Configure the endpoint to your external service
- Handle CORS and authentication

### Option 3: Build-Time Generation
- Generate AI content during build
- Store results as static JSON files
- Import and use in components
- Rebuild periodically to refresh content

### Option 4: Client-Side AI (Limited)
- Use browser-compatible AI libraries
- Note: This exposes API keys to users
- Only suitable for public/demo use

## To Enable Server-Side AI

1. Remove or comment out `output: 'export'` in `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  // output: 'export',  // Comment this line
  // ... rest of config
};
```

2. Deploy to a platform that supports API routes:
   - Vercel (recommended)
   - Netlify with Functions
   - Self-hosted Node.js server

3. Set the `ANTHROPIC_API_KEY` environment variable

4. The API routes will then work:
   - POST `/api/ai/insights` - Generate insights
   - POST `/api/ai/analyze` - Generate analysis
   - GET `/api/ai/test` - Test endpoint

## Files Created

- `/lib/ai/` - Core AI service implementation
- `/app/api/ai/` - API route handlers (requires non-static build)
- `.env.example` - Environment variable template
- `/lib/ai/client.ts` - Client-side AI integration helper