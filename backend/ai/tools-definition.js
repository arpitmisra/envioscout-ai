export const BLOCKCHAIN_TOOLS = [
  {
    name: 'get_address',
    description: 'Get detailed information about a blockchain address including balance, transaction count, and metadata',
    parameters: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'The blockchain address to query (e.g., 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb)'
        },
        chain: {
          type: 'string',
          description: 'The blockchain network',
          enum: ['eth', 'polygon', 'gnosis', 'optimism', 'base', 'arbitrum'],
          default: 'eth'
        }
      },
      required: ['address']
    }
  },
  {
    name: 'get_address_transactions',
    description: 'Get transaction history for a specific address',
    parameters: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'The blockchain address'
        },
        chain: {
          type: 'string',
          description: 'The blockchain network',
          default: 'eth'
        },
        filter: {
          type: 'string',
          description: 'Filter transactions by type',
          enum: ['to', 'from', 'to | from'],
          default: 'to | from'
        }
      },
      required: ['address']
    }
  },
  {
    name: 'get_address_tokens',
    description: 'Get token holdings for an address',
    parameters: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'The blockchain address'
        },
        chain: {
          type: 'string',
          description: 'The blockchain network',
          default: 'eth'
        },
        type: {
          type: 'string',
          description: 'Token standard',
          enum: ['ERC-20', 'ERC-721', 'ERC-1155'],
          default: 'ERC-20'
        }
      },
      required: ['address']
    }
  },
  {
    name: 'get_transaction',
    description: 'Get detailed information about a specific transaction',
    parameters: {
      type: 'object',
      properties: {
        tx_hash: {
          type: 'string',
          description: 'The transaction hash'
        },
        chain: {
          type: 'string',
          description: 'The blockchain network',
          default: 'eth'
        }
      },
      required: ['tx_hash']
    }
  },
  {
    name: 'get_block',
    description: 'Get information about a specific block',
    parameters: {
      type: 'object',
      properties: {
        block_number: {
          type: 'string',
          description: 'The block number or "latest"'
        },
        chain: {
          type: 'string',
          description: 'The blockchain network',
          default: 'eth'
        }
      },
      required: ['block_number']
    }
  },
  {
    name: 'get_smart_contract',
    description: 'Get smart contract details including source code and ABI',
    parameters: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'The contract address'
        },
        chain: {
          type: 'string',
          description: 'The blockchain network',
          default: 'eth'
        }
      },
      required: ['address']
    }
  },
  {
    name: 'get_token',
    description: 'Get token information including supply, holders, and metadata',
    parameters: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'The token contract address'
        },
        chain: {
          type: 'string',
          description: 'The blockchain network',
          default: 'eth'
        }
      },
      required: ['address']
    }
  },
  {
    name: 'search',
    description: 'Search for addresses, transactions, blocks, or tokens',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (address, tx hash, block number, token name)'
        },
        chain: {
          type: 'string',
          description: 'The blockchain network',
          default: 'eth'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_chain_stats',
    description: 'Get blockchain statistics including gas prices, market cap, etc.',
    parameters: {
      type: 'object',
      properties: {
        chain: {
          type: 'string',
          description: 'The blockchain network',
          default: 'eth'
        }
      }
    }
  }
];

export function formatToolsForPrompt(tools) {
  return tools.map(tool => {
    const params = tool.parameters?.properties 
      ? Object.entries(tool.parameters.properties)
          .map(([key, val]) => `  - ${key} (${val.type}): ${val.description}`)
          .join('\n')
      : '  No parameters';
    
    return `**${tool.name}**\n${tool.description}\nParameters:\n${params}`;
  }).join('\n\n');
}