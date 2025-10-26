# Envio HyperSync Integration

## Quick Fix for Timeout Errors

### The Problem
HyperSync timeout errors occur because:
1. ❌ **Missing API Token** - Required from November 3, 2025
2. ❌ **No timeout configuration** 
3. ❌ **Overly broad queries** requesting too much data
4. ❌ **No retry logic**

### The Solution ✅

#### 1. Get Your API Token (CRITICAL)
```bash
# Visit https://envio.dev/app/api-tokens
# Sign in and generate a token
# Add to your .env file:
HYPERSYNC_BEARER_TOKEN=your_token_here
```

#### 2. Optimized Query Settings
- ✅ 15-second request timeout
- ✅ Automatic retry with exponential backoff (3 attempts)
- ✅ Limited data fetching (max 20 blocks at a time)
- ✅ Removed unnecessary transaction fields

#### 3. Updated Code
The `envio-service.js` has been optimized with:
- Request timeout configuration
- Retry logic with backoff
- Reduced query payload
- Better error handling

## How to Use

### Environment Setup
```bash
# backend/.env
HYPERSYNC_BEARER_TOKEN=your_actual_token_from_envio
```

### Test It
```bash
cd backend
npm run dev
```

You should see:
```
🚀 Server running on port 3001
✅ HyperSync ready with API token
```

If you see warnings:
```
⚠️ WARNING: No HYPERSYNC_BEARER_TOKEN found!
⚠️ Get your token at: https://envio.dev/app/api-tokens
```
→ You need to add the token to your `.env` file!

## API Usage Examples

### Fetch Recent Blocks
```javascript
const envio = getEnvioService();
const result = await envio.getRecentBlocksWithActivity('eth', 10);
```

### Get Gas Statistics
```javascript
const gasStats = await envio.getGasStats('eth', 50);
```

### Supported Chains
- `eth` - Ethereum Mainnet
- `polygon` - Polygon
- `base` - Base
- `arbitrum` - Arbitrum One
- `optimism` - Optimism

## Troubleshooting

### Still Getting Timeouts?
1. **Check your token**: Make sure `HYPERSYNC_BEARER_TOKEN` is in `.env`
2. **Restart the server**: `npm run dev`
3. **Reduce query size**: Lower the `limit` parameter (try 5-10 blocks)
4. **Check network**: HyperSync requires stable internet connection

### Rate Limits
- With API token: Higher limits
- Without API token: Severely rate-limited (will fail after Nov 3, 2025)

## Resources
- 📚 [HyperSync Docs](https://docs.envio.dev/docs/HyperSync/overview)
- 🔑 [Get API Token](https://envio.dev/app/api-tokens)
- 🔧 [Query Builder](https://builder.hypersync.xyz/)
- 💬 [Discord Support](https://discord.gg/Q9qt8gZ2fX)

## Performance Tips
- Fetch only the fields you need
- Use smaller block ranges for faster responses
- Cache results when possible (already implemented in `dashboard.js`)
- Prefer specific block ranges over "latest" queries
