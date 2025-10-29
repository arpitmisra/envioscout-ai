import axios from 'axios';
class BlockscoutAPI {
  constructor() {
    this.endpoints = {
      eth: 'https://eth.blockscout.com/api/v2',
      polygon: 'https://polygon.blockscout.com/api/v2',
      gnosis: 'https://gnosis.blockscout.com/api/v2',
      optimism: 'https://optimism.blockscout.com/api/v2',
      base: 'https://base.blockscout.com/api/v2',
      arbitrum: 'https://arbitrum.blockscout.com/api/v2'
    };
    this.client = axios.create({
      timeout: 30000,
       headers: {
         'Accept': 'application/json' 
       }
    });
  }
  getEndpoint(chain = 'eth') {
     const endpoint = this.endpoints[chain.toLowerCase()];
     if (!endpoint) {
         console.warn(`Unknown chain: ${chain}. Defaulting to Ethereum.`);
         return this.endpoints.eth;
     }
     return endpoint;
  }
   async makeRequest(url, params = {}, method = 'get') {
       try {
           const config = { params, method };
           const response = await this.client(url, config);
           return { success: true, data: response.data };
       } catch (error) {
           const status = error.response?.status;
           const message = error.response?.data?.message || error.message;
           console.error(`API Error ${status || ''}: ${message} (${url})`);
           return { success: false, error: message, status: status, data: error.response?.data }; 
       }
   }
  async getAddress(address, chain = 'eth') {
    const endpoint = this.getEndpoint(chain);
    console.log(`🔍 (API) Fetching address info for ${address} on ${chain}`);
    const result = await this.makeRequest(`${endpoint}/addresses/${address}`);
    result.chain = chain;
    return result;
  }
  async getAddressTransactions(address, chain = 'eth', queryParams = {}) {
    const endpoint = this.getEndpoint(chain);
    console.log(`🔍 (API) Fetching transactions for ${address} on ${chain} with params:`, queryParams);
    const result = await this.makeRequest(`${endpoint}/addresses/${address}/transactions`, queryParams);
     result.chain = chain;
    return result;
  }
  async getAddressTokens(address, chain = 'eth', type = 'ERC-20', queryParams = {}) {
     const endpoint = this.getEndpoint(chain);
     console.log(`🔍 (API) Fetching ${type} tokens held by ${address} on ${chain}`);
     const params = { ...queryParams, type };
    const result = await this.makeRequest(`${endpoint}/addresses/${address}/tokens`, params);
     result.chain = chain;
    return result;
  }
  async getTransaction(txHash, chain = 'eth') {
    const endpoint = this.getEndpoint(chain);
    console.log(`🔍 (API) Fetching transaction ${txHash} on ${chain}`);
    const result = await this.makeRequest(`${endpoint}/transactions/${txHash}`);
     result.chain = chain;
    return result;
  }
  async getBlock(blockNumberOrHash, chain = 'eth') {
    const endpoint = this.getEndpoint(chain);
    console.log(`🔍 (API) Fetching block ${blockNumberOrHash} on ${chain}`);
    const result = await this.makeRequest(`${endpoint}/blocks/${blockNumberOrHash}`);
     result.chain = chain;
    return result;
  }
  async getSmartContract(address, chain = 'eth') {
     const endpoint = this.getEndpoint(chain);
     console.log(`🔍 (API) Fetching smart contract ${address} on ${chain}`);
     const result = await this.makeRequest(`${endpoint}/smart-contracts/${address}`);
     result.chain = chain;
     return result;
   }
   async getToken(address, chain = 'eth') {
     const endpoint = this.getEndpoint(chain);
     console.log(`🔍 (API) Fetching token info for ${address} on ${chain}`);
     const result = await this.makeRequest(`${endpoint}/tokens/${address}`);
     result.chain = chain;
     return result;
   }
   async search(query, chain = 'eth') {
     const endpoint = this.getEndpoint(chain);
     console.log(`🔍 (API) Searching for "${query}" on ${chain}`);
     const result = await this.makeRequest(`${endpoint}/search`, { q: query });
     result.chain = chain;
     return result;
   }
   async getStats(chain = 'eth') {
     const endpoint = this.getEndpoint(chain);
     console.log(`🔍 (API) Fetching stats for ${chain}`);
     const result = await this.makeRequest(`${endpoint}/stats`);
     result.chain = chain;
     return result;
   }
   async getRecentBlocks(chain = 'eth', limit = 5) {
     const endpoint = this.getEndpoint(chain);
     console.log(`🔍 (API) Fetching recent ${limit} blocks on ${chain}`);
     const result = await this.makeRequest(`${endpoint}/blocks`, { type: 'block' });
     if (result.success && result.data?.items) {
       const blocks = result.data.items.slice(0, limit).map(block => {
         console.log(`📦 Block ${block.height}: tx_count = ${block.tx_count}`);
         return {
           number: Number(block.height),
           timestamp: block.timestamp,
           hash: block.hash,
           gasUsed: Number(block.gas_used || 0),
           size: Number(block.size || 0),
           transactionCount: Number(block.tx_count || 0), 
           chain
         };
       });
       console.log(`✅ Formatted ${blocks.length} blocks with tx counts:`, 
         blocks.map(b => `#${b.number}: ${b.transactionCount} txs`));
       return { success: true, blocks, chain };
     }
     return result;
   }
   async getGasPrice(chain = 'eth') {
     const endpoint = this.getEndpoint(chain);
     console.log(`⛽ (API) Fetching gas prices for ${chain} from ${endpoint}/stats`);
     
     try {
       const response = await this.client.get(`${endpoint}/stats`);
       
       if (response.data) {
         const data = response.data;
         const gasPriceGwei = data.gas_price ? Number(data.gas_price) / 1e9 : null;
         const gasPriceAvg = data.gas_prices?.average ? Number(data.gas_prices.average) : gasPriceGwei;
         const gasPriceSlow = data.gas_prices?.slow ? Number(data.gas_prices.slow) : gasPriceGwei;
         const gasPriceFast = data.gas_prices?.fast ? Number(data.gas_prices.fast) : gasPriceGwei;
         
         const gasPrices = {
           slow: gasPriceSlow || gasPriceAvg || 0,
           average: gasPriceAvg || 0,
           fast: gasPriceFast || gasPriceAvg || 0
         };
         
         console.log(`✅ Gas prices for ${chain}:`, gasPrices);
         return { 
           success: true, 
           chain,
           gasPrices,
           rawData: data
         };
       }
       
       console.warn(`⚠️ No gas price data for ${chain}`);
       return { success: false, error: 'No gas price data', chain };
     } catch (error) {
       console.error(`❌ Gas price error for ${chain}:`, error.message);
       return { success: false, error: error.message, chain };
     }
   }
}
let blockscoutAPI = null;
export function getBlockscoutAPI() {
  if (!blockscoutAPI) {
    blockscoutAPI = new BlockscoutAPI();
  }
  return blockscoutAPI;
}
export default BlockscoutAPI;