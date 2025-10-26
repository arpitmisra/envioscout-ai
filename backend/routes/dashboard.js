import express from 'express';
import { getEnvioService } from '../envio/envio-service.js';
const router = express.Router();
const cache = new Map();
const CACHE_TTL = 8000; 
router.get('/stats/:chain', async (req, res) => {
  try {
    const chain = req.params.chain || 'eth';
    const cacheKey = `stats-${chain}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`📦 Cache hit for ${chain}`);
      return res.json(cached.data);
    }
    console.log(`🔄 Fetching fresh data for ${chain}`);
    const envio = getEnvioService();
    const blocksResult = await envio.getRecentBlocksWithActivity(chain, 5);
    if (!blocksResult.success || !blocksResult.blocks) {
      throw new Error(blocksResult.error || 'Failed to fetch blocks from Envio');
    }
    const blocks = blocksResult.blocks;
    const blockTimes = [];
    for (let i = 1; i < blocks.length; i++) {
      const timeDiff = (new Date(blocks[i-1].timestamp) - new Date(blocks[i].timestamp)) / 1000;
      if (timeDiff > 0) blockTimes.push(timeDiff);
    }
    const avgBlockTime = blockTimes.length > 0 
      ? (blockTimes.reduce((a, b) => a + b, 0) / blockTimes.length).toFixed(2)
      : 0;
    const totalTxs = blocks.reduce((sum, block) => sum + (block.transactionCount || 0), 0);
    const totalTime = blockTimes.reduce((a, b) => a + b, 0);
    const tps = totalTime > 0 ? (totalTxs / totalTime).toFixed(2) : 0;
    const latestBlock = blocksResult.archiveHeight || blocks[0]?.number || 0;
    const data = {
      success: true,
      chain,
      timestamp: new Date().toISOString(),
      blocks: blocks || [], 
      gasStats: null,
      archiveHeight: latestBlock,
      metrics: {
        avgBlockTime,
        tps: Number(tps),
        totalTxs,
        blocksAnalyzed: blocks.length
      }
    };
    cache.set(cacheKey, { data, timestamp: Date.now() });
    console.log(`✅ Returning ${data.blocks.length} blocks for ${chain}:`, {
      totalTxs,
      tps: Number(tps),
      avgBlockTime: `${avgBlockTime}s`
    });
    res.json(data);
  } catch (error) {
    console.error('❌ Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      blocks: []
    });
  }
});
export default router;