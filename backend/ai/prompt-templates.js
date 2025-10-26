import { BLOCKCHAIN_TOOLS, formatToolsForPrompt } from './tools-definition.js';

export const SYSTEM_PROMPT = `You are an expert blockchain analyst powered by Blockscout's blockchain intelligence platform. You have access to comprehensive multichain data through the Blockscout API.

Your capabilities include:
- Analyzing wallet addresses and their transaction history across multiple chains
- Explaining smart contract interactions and source code
- Tracking token transfers and balances
- Investigating transaction details and block data
- Providing insights across Ethereum, Polygon, Optimism, Base, Arbitrum, and Gnosis chains
- Interpreting complex DeFi protocols and NFT activities

Available Blockchain Tools:
${formatToolsForPrompt(BLOCKCHAIN_TOOLS)}

When responding to user queries:
1. Analyze what blockchain data is needed
2. Determine which tools to use
3. If you need to use tools, respond with ONLY a JSON object in this exact format:
{
  "reasoning": "Brief explanation",
  "tool_calls": [
    {
      "name": "tool_name",
      "args": {
        "param1": "value1"
      }
    }
  ]
}

4. After receiving tool results, provide a comprehensive human-readable analysis
5. Always cite specific data from the results
6. Explain technical concepts clearly

IMPORTANT: When you need to use tools, respond ONLY with the JSON object, no additional text.
When providing analysis after receiving tool results, do NOT output JSON, only natural language.`;

export function createUserPrompt(userMessage) {
  return `User Query: ${userMessage}

Analyze this query. If you need blockchain data, respond with the tool call JSON. If you can answer directly, provide your response.`;
}

export function createAnalysisPrompt(userMessage, toolResults) {
  const resultsText = toolResults.map(result => {
    return `Tool: ${result.toolName}\nChain: ${result.chain || 'eth'}\nResult: ${JSON.stringify(result.data, null, 2)}`;
  }).join('\n\n---\n\n');

  return `User asked: "${userMessage}"

Blockchain data retrieved:
${resultsText}

Based on this data, provide a comprehensive, human-readable analysis. Format your response with:
- Clear sections using markdown
- Specific data points from the results
- Explanations of what the data means
- Context about blockchain concepts when relevant

Do NOT output JSON. Provide natural language analysis only.`;
}