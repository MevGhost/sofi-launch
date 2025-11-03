# Environment Variables Usage

## Required Variables (from .env):
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` - Used in providers.tsx for WalletConnect
- `NEXT_PUBLIC_SENTRY_DSN` - Used in all Sentry configs for error tracking
- `SENTRY_ORG` - Used in next.config.js for source map uploads
- `SENTRY_PROJECT` - Used in next.config.js for source map uploads
- `SENTRY_AUTH_TOKEN` - Used in .sentryclirc for authentication

## Optional Variables:
- `NEXT_PUBLIC_API_URL` - Backend API URL (defaults to /api)
- `NODE_ENV` - Environment (development/production)
- `CI` - Used to control Sentry logging in CI/CD

## All Values Set:
✅ NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=8e62b6e5c31302574d1ab427b5cb39dc
✅ NEXT_PUBLIC_SENTRY_DSN=https://7cf99e21db1cf686377914c3db7d0460@o4509834687348736.ingest.de.sentry.io/4509834714808400
✅ SENTRY_ORG=spinz-business-solutions-ltd
✅ SENTRY_PROJECT=s4labs
✅ SENTRY_AUTH_TOKEN=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
