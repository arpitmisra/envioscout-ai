import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import MessageBubble from './MessageBubble';
import LoadingIndicator from './LoadingIndicator';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
function ChatInterface() {
  const DEFAULT_PLACEHOLDER = 'Ask about addresses, transactions, contracts, or recent blocks...';
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark';
  });
  const [inputPlaceholder, setInputPlaceholder] = useState(DEFAULT_PLACEHOLDER);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('chat'); 
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardChain, setDashboardChain] = useState('eth');
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const quickActions = [
    { 
      icon: '📦', 
      text: 'Recent Blocks', 
      id: 'recent-blocks',
      message: 'Show me recent 5 blocks on ethereum',
      requiresWallet: false
    },
    { 
      icon: '💼', 
      text: 'Analyze Wallet', 
      id: 'analyze-wallet',
      message: walletAddress ? `Analyze the address ${walletAddress}` : 'Analyze the address   0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      requiresWallet: true
    },
    { 
      icon: '📊', 
      text: 'Transactions', 
      id: 'transactions',
      message: walletAddress ? `Get transaction history for ${walletAddress}` : 'Get transaction history for 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      requiresWallet: true
    },
    { 
      icon: '🔍', 
      text: 'Smart Contract', 
      id: 'smart-contract',
      message: 'Analyze contract 0xdAC17F958D2ee523a2206206994597C13D831ec7 on eth',
      requiresWallet: false
    },
    { 
      icon: '🔗', 
      text: 'Base Network', 
      id: 'base-blocks',
      message: 'Show me recent blocks on base',
      requiresWallet: false
    }
  ];
  const suggestions = [
    {
      title: '🔍 Explore Recent Blocks',
      desc: 'View the latest blocks on any chain',
      message: 'Show me the latest 3 blocks on polygon'
    },
    {
      title: '💡 Discover Capabilities',
      desc: 'Learn what I can analyze for you',
      message: 'What can you help me with?'
    }
  ];
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    const cls = 'light-theme';
    if (theme === 'light') {
      document.body.classList.add(cls);
    } else {
      document.body.classList.remove(cls);
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };
  const getNativeToken = (chain) => {
    const tokens = {
      eth: 'ETH',
      polygon: 'MATIC',
      base: 'ETH',
      arbitrum: 'ETH'
    };
    return tokens[chain] || 'ETH';
  };
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        } catch (error) {
          console.error('Error checking wallet connection:', error);
        }
      }
    };
    checkWalletConnection();
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        } else {
          setWalletAddress(null);
        }
      });
    }
    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
      }
    };
  }, []);
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask or another Web3 wallet to connect!');
      return;
    }
    setIsConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        const connectMessage = {
          role: 'assistant',
          content: `✅ Wallet connected successfully! Address: \`${accounts[0]}\`\n\nYou can now use "Analyze Wallet" and "Transactions" buttons to analyze your connected wallet.`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, connectMessage]);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      const errorMessage = {
        role: 'assistant',
        content: `⚠️ Failed to connect wallet: ${error.message}`,
        isError: true,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsConnecting(false);
    }
  };
  const disconnectWallet = () => {
    setWalletAddress(null);
    const disconnectMessage = {
      role: 'assistant',
      content: '👋 Wallet disconnected.',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, disconnectMessage]);
  };
  const handleSend = async (messageText = null) => {
    const userMessage = messageText || input.trim();
    if (!userMessage || isLoading) return;
    setInput('');
    setInputPlaceholder(DEFAULT_PLACEHOLDER);
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/chat/message`, {
        message: userMessage
      }, {
        timeout: 60000
      });
      if (response.data && response.data.success) {
        const assistantMessage = {
          role: 'assistant',
          content: response.data.response,
          toolsUsed: response.data.toolsUsed,
          timestamp: response.data.timestamp
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      let errorMsg = '⚠️ Sorry, I encountered an error processing your request. ';
      if (error.code === 'ECONNABORTED') {
        errorMsg += 'The request timed out. Please try again.';
      } else if (error.response?.status === 500) {
        errorMsg += 'There was a server error. Please try again in a moment.';
      } else if (error.response?.data?.message) {
        errorMsg += error.response.data.message;
      } else if (error.message) {
        errorMsg += error.message;
      } else {
        errorMsg += 'Please try again.';
      }
      const errorMessage = {
        role: 'assistant',
        content: errorMsg,
        isError: true,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  const handleClear = async () => {
    try {
      await axios.post(`${API_URL}/api/chat/clear`);
      setMessages([]);
      setInputPlaceholder(DEFAULT_PLACEHOLDER);
    } catch (error) {
      console.error('Error clearing conversation:', error);
    }
  };
  const handleEditMessage = (messageText) => {
    setInput(messageText);
    inputRef.current?.focus();
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const handleQuickAction = (action) => {
    if (action.requiresWallet && !walletAddress) {
      connectWallet();
      return;
    }
    if (action.id === 'smart-contract') {
      const template = 'Analyze contract ';
      setInput(template);
      setInputPlaceholder('Paste contract address (0x...) and optionally add "on <network>"');
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (el) {
          const pos = template.length;
          el.focus();
          el.setSelectionRange(pos, pos);
        }
      });
      const guidance = {
        role: 'assistant',
        content: '🔍 Smart contract analysis: Paste a contract address (e.g., `0x...`) and optionally a network, for example: `Analyze contract 0x... on eth`.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, guidance]);
      return;
    }
    handleSend(action.message);
  };
const fetchDashboardData = async () => {
  if (isDashboardLoading) {
    console.log('⏳ Already loading, skipping...');
    return;
  }
  setIsDashboardLoading(true);
  try {
    console.log('🔄 Fetching dashboard for:', dashboardChain);
    const response = await axios.get(
      `${API_URL}/api/dashboard/stats/${dashboardChain}`,
      { timeout: 10000 } 
    );
    console.log('📊 Response:', response.data);
    if (response.data.success) {
      const safeData = {
        ...response.data,
        blocks: (response.data.blocks || []).slice(0, 10) 
      };
      console.log(`✅ Setting ${safeData.blocks.length} blocks`);
      setDashboardData(safeData);
    } else {
      console.error('❌ Response not successful');
      setDashboardData({ blocks: [], error: 'No data available' });
    }
  } catch (error) {
    console.error('❌ Fetch error:', error);
    setDashboardData({ 
      blocks: [], 
      error: error.message || 'Failed to load data' 
    });
  } finally {
    setIsDashboardLoading(false);
  }
};
useEffect(() => {
  let mounted = true;
  let interval;
  if (activeTab === 'dashboard' && mounted) {
    fetchDashboardData();
    interval = setInterval(() => {
      if (mounted) fetchDashboardData();
    }, 15000); 
  }
  return () => {
    mounted = false;
    if (interval) clearInterval(interval);
    setIsDashboardLoading(false);
  };
}, [activeTab, dashboardChain]);
  return (
    <div className="glass-container">
      {}
      <div className="chat-header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo-icon">
              <img src="/favicon.svg" alt="EnvioScout AI" className="logo-img" />
            </div>
            <div className="header-text">
              <h1>EnvioScout AI</h1>
              <p>Powered by Envio HyperSync + Gemini AI + Blockscout API</p>
            </div>
          </div>
          <div className="header-right">
            <button 
              className="theme-toggle-btn" 
              onClick={toggleTheme}
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            {walletAddress ? (
              <div className="wallet-connected">
                <div className="wallet-address">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </div>
                <button 
                  className="wallet-disconnect-btn" 
                  onClick={disconnectWallet}
                  title="Disconnect Wallet"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button 
                className="wallet-connect-btn" 
                onClick={connectWallet}
                disabled={isConnecting}
              >
                {isConnecting ? 'Connecting...' : '🔌 Connect Wallet'}
              </button>
            )}
            <div className="status-badge">
              <div className="status-dot"></div>
              <span className="status-text">Online</span>
            </div>
            <div className="flex gap-2 ml-4">
  <button
    className={`px-4 py-2 rounded-lg transition-all ${
      activeTab === 'chat'
        ? 'bg-gradient-to-br from-white/20 to-white/10 border border-white/30'
        : 'bg-white/5 border border-white/10'
    }`}
    onClick={() => setActiveTab('chat')}
  >
    💬 Chat
  </button>
  <button
    className={`px-4 py-2 rounded-lg transition-all ${
      activeTab === 'dashboard'
        ? 'bg-gradient-to-br from-white/20 to-white/10 border border-white/30'
        : 'bg-white/5 border border-white/10'
    }`}
    onClick={() => setActiveTab('dashboard')}
  >
    📊 Dashboard
  </button>
</div>
          </div>
        </div>
      </div>
      {}
      <div className="quick-actions-section">
        <div className="quick-actions-title">Quick Actions</div>
        <div className="quick-actions-grid">
          {quickActions.map((action, index) => (
            <button 
              key={index}
              className={`action-chip ${action.requiresWallet && !walletAddress ? 'wallet-required' : ''}`}
              onClick={() => handleQuickAction(action)}
              disabled={isLoading}
              title={action.requiresWallet && !walletAddress ? 'Connect wallet to use this action' : ''}
            >
              {action.icon} {action.text}
              {action.requiresWallet && !walletAddress && (
                <span className="wallet-indicator"> 🔒</span>
              )}
            </button>
          ))}
        </div>
      </div>
      {}
      {activeTab === 'chat' ? (
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🌐</div>
              <h3>Welcome to GemScout AI</h3>
              <p>
                Your intelligent assistant for blockchain data analysis. 
                Ask about addresses, transactions, smart contracts, or recent blocks across multiple chains.
              </p>
              <div className="suggestions-grid">
                {suggestions.map((suggestion, index) => (
                  <button 
                    key={index}
                    className="suggestion-card" 
                    onClick={() => handleSend(suggestion.message)}
                    disabled={isLoading}
                  >
                    <div className="suggestion-title">{suggestion.title}</div>
                    <div className="suggestion-desc">{suggestion.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <MessageBubble key={index} message={message} onEdit={handleEditMessage} />
              ))}
              {isLoading && <LoadingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      ) : (
        <div className="messages-container overflow-y-auto">
    <div className="p-6 space-y-6">
      {}
      {(!dashboardData || !dashboardData.blocks) && !isDashboardLoading ? (
        <div className="text-center py-32">
          <div className="text-8xl mb-6 opacity-20">⚠️</div>
          <p className="text-white/70 text-xl mb-3">No data loaded</p>
          <button 
            onClick={fetchDashboardData}
            className="mt-8 px-8 py-3 bg-gradient-to-r from-teal-500/30 to-cyan-500/30 border border-teal-400/50 rounded-xl text-white"
          >
            🔄 Load Dashboard
          </button>
        </div>
      ) : null}
      {}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {['eth', 'polygon', 'base', 'arbitrum'].map(chain => (
          <button
            key={chain}
            className={`px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
              dashboardChain === chain
                ? 'bg-gradient-to-r from-teal-500/40 to-cyan-500/40 border-2 border-teal-400/60 text-white shadow-lg'
                : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
            onClick={() => setDashboardChain(chain)}
          >
            {chain.toUpperCase()}
          </button>
        ))}
      </div>
      {}
      {isDashboardLoading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-white/10 border-t-teal-400 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
          <p className="text-white/60 mt-6 text-lg">Loading {dashboardChain.toUpperCase()} data...</p>
        </div>
      ) : !dashboardData || dashboardData.error ? (
        <div className="text-center py-32">
          <div className="text-8xl mb-6 opacity-20">⚠️</div>
          <p className="text-white/70 text-xl mb-3">Failed to load dashboard data</p>
          <p className="text-white/50">{dashboardData?.error || 'Unable to connect to the API'}</p>
          <button 
            onClick={fetchDashboardData}
            className="mt-8 px-8 py-3 bg-gradient-to-r from-teal-500/30 to-cyan-500/30 border border-teal-400/50 rounded-xl text-white hover:from-teal-500/40 hover:to-cyan-500/40 transition-all"
          >
            🔄 Try Again
          </button>
        </div>
      ) : !dashboardData.blocks || dashboardData.blocks.length === 0 ? (
        <div className="text-center py-32">
          <div className="text-8xl mb-6 opacity-20">⚠️</div>
          <p className="text-white/70 text-xl mb-3">No data available</p>
          <p className="text-white/50">The Envio API might be temporarily unavailable for {dashboardChain.toUpperCase()}</p>
          <button 
            onClick={fetchDashboardData}
            className="mt-8 px-8 py-3 bg-gradient-to-r from-teal-500/30 to-cyan-500/30 border border-teal-400/50 rounded-xl text-white hover:from-teal-500/40 hover:to-cyan-500/40 transition-all"
          >
            🔄 Try Again
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl hover:scale-105 transition-transform">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">⚡</span>
                <p className="text-white/60 text-sm font-semibold">Avg Block Time</p>
              </div>
              <p className="text-3xl font-bold text-white">
                {dashboardData.metrics?.avgBlockTime || 'N/A'}s
              </p>
            </div>
            <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl hover:scale-105 transition-transform">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">🚀</span>
                <p className="text-white/60 text-sm font-semibold">TPS</p>
              </div>
              <p className="text-3xl font-bold text-white">
                {dashboardData.metrics?.tps || '0'}
              </p>
            </div>
            <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl hover:scale-105 transition-transform">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">💎</span>
                <p className="text-white/60 text-sm font-semibold">Total Txs</p>
              </div>
              <p className="text-3xl font-bold text-white">
                {dashboardData.metrics?.totalTxs?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl hover:scale-105 transition-transform">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">📈</span>
                <p className="text-white/60 text-sm font-semibold">Archive Height</p>
              </div>
              <p className="text-3xl font-bold text-white">
                {dashboardData.archiveHeight ? (dashboardData.archiveHeight / 1000000).toFixed(2) + 'M' : 'N/A'}
              </p>
            </div>
          </div>
          {}
          {dashboardData.gasStats && (
            <div className="bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">⛽</span>
                <h3 className="text-xl font-bold text-white">Gas Usage Analytics</h3>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-white/50 text-sm mb-2">Average Gas</p>
                  <p className="text-2xl font-bold text-teal-400">
                    {dashboardData.gasStats.average?.toLocaleString() || 'N/A'}
                  </p>
                </div>
                <div className="text-center border-x border-white/10">
                  <p className="text-white/50 text-sm mb-2">Peak Gas</p>
                  <p className="text-2xl font-bold text-orange-400">
                    {dashboardData.gasStats.max?.toLocaleString() || 'N/A'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-white/50 text-sm mb-2">Min Gas</p>
                  <p className="text-2xl font-bold text-green-400">
                    {dashboardData.gasStats.min?.toLocaleString() || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}
          {}
          <div className="bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🔥</span>
                <h3 className="text-xl font-bold text-white">Live Block Feed</h3>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-400/30 rounded-full">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400 text-xs font-semibold">LIVE</span>
              </div>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {dashboardData.blocks.map((block, index) => (
                <div 
                  key={block.hash || index} 
                  className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition-all hover:scale-102 hover:shadow-xl"
                  style={{ 
                    animation: `slideInRight 0.5s ease-out ${index * 0.1}s both`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">📦</span>
                        <div>
                          <p className="text-white font-bold text-lg">
                            Block #{block.number?.toLocaleString() || 'N/A'}
                          </p>
                          <p className="text-white/40 text-xs font-mono">
                            {block.hash ? `${block.hash.slice(0, 12)}...${block.hash.slice(-8)}` : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <p className="text-white/60 text-sm ml-11">
                        {block.timestamp ? new Date(block.timestamp).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="px-3 py-1 bg-teal-500/20 border border-teal-400/30 rounded-lg">
                        <p className="text-teal-400 text-sm font-bold">
                          {block.transactionCount || 0} txs
                        </p>
                      </div>
                      <p className="text-white/50 text-xs">
                        {block.size ? `${(block.size / 1024).toFixed(1)} KB` : 'N/A'}
                      </p>
                      <p className="text-white/40 text-xs">
                        Fee: {block.gasFee ? `${block.gasFee.toFixed(6)} ${getNativeToken(dashboardChain)}` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {}
          <div className="flex items-center justify-between text-sm text-white/40 px-2">
            <p>🔄 Auto-refreshes every 10 seconds</p>
            <p>Last updated: {new Date(dashboardData.timestamp).toLocaleTimeString()}</p>
          </div>
        </div>
      )}
          </div>
        </div>
      )}
      {}
      <div className="input-section">
        <div className="input-wrapper-glass">
          <input
            ref={inputRef}
            type="text"
            className="message-input-glass"
            placeholder={inputPlaceholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <div className="input-actions">
            <button 
              className="input-btn" 
              onClick={handleClear}
              disabled={isLoading}
              title="Clear chat"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
            <button 
              className="input-btn send-btn" 
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              title="Send message"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default ChatInterface;