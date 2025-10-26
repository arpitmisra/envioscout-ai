# 🚀 FIXED: Envio HyperSync Timeout Errors

## The Problem ❌
You were getting these annoying timeout errors:
```
[2025-10-25T20:05:33Z ERROR hypersync_client] failed to get arrow data from server, retrying...
    Caused by:
        0: error sending request for url (https://eth.hypersync.xyz/query/arrow-ipc)
        1: operation timed out
```

## Root Causes
1. **Missing API Token** - HyperSync requires authentication (mandatory from Nov 3, 2025)
2. **Wrong env variable name** - Was `ENVIO_API_TOKEN`, should be `HYPERSYNC_BEARER_TOKEN`
3. **No timeout configuration** - Requests had no timeout limit
4. **Too much data** - Fetching transactions + blocks at once
5. **No retry logic** - Single failures killed the whole request

## What I Fixed ✅

### 1. Updated `envio-service.js`
- ✅ Added 15-second request timeout
- ✅ Implemented retry logic with exponential backoff (up to 3 attempts)
- ✅ Optimized queries to fetch ONLY essential block data
- ✅ Removed heavy transaction fetching to prevent timeouts
- ✅ Fixed env variable name to `HYPERSYNC_BEARER_TOKEN`
- ✅ Added helpful warnings when token is missing

### 2. Updated Configuration Files
- ✅ `.env.example` now has `HYPERSYNC_BEARER_TOKEN` with instructions
- ✅ Added `check-envio` npm script for easy diagnostics
- ✅ Created setup helper script

### 3. Performance Optimizations
- ✅ Capped block queries at 20 maximum (was unlimited)
- ✅ Capped gas stats at 50 blocks (was 100)
- ✅ Removed transaction field selection (heavy data)
- ✅ Added proper error handling with graceful degradation

## How to Fix Your Setup 🔧

### Step 1: Get Your API Token
1. Visit: **https://envio.dev/app/api-tokens**
2. Sign in (create account if needed - it's free!)
3. Click "Create New Token"
4. Copy the generated token

### Step 2: Add Token to .env
```bash
# Open backend/.env and add:
HYPERSYNC_BEARER_TOKEN=eyJhbGci0iJIUz.... # paste your actual token
```

### Step 3: Verify Configuration
```bash
cd backend
npm run check-envio
```

You should see:
```
✅ HYPERSYNC_BEARER_TOKEN found
✅ .env file exists
✅ @envio-dev/hypersync-client v^0.6.6
```

### Step 4: Restart Server
```bash
npm run dev
```

## Expected Behavior

### Before (with errors)
```
[ERROR hypersync_client] operation timed out
[ERROR hypersync_client] operation timed out
[ERROR hypersync_client] operation timed out
```

### After (clean)
```
🚀 Server running on port 3001
📡 Environment: development
✅ Dashboard data loaded successfully
```

## Testing the Fix

### Test 1: Check Configuration
```bash
npm run check-envio
```

### Test 2: Test Dashboard API
Open in browser or curl:
```bash
curl http://localhost:3001/api/dashboard/stats/eth
```

Should return JSON with block data, no timeout errors!

### Test 3: Check Server Logs
Start the server and watch for:
- ✅ No timeout errors
- ✅ Quick responses (< 2 seconds)
- ✅ Successful data fetching

## Why This Happens

HyperSync is a high-performance blockchain data API that:
1. Requires authentication for production use
2. Has rate limits without tokens
3. Times out on large data requests
4. Needs optimized queries for best performance

The fixes ensure:
- Authenticated requests (faster, higher limits)
- Smaller, focused queries (no timeouts)
- Automatic retries (resilient to network hiccups)
- Proper error handling (graceful degradation)

## Resources
- 📚 [HyperSync Docs](https://docs.envio.dev/docs/HyperSync/overview)
- 🔑 [API Tokens](https://envio.dev/app/api-tokens)
- 🔧 [Query Builder](https://builder.hypersync.xyz/)
- 💬 [Discord Support](https://discord.gg/Q9qt8gZ2fX)

## Still Having Issues?

Run the diagnostic:
```bash
npm run check-envio
```

And check:
1. Token is valid (not expired)
2. Internet connection is stable
3. Server restarted after adding token
4. No firewall blocking envio.dev domains

---

**TL;DR**: Get API token from https://envio.dev/app/api-tokens, add as `HYPERSYNC_BEARER_TOKEN` in `.env`, restart server. Done! 🎉
