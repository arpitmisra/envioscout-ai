# Envio HyperSync Integration

## Overview

This service provides blockchain data access through Envio's HyperSync API, offering high-performance queries across multiple EVM-compatible chains.

## Configuration

### API Authentication

HyperSync requires an API token for production use (mandatory as of November 3, 2025).

**Setup:**

1. Obtain your API token from [https://envio.dev/app/api-tokens](https://envio.dev/app/api-tokens)
2. Add to your environment configuration:
```bash
# backend/.env
HYPERSYNC_BEARER_TOKEN=<your-token>
```

### Service Initialization

The service automatically configures:
- Request timeout: 30 seconds
- Retry mechanism: 3 attempts with exponential backoff
- Supported chains: Ethereum, Polygon, Base, Arbitrum, Optimism

## API Methods

### `getRecentBlocksWithActivity(chain, limit)`

Retrieves the most recent blocks from the specified chain.

**Parameters:**
- `chain` (string): Network identifier ('eth', 'polygon', 'base', 'arbitrum', 'optimism')
- `limit` (number): Maximum blocks to retrieve (default: 10)

**Returns:**
```javascript
{
  success: boolean,
  chain: string,
  blocks: Array<{
    number: number,
    timestamp: string,
    hash: string,
    gasUsed: number,
    size: number,
    transactionCount: number
  }>,
  archiveHeight: number
}
```

**Example:**
```javascript
import { getEnvioService } from './envio/envio-service.js';

const envio = getEnvioService();
const data = await envio.getRecentBlocksWithActivity('eth', 10);
```

### `getGasStats(chain, blockCount)`

Analyzes gas usage patterns across recent blocks.

**Parameters:**
- `chain` (string): Network identifier
- `blockCount` (number): Number of blocks to analyze (default: 100)

**Returns:**
```javascript
{
  success: boolean,
  chain: string,
  average: number,
  max: number,
  min: number,
  blocksAnalyzed: number
}
```

## Implementation Details

### Query Optimization

The service implements several optimizations for production use:

- **Field Selection**: Queries only necessary block fields to minimize payload size
- **Batch Limiting**: Constrains requests to prevent timeout issues
- **Retry Logic**: Automatic retry with exponential backoff (1s, 2s, 4s)
- **Error Handling**: Graceful degradation with detailed error reporting

### Caching Strategy

The dashboard router (`routes/dashboard.js`) implements a 5-second in-memory cache to reduce API load during frequent requests.

## Supported Networks

| Network | Chain ID | Endpoint |
|---------|----------|----------|
| Ethereum | 1 | https://eth.hypersync.xyz |
| Polygon | 137 | https://polygon.hypersync.xyz |
| Base | 8453 | https://base.hypersync.xyz |
| Arbitrum | 42161 | https://arbitrum.hypersync.xyz |
| Optimism | 10 | https://optimism.hypersync.xyz |

## Error Handling

Common error scenarios and resolutions:

**Authentication Error:**
```
Error: Unauthorized
```
Resolution: Verify `HYPERSYNC_BEARER_TOKEN` is correctly set in `.env`

**Timeout Error:**
```
Error: Request timeout
```
Resolution: Reduce query size or check network connectivity

**Rate Limit Error:**
```
Error: Too many requests
```
Resolution: Implement request throttling or upgrade API tier

## Testing

Verify configuration:
```bash
# Test endpoint directly
curl http://localhost:3001/api/dashboard/stats/eth

# Expected response includes:
# - success: true
# - blocks: array of block objects
# - metrics: computed statistics
```

## Performance Considerations

- Average query latency: 200-500ms per request
- Recommended query limit: 5-20 blocks per request
- Cache invalidation: 5-10 seconds for real-time applications
- Concurrent request limit: 10 requests per second

## Dependencies
```json
{
  "@envio-dev/hypersync-client": "^0.x.x"
}
```

## Documentation

- [HyperSync API Documentation](https://docs.envio.dev/docs/HyperSync/overview)
- [Query Builder](https://builder.hypersync.xyz/)
- [Client SDK Reference](https://github.com/enviodev/hypersync-client-node)

## License

Part of the GemScout AI project. See main repository LICENSE for details.