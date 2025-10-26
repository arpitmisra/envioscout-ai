import { GoogleGenerativeAI } from '@google/generative-ai';
import { getBlockscoutAPI } from '../blockscout/blockscout-api.js';
class GeminiAgent {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-pro', 
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    });
    this.blockscoutAPI = getBlockscoutAPI();
    this.supportedChains = ['polygon', 'eth', 'base', 'optimism', 'arbitrum', 'gnosis'];
  }
  async initialize() {
    console.log('✅ Gemini Agent initialized (using direct Blockscout API)');
  }
  async generateWithRetry(prompt, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await this.model.generateContent(prompt);
        if (result.response && typeof result.response.text === 'function') {
          return result.response.text();
        } else {
          console.error('Unexpected AI response structure:', result);
          throw new Error('Failed to get text from AI response');
        }
      } catch (error) {
        console.log(`⚠️ Attempt ${i + 1} failed: ${error.message}`);
        if (error.status === 503 || (error.message && error.message.includes('503'))) {
          const waitTime = Math.pow(2, i) * 1000;
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else if (i === maxRetries - 1) {
          throw error;
        } else {
          const waitTime = Math.pow(2, i) * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    throw new Error('AI content generation failed after all retries');
  }
  detectRequestedChain(userMessage) {
      const lowerMsg = userMessage.toLowerCase();
      for (const chain of this.supportedChains) {
          if (lowerMsg.includes(chain) || (chain === 'eth' && lowerMsg.includes('ethereum')) || (chain === 'polygon' && lowerMsg.includes('matic'))) {
              return chain;
          }
      }
      return null; 
  }
  async getActiveChains(address, requestedChain = null) {
    const chainsToCheck = requestedChain ? [requestedChain] : this.supportedChains;
    const active = [];
    for (const chain of chainsToCheck) {
      if (!this.supportedChains.includes(chain)) {
          console.log(`⚠️ Requested chain "${chain}" is not directly supported by API endpoints. Skipping.`);
          continue;
      }
      try {
        console.log(`🔍 Checking ${chain}...`);
        const res = await this.blockscoutAPI.getAddress(address, chain);
        if (res?.success && res.data) {
          const hasBalance = res.data.coin_balance && res.data.coin_balance !== '0';
          const hasTxsOrTokens = res.data.has_token_transfers || (res.data.transactions_count && res.data.transactions_count > 0);
          if (requestedChain || hasBalance || hasTxsOrTokens) {
            active.push({ chain, info: res.data });
            console.log(`✅ Found address info on ${chain}`);
          }
        } else {
             console.log(`Address not found or inactive on ${chain}.`);
             if (requestedChain === chain) {
                 active.push({ chain, info: null });
             }
        }
      } catch (e) {
        console.log(`⚠️ ${chain} check might have failed: ${e.message}`);
         if (requestedChain === chain) {
             active.push({ chain, info: null });
         }
      }
    }
    if (active.length === 0 && !requestedChain) {
      try {
        console.log(`No active chains detected, falling back to 'eth'`);
        const res = await this.blockscoutAPI.getAddress(address, 'eth');
        active.push({ chain: 'eth', info: res?.data || null });
      } catch (e) {
         active.push({ chain: 'eth', info: null });
      }
    }
    const uniqueActive = Array.from(new Map(active.map(item => [item.chain, item])).values());
    return uniqueActive;
  }
  formatTokenBalance(value, decimals) {
    try {
      const numValue = BigInt(value || '0');
      const numDecimals = parseInt(decimals || '18', 10);
      if (isNaN(numDecimals)) throw new Error(`Invalid decimals: ${decimals}`);
      const divisor = BigInt(10) ** BigInt(numDecimals);
      if (divisor === 0n) return 0;
      const wholePart = numValue / divisor;
      const fractionalPart = numValue % divisor;
      const fractionalString = fractionalPart.toString().padStart(numDecimals, '0');
      const balanceString = `${wholePart.toString()}.${fractionalString}`;
      return Number(balanceString);
    } catch (e) {
      console.error('Error formatting balance:', e, { value, decimals });
      return 0;
    }
  }
  async fetchChainData(address, chain) {
    const result = {
      chain, address, nativeBalance: 0,
      nativeSymbol: chain === 'eth' ? 'ETH' : chain.toUpperCase(),
      tokens: [], usdValue: 0, error: null
    };
    let nativeUsdRate = 0;
    try {
        const addrRes = await this.blockscoutAPI.getAddress(address, chain);
        if (addrRes.success && addrRes.data) {
            if (addrRes.data.coin_balance) {
                result.nativeBalance = this.formatTokenBalance(addrRes.data.coin_balance, addrRes.data.coin_decimals || 18);
            }
            if (addrRes.data.exchange_rate) {
                nativeUsdRate = Number(addrRes.data.exchange_rate);
            }
        } else if (!addrRes.success) {
             result.error = `Failed to fetch address info: ${addrRes.error}`;
             console.log(`⚠️ Error fetching address info for ${chain}: ${addrRes.error}`);
        }
        try {
            const tokensRes = await this.blockscoutAPI.getAddressTokens(address, chain, 'ERC-20');
            if (tokensRes.success && tokensRes.data?.items) {
                for (const t of tokensRes.data.items) {
                    const tokenMeta = t.token || {};
                    const balance = this.formatTokenBalance(t.value || '0', tokenMeta.decimals || 18);
                    const rate = tokenMeta.exchange_rate ? Number(tokenMeta.exchange_rate) : 0;
                    const usd = rate ? balance * rate : 0;
                    if (balance > 0) { 
                        result.tokens.push({
                            name: tokenMeta.name || tokenMeta.symbol || 'Unknown',
                            symbol: tokenMeta.symbol || 'UNKNOWN',
                            address: tokenMeta.address || null,
                            balance, usd,
                        });
                        result.usdValue += usd;
                    }
                }
            } else if (!tokensRes.success) {
                 console.log(`⚠️ Failed to fetch tokens for ${chain}: ${tokensRes.error}`);
                 if (!result.error) result.error = `Failed to fetch tokens: ${tokensRes.error}`;
            }
        } catch (tokenErr) {
            console.log(`⚠️ Unexpected error fetching tokens for ${chain}: ${tokenErr.message}`);
             if (!result.error) result.error = `Unexpected token fetch error: ${tokenErr.message}`;
        }
        if (nativeUsdRate > 0) {
            const nativeUsd = result.nativeBalance * nativeUsdRate;
            result.usdValue += nativeUsd;
        }
    } catch (e) {
        result.error = e.message;
        console.log(`⚠️ Unexpected error fetching data for ${chain}: ${e.message}`);
    }
    return result;
  }
  parseUserIntent(message) {
    if (message.includes('block') || message.includes('recent blocks') || message.match(/recent \d+ blocks/)) return 'blocks';
    if (message.includes('transaction') || message.includes('tx') || message.includes('transfers') || message.includes('history') || message.includes('activity')) return 'transactions';
    if (message.includes('analy') || message.includes('analyse') || message.includes('analysis')) return 'analysis';
    if (message.includes('token') || message.includes('balance') || message.includes('holdings') || message.includes('assets')) return 'tokens';
    return 'general';
  }
  buildMultiChainTokensPrompt(userMessage, address, chainData, requestedChain = null) {
     let prompt = `User asked: "${userMessage}"\n\n`;
     if (requestedChain) {
         prompt += `# Wallet Analysis for ${address} (Filtered for ${requestedChain.toUpperCase()})\n\n`;
     } else {
        prompt += `# Multi-chain Wallet Analysis for ${address}\n\n`;
     }
     let consolidatedUsd = 0;
     for (const data of chainData) {
         const { chain, success, error, nativeBalance, nativeSymbol, tokens, usdValue } = data; 
         prompt += `## ${chain.toUpperCase()} Network\n`;
         if (error && tokens.length === 0 && nativeBalance === 0) {
             prompt += `- Error fetching data: ${error}\n\n`;
             continue;
         }
         prompt += `- Native balance (${nativeSymbol}): ${nativeBalance.toFixed(6)}\n`;
         if (tokens.length === 0) {
             prompt += `- No ERC-20 tokens found.\n`;
         } else {
             prompt += `- Token holdings (Top ${Math.min(10, tokens.length)}):\n`;
             tokens.slice(0, 10).forEach(tok => {
                 prompt += `  - ${tok.name} (${tok.symbol}): ${tok.balance.toFixed(6)}${tok.usd ? ` (≈ $${tok.usd.toFixed(2)})` : ''}\n`;
             });
             if (tokens.length > 10) prompt += `  - ...and ${tokens.length - 10} more tokens.\n`;
         }
         if (error) {
             prompt += `- Note: Encountered issues fetching some data (${error})\n`;
         }
         prompt += `\n- Chain subtotal (USD): $${usdValue.toFixed(2)}\n\n`;
         consolidatedUsd += usdValue;
     }
     if (!requestedChain && chainData.length > 1) {
        prompt += `# Consolidated Portfolio Value\n`;
        prompt += `- Total USD value across chains: $${consolidatedUsd.toFixed(2)}\n\n`;
     }
     prompt += `\n## Instructions\nProvide a clear, human-readable summary. If multiple chains were analyzed, give a consolidated overview first, then break down by chain. If filtered for one chain, focus on that. Highlight notable assets and USD values. Mention any errors encountered.\n\nUse ONLY the data provided. Be accurate and clear. Use markdown formatting.`;
     return prompt;
  }
  buildTransactionsPrompt(userMessage, address, txResults, requestedChain = null) {
    const nativeSymbols = { eth: 'ETH', polygon: 'MATIC', base: 'ETH', optimism: 'ETH', arbitrum: 'ETH', gnosis: 'xDAI' };
    let prompt = `User asked: "${userMessage}"\n\n`;
    if (requestedChain) {
        prompt += `# Transaction History for ${address} on ${requestedChain.toUpperCase()}\n\n`;
    } else {
        prompt += `# Multi-chain Transaction History for ${address}\n\n`;
    }
    let anyTransactionsFound = false;
    for (const result of txResults) {
      const { chain, success, data, error } = result;
      const symbol = nativeSymbols[chain] || chain.toUpperCase();
      prompt += `## ${chain.toUpperCase()} Network\n`;
      if (!success || error) {
        prompt += `- Error fetching transactions: ${error || 'Unknown error'}\n\n`;
        continue;
      }
      if (!data || !data.items || data.items.length === 0) {
        prompt += `- No recent transactions found.\n\n`;
        continue;
      }
      anyTransactionsFound = true;
      const itemsToShow = data.items.slice(0, 10); 
      prompt += `- Showing the latest ${itemsToShow.length} transactions:\n`;
      itemsToShow.forEach((tx, i) => {
        const value = this.formatTokenBalance(tx.value || '0', 18); 
        prompt += `  ${i + 1}. **Hash:** ${tx.hash || 'N/A'}\n`;
        prompt += `     - **From:** ${tx.from?.hash || 'N/A'}\n`;
        prompt += `     - **To:** ${tx.to?.hash || 'N/A'}\n`;
        prompt += `     - **Value:** ${value.toFixed(6)} ${symbol}\n`;
        prompt += `     - **Method:** ${tx.method || 'Transfer'}\n`;
        prompt += `     - **Time:** ${tx.timestamp || 'N/A'}\n`;
      });
      if (data.next_page_params) {
          prompt += `- (More transactions may be available for this chain)\n`
      }
      prompt += `\n`;
    }
     if (!anyTransactionsFound && txResults.length > 0 && !txResults.some(r => r.error)) {
         prompt += `No transactions found on the checked chain(s).\n\n`;
     }
    prompt += `\n## Instructions\n`;
    prompt += `Based *only* on the data provided above, provide a clear, concise summary of the transaction history. `;
    if (requestedChain) {
        prompt += `Focus the summary on the ${requestedChain.toUpperCase()} network. `;
    } else {
        prompt += `Summarize activity across all chains shown. `;
    }
    prompt += `Highlight the number of recent transactions found per chain, any notable methods or value transfers, and mention any errors encountered.\n\nUse natural language and markdown formatting.`;
    return prompt;
  }
   buildBlocksPrompt(userMessage, chain, blocksData) {
     let prompt = `User asked: "${userMessage}"\n\n`;
     const blocks = blocksData || [];
     prompt += `# Recent ${blocks.length} blocks on ${chain.toUpperCase()}\n\n`;
     if (blocks.length === 0) {
       prompt += `No recent block data available from the API for ${chain.toUpperCase()}. Please try again later.\n`;
       return prompt;
     }
     blocks.forEach(b => {
       const number = b.height ?? 'N/A';
       const hash = b.hash || 'N/A';
       const parent = b.parent_hash || 'N/A';
       const ts = b.timestamp || 'N/A';
       const txCount = b.tx_count || 0;
       const gasUsed = b.gas_used || 'N/A';
       prompt += `## Block ${number}\n- Hash: ${hash}\n- Parent: ${parent}\n- Timestamp: ${ts}\n- Transactions: ${txCount}\n- Gas used: ${gasUsed}\n\n`;
     });
     prompt += `\n## Instructions\nProvide a concise, human-readable summary of the blocks above. Highlight any notable patterns, gas usage, or unusual block sizes.\n`;
     return prompt;
   }
  async chat(userMessage) {
    try {
      console.log(`💬 User query: ${userMessage}`);
      const intent = this.parseUserIntent(userMessage.toLowerCase());
      const requestedChain = this.detectRequestedChain(userMessage);
      if (intent === 'blocks') {
            const chainForBlocks = requestedChain || 'eth';
             console.log(`🔍 Fetching latest block for ${chainForBlocks} via API...`);
             const blockRes = await this.blockscoutAPI.getBlock('latest', chainForBlocks);
             let blocksData = [];
             if (blockRes.success && blockRes.data) {
                 blocksData.push(blockRes.data);
             } else {
                 console.log(`⚠️ Failed to fetch latest block for ${chainForBlocks}: ${blockRes.error}`);
             }
             const prompt = this.buildBlocksPrompt(userMessage, chainForBlocks, blocksData);
             const response = await this.generateWithRetry(prompt);
             return { response, toolsUsed: ['getBlock'], timestamp: new Date().toISOString() };
      }
      const addressMatch = userMessage.match(/0x[a-fA-F0-9]{40}/);
      if (!addressMatch) {
        console.log('💬 Answering general question (no address detected)...');
        const response = await this.generateWithRetry(userMessage);
        return { response, toolsUsed: [], timestamp: new Date().toISOString() };
      }
      const address = addressMatch[0];
      console.log(`🔍 Analyzing address: ${address}`);
      if (requestedChain) {
          console.log(`⛓️ User requested specific chain: ${requestedChain}`);
      }
      console.log(`🧭 Detected intent: ${intent}`);
      const chainsToQuery = await this.getActiveChains(address, requestedChain);
      console.log(`📍 Chains to query: ${chainsToQuery.map(c => c.chain).join(', ')}`);
      if (intent === 'transactions') {
          const txPromises = chainsToQuery.map(async ({ chain }) => {
              const nativeSymbol = chain === 'eth' ? 'ETH' : chain === 'polygon' ? 'MATIC' : chain === 'gnosis' ? 'xDAI' : 'ETH'; 
              try {
                  console.log(`🔍 Fetching transactions for ${address} on ${chain} via API...`);
                  const res = await this.blockscoutAPI.getAddressTransactions(address, chain);
                  return { chain, success: res.success, data: res.data, error: res.error, nativeSymbol };
              } catch (e) {
                  console.log(`⚠️ Unexpected error fetching txs for ${chain}: ${e.message}`);
                  return { chain, success: false, data: null, error: e.message, nativeSymbol };
              }
          });
          const txResults = await Promise.all(txPromises);
          const prompt = this.buildTransactionsPrompt(userMessage, address, txResults, requestedChain);
          const response = await this.generateWithRetry(prompt);
          return {
              response,
              toolsUsed: ['getAddress', 'getAddressTransactions'],
              timestamp: new Date().toISOString()
          };
      }
      console.log(`⚙️ Handling intent '${intent}' by fetching data for relevant chains...`);
      const perChainPromises = chainsToQuery.map(c => this.fetchChainData(address, c.chain));
      const perChainData = await Promise.all(perChainPromises);
      const prompt = this.buildAnalysisPrompt(userMessage, address, perChainData, requestedChain);
      const response = await this.generateWithRetry(prompt);
      return {
        response,
        toolsUsed: ['getAddress', 'getAddressTokens'],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error in Gemini Agent chat:', error);
      return {
        response: "I'm sorry, but I encountered a critical error while processing your request. Please try again later.",
        toolsUsed: [],
        timestamp: new Date().toISOString()
      };
    }
  }
  getHistory() { return []; }
  clearHistory() {}
}
let geminiAgent = null;
export function getGeminiAgent() {
  if (!geminiAgent) {
    const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.GEMINI_API_KEY : undefined;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found in environment variables');
    }
    geminiAgent = new GeminiAgent(apiKey);
  }
  return geminiAgent;
}
export default GeminiAgent;