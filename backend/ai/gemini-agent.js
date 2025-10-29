import { GoogleGenerativeAI } from '@google/generative-ai';
import { getBlockscoutAPI } from '../blockscout/blockscout-api.js';
import { getEnvioService } from '../envio/envio-service.js';
class GeminiAgent {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',  
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    });
    this.blockscoutAPI = getBlockscoutAPI();
  }
  async initialize() {
    console.log('✅ Gemini Agent initialized with Blockscout API');
  }
  async generateWithRetry(prompt, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await this.model.generateContent(prompt);
        return result.response.text();
      } catch (error) {
        console.log(`⚠️ Attempt ${i + 1} failed: ${error.message}`);
        if (error.status === 503 && i < maxRetries - 1) {
          const waitTime = Math.pow(2, i) * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else if (i === maxRetries - 1) {
          throw error;
        }
      }
    }
  }
  parseUserIntent(message) {
    const msg = message.toLowerCase();
    if ((msg.includes('analyze') || msg.includes('analyse') || msg.includes('analysis')) && 
        (msg.includes('contract') || msg.includes('smartcontract')) &&
        (msg.includes('on base') || msg.includes('on polygon') || msg.includes('on eth') || 
         msg.includes('on optimism') || msg.includes('on arbitrum'))) {
      return 'contract_analysis';
    }
    if (msg.includes('gas') && (msg.includes('fee') || msg.includes('price') || msg.includes('cost'))) {
      return 'gas_fees';
    }
    if (msg.includes('block') || msg.includes('recent blocks') || msg.match(/recent \d+ blocks/)) {
      return 'blocks';
    }
    if (msg.includes('transaction') || msg.includes('tx') || 
        msg.includes('transfers') || msg.includes('recent activity')) {
      return 'transactions';
    }
    if (msg.includes('analy') || msg.includes('analyse') || msg.includes('analysis')) {
      return 'analysis';
    }
    if (msg.includes('token') || msg.includes('balance') ||
        msg.includes('holdings') || msg.includes('assets')) {
      return 'tokens';
    }
    return 'general';
  }
  formatTokenBalance(value, decimals) {
    try {
      const numValue = BigInt(value || '0');
      const numDecimals = parseInt(decimals || '18', 10);
      const divisor = BigInt(10 ** numDecimals);
      const wholePart = numValue / divisor;
      const fractionalPart = numValue % divisor;
      const balance = Number(wholePart) + (Number(fractionalPart) / Number(divisor));
      return balance;
    } catch (e) {
      console.error('Error formatting balance:', e);
      return 0;
    }
  }
  async findActiveChains(address) {
    const chains = ['polygon', 'eth', 'base', 'optimism', 'arbitrum'];
    const active = [];
    for (const chain of chains) {
      try {
        console.log(`🔍 Checking ${chain}...`);
        const result = await this.blockscoutAPI.getAddress(address, chain);
        if (result.success && result.data) {
          const hasBalance = result.data.coin_balance && result.data.coin_balance !== '0';
          const hasTokens = result.data.has_token_transfers;
          if (hasBalance || hasTokens) {
            active.push({ chain, data: result.data });
            console.log(`✅ Found active address on ${chain}`);
          }
        }
      } catch (error) {
        console.log(`⚠️ ${chain} check failed, continuing...`);
      }
    }
    if (active.length === 0) {
      active.push({ chain: 'polygon', data: null });
    }
    return active;
  }
  async getRecentBlocks(chain, count = 5) {
    try {
      console.log(`🔍 Fetching recent ${count} blocks for ${chain} using blocks list endpoint...`);
      const endpoint = this.blockscoutAPI.getEndpoint(chain);
      const response = await this.blockscoutAPI.client.get(`${endpoint}/blocks`, {
        params: {
          type: 'block' 
        }
      });
      if (response.data && response.data.items && Array.isArray(response.data.items)) {
        const blocks = response.data.items.slice(0, count);
        console.log(`✅ Successfully fetched ${blocks.length} recent blocks`);
        return { success: true, blocks };
      }
      throw new Error('No blocks found in API response');
    } catch (error) {
      console.error(`⚠️ Failed to fetch recent blocks: ${error.message}`);
      return { success: false, error: error.message, blocks: [] };
    }
  }
  async chat(userMessage) {
    try {
      console.log(`💬 User query: ${userMessage}`);
      const lowerMsg = userMessage.toLowerCase();
      const intent = this.parseUserIntent(userMessage);
      console.log(`🧭 Detected intent: ${intent}`);
      let requestedChain = null;
      if (lowerMsg.includes(' on base') || lowerMsg.includes(' base')) requestedChain = 'base';
      else if (lowerMsg.includes(' on polygon') || lowerMsg.includes(' polygon')) requestedChain = 'polygon';
      else if (lowerMsg.includes(' on eth') || lowerMsg.includes(' ethereum')) requestedChain = 'eth';
      else if (lowerMsg.includes(' on optimism') || lowerMsg.includes(' optimism')) requestedChain = 'optimism';
      else if (lowerMsg.includes(' on arbitrum') || lowerMsg.includes(' arbitrum')) requestedChain = 'arbitrum';
      if (intent === 'blocks') {
        const chainForBlocks = requestedChain || 'eth';
        let blockCount = 5;
        const countMatch = userMessage.match(/(\d+)\s*blocks?/i);
        if (countMatch && countMatch[1]) {
          blockCount = Math.max(1, Math.min(10, parseInt(countMatch[1], 10)));
          console.log(`📊 User requested ${blockCount} blocks.`);
        } else {
          console.log(`📊 Defaulting to ${blockCount} blocks.`);
        }
        const result = await this.getRecentBlocks(chainForBlocks, blockCount);
        if (!result.success || result.blocks.length === 0) {
          return { 
            response: `Sorry, I couldn't fetch recent blocks from ${chainForBlocks}. ${result.error || 'The API might be temporarily unavailable.'}`, 
            toolsUsed: ['getBlocks'], 
            timestamp: new Date().toISOString() 
          };
        }
        console.log(`🤖 Generating AI analysis for ${result.blocks.length} blocks...`);
        const prompt = this.buildBlocksPrompt(userMessage, chainForBlocks, result.blocks);
        const response = await this.generateWithRetry(prompt);
        console.log(`✅ AI analysis complete.`);
        return { 
          response, 
          toolsUsed: ['getBlocks'], 
          timestamp: new Date().toISOString() 
        };
      }
      if (intent === 'gas_fees') {
        const chainForGas = requestedChain || 'eth';
        console.log(`⛽ Fetching gas fee data for ${chainForGas} from Blockscout...`);
        try {
          const gasPriceResult = await this.blockscoutAPI.getGasPrice(chainForGas);
          
          if (!gasPriceResult.success || !gasPriceResult.gasPrices) {
            return {
              response: `Sorry, I couldn't fetch current gas fee data for ${chainForGas.toUpperCase()}. ${gasPriceResult.error || 'The network might be temporarily unavailable.'}`,
              toolsUsed: ['getGasFees'],
              timestamp: new Date().toISOString()
            };
          }
          
          const { slow, average, fast } = gasPriceResult.gasPrices;
          const nativeSymbols = { eth: 'ETH', polygon: 'POL', base: 'ETH', optimism: 'ETH', arbitrum: 'ETH' };
          const symbol = nativeSymbols[chainForGas] || chainForGas.toUpperCase();
          
          const prompt = this.buildGasFeesPromptFromBlockscout(userMessage, chainForGas, slow, average, fast, symbol);
          const response = await this.generateWithRetry(prompt);
          console.log(`✅ Gas fee analysis complete: Standard = ${average} Gwei`);
          
          return {
            response,
            toolsUsed: ['getGasFees'],
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          console.error(`❌ Failed to fetch gas fees: ${error.message}`);
          return {
            response: `Sorry, I encountered an error fetching gas fee data for ${chainForGas.toUpperCase()}: ${error.message}`,
            toolsUsed: ['getGasFees'],
            timestamp: new Date().toISOString()
          };
        }
      }
      const addressMatch = userMessage.match(/0x[a-fA-F0-9]{40}/);
      if (!addressMatch) {
        console.log('💬 General question (no address, no special intent)');
        const systemPrompt = `You are EnvioScout AI, a blockchain analytics assistant with REAL-TIME access to blockchain data.

**YOUR CAPABILITIES:**
- I have DIRECT access to Envio HyperSync for real-time blockchain data
- I can fetch current gas fees, recent blocks, and network statistics  
- I support Ethereum, Polygon, Optimism, Base, and Arbitrum networks
- I use Blockscout API for address and transaction analysis

**IMPORTANT INSTRUCTIONS:**
- NEVER say "I can't access real-time data" - I CAN and DO have real-time access
- NEVER suggest external websites or tools - I have the data built-in
- For gas fees, I will fetch current data from Envio HyperSync
- For blockchain queries, I use live APIs, not historical estimates
- Always provide helpful, accurate information based on my actual capabilities

**User Question:** ${userMessage}

Provide a helpful response. If the question is about gas fees, recent blocks, or blockchain data, acknowledge that you have access and offer to help.`;
        
        const response = await this.generateWithRetry(systemPrompt);
        return {
          response,
          toolsUsed: [],
          timestamp: new Date().toISOString()
        };
      }
      const address = addressMatch[0];
      console.log(`🔍 Analyzing address: ${address}`);
      console.log(`🧭 Intent: ${intent}, Chain: ${requestedChain || 'any'}`);
      if (intent === 'contract_analysis') {
        if (!requestedChain) {
          return {
            response: "Please specify which network to analyze the contract on (e.g., 'analyze contract on base network')",
            toolsUsed: [],
            timestamp: new Date().toISOString()
          };
        }
        console.log(`🔍 Analyzing contract on ${requestedChain.toUpperCase()}...`);
        try {
          const contractData = await this.blockscoutAPI.getSmartContract(address, requestedChain);
          const tokenData = await this.blockscoutAPI.getToken(address, requestedChain);
          const prompt = this.buildContractAnalysisPrompt(userMessage, address, requestedChain, contractData, tokenData);
          const response = await this.generateWithRetry(prompt);
          return {
            response,
            toolsUsed: ['getSmartContract', 'getToken'],
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          console.error(`Failed to analyze contract: ${error.message}`);
          return {
            response: `Failed to analyze contract on ${requestedChain}: ${error.message}`,
            toolsUsed: [],
            timestamp: new Date().toISOString()
          };
        }
      }
      const wantsTransactions = intent === 'transactions';
      const activeChains = await this.findActiveChains(address);
      console.log(`📍 Active chains: ${activeChains.map(c => c.chain).join(', ')}`);
      if (intent === 'transactions') {
          const logs = [];
          const chainsToQuery = requestedChain
            ? activeChains.filter(c => c.chain === requestedChain)
            : activeChains;
          logs.push(`➡️ Fetching transactions for ${chainsToQuery.length} chain(s): ${chainsToQuery.map(c=>c.chain).join(', ')}`);
          const txPromises = chainsToQuery.map(async ({ chain }) => { 
              const nativeSymbols = { eth: 'ETH', polygon: 'MATIC', base: 'ETH', optimism: 'ETH', arbitrum: 'ETH', gnosis: 'xDAI' };
              const nativeSymbol = nativeSymbols[chain] || chain.toUpperCase();
              try {
                  const logTxFetch = `🔍 Fetching transactions for ${address} on ${chain}...`;
                  console.log(logTxFetch); logs.push(logTxFetch);
                  const res = await this.blockscoutAPI.getAddressTransactions(address, chain); 
                  if (res.success) {
                      logs.push(`✅ Fetched ${res.data?.items?.length || 0} transactions for ${chain}.`);
                  } else {
                      logs.push(`⚠️ Failed to fetch transactions for ${chain}: ${res.error} (Status: ${res.status})`);
                  }
                  return { chain, success: res.success, data: res.data, error: res.error, nativeSymbol };
              } catch (e) {
                  const logTxErr = `❌ Unexpected error fetching txs for ${chain}: ${e.message}`;
                  console.log(logTxErr); logs.push(logTxErr);
                  return { chain, success: false, data: null, error: e.message, nativeSymbol };
              }
          }
        );
          const txResults = await Promise.all(txPromises);
          const logGen = '🤖 Generating AI analysis for transactions...'; console.log(logGen); logs.push(logGen);
          const prompt = this.buildTransactionsPrompt(userMessage, address, txResults, requestedChain); 
          const response = await this.generateWithRetry(prompt);
          logs.push(`✅ AI analysis complete.`);
          return {
              response,
              logs, 
              toolsUsed: ['getAddress', 'getAddressTransactions'], 
              timestamp: new Date().toISOString()
          };
      }
      const chainData = await Promise.all(
        activeChains.map(async ({ chain }) => {
          try {
            const addressInfo = await this.blockscoutAPI.getAddress(address, chain);
            const tokensData = await this.blockscoutAPI.getAddressTokens(address, chain);
            return {
              chain,
              addressInfo: addressInfo.data,
              tokensData: tokensData.data,
              success: true
            };
          } catch (e) {
            return {
              chain,
              addressInfo: null,
              tokensData: null,
              success: false,
              error: e.message
            };
          }
        })
      );
      const prompt = this.buildAnalysisPrompt(userMessage, address, chainData);
      const response = await this.generateWithRetry(prompt);
      return {
        response,
        toolsUsed: ['get_address', 'get_address_tokens'],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error in Gemini Agent:', error);
      throw error;
    }
  }
  buildGasFeesPromptFromBlockscout(userMessage, chain, slow, average, fast, symbol) {
    let prompt = `You are a blockchain data assistant helping users understand current gas fees.\n\n`;
    prompt += `User Question: "${userMessage}"\n\n`;
    prompt += `## Current Gas Fee Information for ${chain.toUpperCase()} Network\n\n`;
    prompt += `**Real-Time Gas Prices (from Blockscout):**\n`;
    prompt += `- 🐢 Slow/Low: ${slow.toFixed(3)} Gwei\n`;
    prompt += `- ⚡ Standard/Average: ${average.toFixed(3)} Gwei\n`;
    prompt += `- 🚀 Fast/Rapid: ${fast.toFixed(3)} Gwei\n\n`;
    prompt += `---\n\n`;
    prompt += `## STRICT RESPONSE INSTRUCTIONS:\n\n`;
    prompt += `**REQUIRED:**\n`;
    prompt += `1. State the current STANDARD gas price: "${average.toFixed(3)} Gwei"\n`;
    prompt += `2. Mention the range: Low (${slow.toFixed(3)}), Standard (${average.toFixed(3)}), Fast (${fast.toFixed(3)})\n`;
    prompt += `3. Provide context about whether this is high, medium, or low\n`;
    prompt += `4. Credit Blockscout API for this real-time data\n\n`;
    prompt += `**CONTEXT FOR GAS FEES:**\n`;
    prompt += `- For Ethereum: <1 Gwei = Very Low, 1-20 Gwei = Low, 20-50 Gwei = Medium, 50-100 Gwei = High, >100 Gwei = Very High\n`;
    prompt += `- For Polygon: <30 Gwei = Low, 30-80 Gwei = Medium, 80-150 Gwei = High, >150 Gwei = Very High\n`;
    prompt += `- For Base/Optimism/Arbitrum: <0.01 Gwei = Low, 0.01-0.1 Gwei = Medium, >0.1 Gwei = High\n\n`;
    prompt += `**ABSOLUTELY FORBIDDEN:**\n`;
    prompt += `- DO NOT generate code examples\n`;
    prompt += `- DO NOT suggest external websites or tools\n`;
    prompt += `- DO NOT apologize for data being outdated - this is real-time from Blockscout\n`;
    prompt += `- DO NOT provide historical trends\n\n`;
    prompt += `**Response Format:**\n`;
    prompt += `Write in natural, conversational language. Be concise (2-4 sentences). Focus on the STANDARD gas price.\n`;
    return prompt;
  }
  buildGasFeesPrompt(userMessage, chain, lowGwei, standardGwei, fastGwei, symbol, latestBlock, blocksAnalyzed) {
    let prompt = `You are a blockchain data assistant helping users understand current gas fees.\n\n`;
    prompt += `User Question: "${userMessage}"\n\n`;
    prompt += `## Current Gas Price Recommendations for ${chain.toUpperCase()} Network\n\n`;
    prompt += `**Latest Block Data:**\n`;
    prompt += `- Block Number: ${latestBlock.number || 'N/A'}\n`;
    prompt += `- Timestamp: ${latestBlock.timestamp ? new Date(latestBlock.timestamp).toLocaleString() : 'N/A'}\n`;
    prompt += `- Blocks Analyzed: ${blocksAnalyzed}\n\n`;
    prompt += `**Gas Price Recommendations (based on average Base Fee):**\n`;
    prompt += `- 🐢 Low (Slow): ${lowGwei.toFixed(3)} Gwei (~30 seconds)\n`;
    prompt += `- ⚡ Standard (Average): ${standardGwei.toFixed(3)} Gwei (~15 seconds)\n`;
    prompt += `- 🚀 Fast (Priority): ${fastGwei.toFixed(3)} Gwei (~5 seconds)\n`;
    prompt += `\n---\n\n`;
    prompt += `## STRICT RESPONSE INSTRUCTIONS:\n\n`;
    prompt += `**REQUIRED:**\n`;
    prompt += `1. State the STANDARD gas price clearly as the main answer: "${standardGwei.toFixed(3)} Gwei"\n`;
    prompt += `2. Optionally mention low/fast options if relevant to user's question\n`;
    prompt += `3. Classify as Low/Medium/High based on the ranges below\n`;
    prompt += `4. Mention this is based on ${blocksAnalyzed} recent blocks from ${chain.toUpperCase()}\n`;
    prompt += `5. Credit Envio HyperSync for providing this real-time data\n\n`;
    prompt += `**CONTEXT FOR GAS PRICE CLASSIFICATION:**\n`;
    prompt += `- Ethereum: <5 Gwei = Very Low, 5-20 Gwei = Low, 20-50 Gwei = Medium, 50-100 Gwei = High, >100 Gwei = Very High\n`;
    prompt += `- Polygon: <30 Gwei = Low, 30-80 Gwei = Medium, 80-150 Gwei = High, >150 Gwei = Very High\n`;
    prompt += `- Base/Optimism/Arbitrum: <0.01 Gwei = Very Low, 0.01-0.1 Gwei = Low, 0.1-1 Gwei = Medium, >1 Gwei = High\n\n`;
    prompt += `**ABSOLUTELY FORBIDDEN:**\n`;
    prompt += `- DO NOT generate code examples\n`;
    prompt += `- DO NOT suggest using web3 tools, Metamask, or wallets\n`;
    prompt += `- DO NOT apologize for data being outdated - this is REAL-TIME data from recent blocks\n`;
    prompt += `- DO NOT provide made-up numbers - use ONLY the values provided above\n\n`;
    prompt += `**Response Format:**\n`;
    prompt += `Keep it conversational and concise (2-3 sentences). Focus on the standard gas price and whether it's a good time to transact.\n`;
    return prompt;
  }
  buildBlocksPrompt(userMessage, chain, blocksData) {
    let prompt = `You are a blockchain data assistant helping users understand blockchain block information.\n\n`;
    prompt += `User Question: "${userMessage}"\n\n`;
    const blocks = blocksData || [];
    if (blocks.length === 0) {
      prompt += `## No Block Data Available\n\n`;
      prompt += `Unfortunately, no recent block data could be retrieved from the ${chain.toUpperCase()} network at this time. `;
      prompt += `This could be due to API connectivity issues or temporary unavailability.\n\n`;
      prompt += `**Your Response Instructions:**\n`;
      prompt += `- Inform the user that block data couldn't be retrieved\n`;
      prompt += `- Keep your response brief and helpful\n`;
      prompt += `- Do NOT provide code examples or technical workarounds\n`;
      return prompt;
    }
    blocks.sort((a, b) => (b.height ?? 0) - (a.height ?? 0));
    prompt += `## Recent Blocks from ${chain.toUpperCase()} Network\n\n`;
    prompt += `Successfully retrieved ${blocks.length} recent block(s):\n\n`;
    prompt += `| Block # | Timestamp | Transactions | Gas Used | Hash (Short) |\n`;
    prompt += `|---------|-----------|--------------|----------|---------------|\n`;
    blocks.forEach(block => {
      const blockNum = block.height ?? 'N/A';
      const timestamp = block.timestamp 
        ? new Date(block.timestamp).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })
        : 'N/A';
      const txCount = block.tx_count ?? 0;
      const gasUsed = block.gas_used 
        ? parseInt(block.gas_used, 10).toLocaleString() 
        : 'N/A';
      const hashShort = block.hash 
        ? `${block.hash.substring(0, 10)}...${block.hash.substring(block.hash.length - 8)}`
        : 'N/A';
      prompt += `| ${blockNum} | ${timestamp} | ${txCount} | ${gasUsed} | ${hashShort} |\n`;
    });
    prompt += `\n---\n\n`;
    prompt += `## STRICT RESPONSE INSTRUCTIONS:\n\n`;
    prompt += `**REQUIRED:**\n`;
    prompt += `1. Present the block data table exactly as shown above\n`;
    prompt += `2. Add a friendly 1-2 sentence introduction before the table\n`;
    prompt += `3. Optionally add 1-2 brief observations about the blocks (e.g., transaction volume, time between blocks)\n`;
    prompt += `4. Credit Blockscout API for providing this data\n\n`;
    prompt += `**ABSOLUTELY FORBIDDEN:**\n`;
    prompt += `- DO NOT generate any Python, JavaScript, or code in ANY programming language\n`;
    prompt += `- DO NOT suggest using web3, ethers.js, Infura, or any development tools\n`;
    prompt += `- DO NOT explain how to fetch this data programmatically\n`;
    prompt += `- DO NOT apologize for data being "slightly outdated"\n`;
    prompt += `- DO NOT say you "cannot access live data" - the data is already provided above\n`;
    prompt += `- DO NOT add fields or data not present in the table above\n\n`;
    prompt += `**Response Format:**\n`;
    prompt += `Write in natural, conversational language. Present the table clearly. Keep it concise and user-friendly.\n`;
    return prompt;
  }
  buildTransactionsPrompt(userMessage, address, txResults) {
    const nativeSymbols = {
      eth: 'ETH',
      polygon: 'POL',
      base: 'ETH',
      optimism: 'ETH',
      arbitrum: 'ETH'
    };
    let prompt = `User asked: "${userMessage}"\n\n`;
    prompt += `# Transaction History for ${address}\n\n`;
    for (const result of txResults) {
      const { chain, success, data, error } = result;
      const symbol = nativeSymbols[chain] || chain.toUpperCase();
      prompt += `## ${chain.toUpperCase()} Network\n`;
      if (!success || error) {
        prompt += `Error: ${error || 'Unknown error'}\n\n`;
        continue;
      }
      if (!data || !data.items || data.items.length === 0) {
        prompt += `No transactions found.\n\n`;
        continue;
      }
      prompt += `Found ${data.items.length} recent transactions:\n\n`;
      data.items.slice(0, 10).forEach((tx, i) => {
        const value = this.formatTokenBalance(tx.value || '0', 18);
        prompt += `${i + 1}. **Hash:** ${tx.hash || 'N/A'}\n`;
        prompt += `   - From: ${tx.from?.hash || 'N/A'}\n`;
        prompt += `   - To: ${tx.to?.hash || 'N/A'}\n`;
        prompt += `   - Value: ${value.toFixed(6)} ${symbol}\n`;
        prompt += `   - Time: ${tx.timestamp || 'N/A'}\n`;
        prompt += `   - Status: ${tx.status || 'N/A'}\n\n`;
      });
    }
    prompt += `\n## Instructions\n`;
    prompt += `Provide a clear, concise summary of the transaction history with:\n`;
    prompt += `1. Total transactions per chain\n`;
    prompt += `2. Recent activity highlights\n`;
    prompt += `3. Notable patterns or large transfers\n`;
    prompt += `Use natural language and proper formatting.`;
    return prompt;
  }
  buildAnalysisPrompt(userMessage, address, chainData) {
    const nativeSymbols = {
      eth: 'ETH',
      polygon: 'POL',
      base: 'ETH',
      optimism: 'ETH',
      arbitrum: 'ETH'
    };
    let prompt = `User asked: "${userMessage}"\n\n`;
    prompt += `# Wallet Analysis for ${address}\n\n`;
    for (const data of chainData) {
      const { chain, addressInfo, tokensData, success, error } = data;
      const symbol = nativeSymbols[chain] || chain.toUpperCase();
      prompt += `## ${chain.toUpperCase()} Network\n`;
      if (!success || error) {
        prompt += `Error: ${error || 'Unknown error'}\n\n`;
        continue;
      }
      if (addressInfo && addressInfo.coin_balance) {
        const balance = this.formatTokenBalance(addressInfo.coin_balance, 18);
        prompt += `**Native Balance:** ${balance.toFixed(6)} ${symbol}\n\n`;
      }
      if (tokensData && tokensData.items && tokensData.items.length > 0) {
        prompt += `**Token Holdings (${tokensData.items.length} tokens):**\n\n`;
        tokensData.items.forEach((item, i) => {
          const token = item.token || {};
          const balance = this.formatTokenBalance(item.value || '0', token.decimals || 18);
          if (balance === 0) return;
          prompt += `${i + 1}. **${token.name || 'Unknown'}** (${token.symbol || '???'})\n`;
          prompt += `   - Balance: ${balance.toFixed(8)} ${token.symbol || ''}\n`;
          if (token.exchange_rate && balance > 0) {
            const usdValue = balance * parseFloat(token.exchange_rate);
            prompt += `   - USD Value: $${usdValue.toFixed(2)}\n`;
          }
          prompt += `\n`;
        });
      } else {
        prompt += `No ERC-20 tokens found.\n\n`;
      }
    }
    prompt += `\n## Instructions\n`;
    prompt += `Provide a comprehensive analysis with:\n`;
    prompt += `1. Summary of holdings per chain\n`;
    prompt += `2. List all tokens with exact balances\n`;
    prompt += `3. USD values where available\n`;
    prompt += `4. Notable observations\n\n`;
    prompt += `Use ONLY the data provided. Be accurate and clear. Use markdown formatting.`;
    return prompt;
  }
  buildContractAnalysisPrompt(userMessage, address, chain, contractData, tokenData) {
    let prompt = `Smart Contract Analysis Request: "${userMessage}"\n\n`;
    prompt += `Analyzing contract ${address} on ${chain.toUpperCase()} network\n\n`;
    prompt += `## Smart Contract Information\n`;
    if (contractData?.success && contractData.data) {
      const contract = contractData.data;
      prompt += `- Name: ${contract.name || 'Not Available'}\n`;
      prompt += `- Verified: ${contract.is_verified ? 'Yes' : 'No'}\n`;
      if (contract.is_verified) {
        prompt += `- Verification Date: ${contract.verified_at || 'N/A'}\n`;
        prompt += `- Compiler Version: ${contract.compiler_version || 'N/A'}\n`;
        prompt += `- Optimization: ${contract.optimization_enabled ? 'Enabled' : 'Disabled'}\n`;
        prompt += `- EVM Version: ${contract.evm_version || 'N/A'}\n`;
        if (contract.abi && Array.isArray(contract.abi)) {
          const functions = contract.abi.filter(item => item.type === 'function').length;
          const events = contract.abi.filter(item => item.type === 'event').length;
          prompt += `- Functions Found: ${functions}\n`;
          prompt += `- Events Found: ${events}\n`;
        }
      }
      prompt += `- Is Proxy: ${contract.is_proxy ? 'Yes' : 'No'}\n`;
      if (contract.is_proxy && contract.implementation_address) {
        prompt += `  - Implementation Address: ${contract.implementation_address}\n`;
        prompt += `  - Implementation Name: ${contract.implementation_name || 'N/A'}\n`;
      }
    } else {
      prompt += `Failed to fetch contract data: ${contractData?.error || 'Unknown error'}\n`;
    }
    prompt += `\n## Token Information\n`;
    if (tokenData?.success && tokenData.data) {
      const token = tokenData.data;
      prompt += `- Token Type: ${token.type || 'N/A'}\n`;
      prompt += `- Name: ${token.name || 'N/A'}\n`;
      prompt += `- Symbol: ${token.symbol || 'N/A'}\n`;
      prompt += `- Decimals: ${token.decimals || 'N/A'}\n`;
      if (token.total_supply) {
        const totalSupply = this.formatTokenBalance(token.total_supply, token.decimals);
        prompt += `- Total Supply: ${totalSupply.toLocaleString()} ${token.symbol}\n`;
      }
      prompt += `- Holders: ${token.holders || 'N/A'}\n`;
      if (token.circulating_market_cap) {
        prompt += `- Market Cap: $${parseFloat(token.circulating_market_cap).toLocaleString()}\n`;
      }
    } else if (tokenData?.status === 404) {
      prompt += `This address is not recognized as a standard token contract.\n`;
    } else {
      prompt += `Failed to fetch token data: ${tokenData?.error || 'Unknown error'}\n`;
    }
    prompt += `\n## Analysis Instructions\n`;
    prompt += `Based on the above data from ${chain.toUpperCase()} network, provide a detailed analysis:\n`;
    prompt += `1. Contract type and purpose\n`;
    prompt += `2. Key features and functionality\n`;
    prompt += `3. Token details (if applicable)\n`;
    prompt += `4. Notable characteristics\n`;
    prompt += `5. Security considerations\n\n`;
    prompt += `Format the response with markdown headers and bullet points.\n`;
    prompt += `Focus ONLY on data from ${chain.toUpperCase()} network.\n`;
    return prompt;
  }
  clearHistory() {}
  getHistory() { return []; }
}
let geminiAgent = null;
export function getGeminiAgent() {
  if (!geminiAgent) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found in environment variables');
    }
    geminiAgent = new GeminiAgent(apiKey);
  }
  return geminiAgent;
}
export default GeminiAgent;