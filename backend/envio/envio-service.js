import { HypersyncClient, BlockField, TransactionField } from '@envio-dev/hypersync-client';
class EnvioService {
  constructor() {
    this.clients = {};
  }
  getClient(chain = 'eth') {
    if (this.clients[chain]) return this.clients[chain];
    const urls = {
      eth: 'https://eth.hypersync.xyz',
      polygon: 'https://polygon.hypersync.xyz',
      base: 'https://base.hypersync.xyz',
      arbitrum: 'https://arbitrum.hypersync.xyz',
      optimism: 'https://optimism.hypersync.xyz'
    };
    const config = { url: urls[chain] || urls.eth };
    if (process.env.HYPERSYNC_BEARER_TOKEN) {
      config.bearerToken = process.env.HYPERSYNC_BEARER_TOKEN;
    }
    this.clients[chain] = HypersyncClient.new(config);
    return this.clients[chain];
  }
  async getRecentBlocksWithActivity(chain = 'eth', limit = 5) {
    try {
      const client = this.getClient(chain);
      console.log(`🔍 Fetching recent ${limit} blocks for ${chain}...`);
      const heightQuery = {
        fromBlock: 0,
        toBlock: undefined,
        fieldSelection: {
          block: [BlockField.Number]
        },
        maxNumBlocks: 1
      };
      const heightResponse = await client.get(heightQuery);
      const latestBlock = heightResponse.archiveHeight || heightResponse.nextBlock;
      if (!latestBlock) {
        throw new Error('Could not determine latest block');
      }
      console.log(`📍 Latest block for ${chain}: ${latestBlock}`);
      const startBlock = Math.max(0, latestBlock - 1000); 
      const query = {
        fromBlock: startBlock,
        toBlock: latestBlock,
        transactions: [{}], 
        fieldSelection: {
          block: [
            BlockField.Number,
            BlockField.Timestamp,
            BlockField.Hash,
            BlockField.GasUsed,
            BlockField.Size,
            BlockField.BaseFeePerGas 
          ],
          transaction: [
            TransactionField.BlockNumber,
            TransactionField.GasPrice 
          ]
        },
        includeAllBlocks: false, 
        maxNumBlocks: limit
      };
      const response = await client.get(query);
      console.log(`📦 Raw response for ${chain}:`, {
        hasData: !!response.data,
        hasBlocks: !!response.data?.blocks,
        blockCount: response.data?.blocks?.length || 0,
        hasTransactions: !!response.data?.transactions,
        txCount: response.data?.transactions?.length || 0
      });
      if (!response.data || !response.data.blocks || response.data.blocks.length === 0) {
        console.warn(`⚠️ No blocks returned for ${chain}`);
        return {
          success: false,
          chain,
          blocks: [],
          error: 'No blocks returned from API'
        };
      }
      const txCounts = {};
      const gasData = {}; 
      if (response.data.transactions && response.data.transactions.length > 0) {
        console.log(`📊 Processing ${response.data.transactions.length} transactions for ${chain}`);
        response.data.transactions.forEach(tx => {
          const blockNum = Number(tx.blockNumber);
          txCounts[blockNum] = (txCounts[blockNum] || 0) + 1;
          if (tx.gasPrice) {
            if (!gasData[blockNum]) {
              gasData[blockNum] = [];
            }
            gasData[blockNum].push(BigInt(tx.gasPrice));
          }
        });
        console.log(`📈 Transaction counts per block:`, txCounts);
      } else {
        console.warn(`⚠️ No transactions in response for ${chain}`);
      }
      const weiToEth = (wei) => Number(wei) / 1e18;
      const blocks = response.data.blocks
        .map(block => {
          try {
            const blockNum = Number(block.number);
            const gasUsed = Number(block.gasUsed || 0);
            let avgGasPrice = 0;
            if (gasData[blockNum] && gasData[blockNum].length > 0) {
              const sum = gasData[blockNum].reduce((a, b) => a + b, BigInt(0));
              avgGasPrice = Number(sum / BigInt(gasData[blockNum].length));
            } else if (block.baseFeePerGas) {
              avgGasPrice = Number(block.baseFeePerGas);
            }
            const gasFeeWei = gasUsed * avgGasPrice;
            const gasFeeNative = weiToEth(gasFeeWei);
            return {
              number: blockNum,
              timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
              hash: block.hash || 'N/A',
              gasUsed: gasUsed,
              size: Number(block.size || 0),
              transactionCount: txCounts[blockNum] || 0,
              baseFeePerGas: Number(block.baseFeePerGas || 0),
              avgGasPrice: avgGasPrice,
              gasFee: gasFeeNative, 
              chain
            };
          } catch (err) {
            console.error('Error formatting block:', err);
            return null;
          }
        })
        .filter(b => b !== null)
        .sort((a, b) => b.number - a.number)
        .slice(0, limit); 
      console.log(`✅ ${chain}: Returning ${blocks.length} blocks`);
      return {
        success: true,
        chain,
        blocks,
        archiveHeight: response.archiveHeight || response.nextBlock || null
      };
    } catch (error) {
      console.error(`❌ ${chain} error:`, error.message);
      return {
        success: false,
        chain,
        error: error.message,
        blocks: []
      };
    }
  }
  async getGasStats(chain = 'eth') {
    return {
      success: false,
      chain,
      average: 0,
      max: 0,
      min: 0,
      note: 'Gas stats disabled'
    };
  }
}
let envioService = null;
export function getEnvioService() {
  if (!envioService) {
    envioService = new EnvioService();
  }
  return envioService;
}
export default EnvioService;