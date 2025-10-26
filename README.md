# EnvioScout AI 🔍⚡

**AI-powered blockchain analytics chatbot** combining Envio HyperSync, Google Gemini AI, and Blockscout API for real-time multi-chain insights and intelligent blockchain analysis.

Built for **ETHGlobal ETHOnline 2025** 🌐

---

## 🌟 Features

- 🤖 **AI-Powered Chat Interface** - Natural language blockchain queries powered by Google Gemini Pro
- ⚡ **Real-Time Multi-Chain Analytics** - Live statistics for Ethereum, Polygon, Optimism, Base, and Arbitrum
- 📊 **Interactive Dashboard** - Real-time TPS, gas fees, block times, and transaction counts
- 🎨 **Beautiful UI** - Dark/light theme support with smooth animations
- 🔥 **HyperSync Integration** - Ultra-fast blockchain data queries via Envio HyperSync
- 🌐 **Multi-Chain Support** - Seamless switching between major EVM networks

---

## 🛠️ Tech Stack

### Frontend
- **React** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Markdown Rendering** - Format AI responses beautifully

### Backend
- **Node.js + Express** - REST API server
- **Google Generative AI (Gemini Pro)** - AI agent for intelligent analysis
- **Envio HyperSync Client** - High-performance blockchain indexing
- **Blockscout REST API** - Multi-chain blockchain explorer data
- **ES Modules** - Modern JavaScript architecture

### APIs & SDKs
- **[@envio-dev/hypersync-client](https://www.npmjs.com/package/@envio-dev/hypersync-client)** v0.6.6 - Ultra-fast blockchain data queries
- **[@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai)** v0.24.1 - Google Gemini AI integration
- **[Blockscout API](https://docs.blockscout.com/)** - Multi-chain blockchain explorer endpoints
- **axios** - HTTP client for API requests
- **cors** - Cross-origin resource sharing
- **dotenv** - Environment variable management

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ and npm
- **Google Gemini API Key** - [Get one here](https://makersuite.google.com/app/apikey)
- **Envio HyperSync Bearer Token** - [Get one here](https://envio.dev/)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/arpitmisra/envioscout-ai.git
   cd envioscout-ai
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   ```

   Create `.env` file:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   HYPERSYNC_BEARER_TOKEN=your_envio_bearer_token_here
   PORT=3001
   ```

3. **Setup Frontend**
   ```bash
   cd ../frontend
   npm install
   ```

   Create `.env` file:
   ```env
   VITE_API_URL=http://localhost:3001
   ```

---

## 🎮 Usage

### Start the Backend Server
```bash
cd backend
node server.js
```
Server runs on `http://localhost:3001`

### Start the Frontend
```bash
cd frontend
npm run dev
```
Frontend runs on `http://localhost:5173`

### Using the App

1. **Chat Interface** - Ask questions about blockchain data:
   - "Analyze wallet 0x123..."
   - "Show me recent transactions on Ethereum"
   - "What's the current gas price?"

2. **Dashboard** - View real-time statistics:
   - Switch between chains (ETH, Polygon, Optimism, Base, Arbitrum)
   - See live TPS, gas fees, block times, and transaction counts
   - Beautiful visualizations in dark/light themes

---

## 📁 Project Structure

```
envioscout-ai/
├── backend/
│   ├── ai/
│   │   ├── gemini-agent.js          # Gemini AI integration
│   │   ├── prompt-templates.js      # AI prompt engineering
│   │   └── tools-definition.js      # Function calling tools
│   ├── blockscout/
│   │   └── blockscout-api.js        # Blockscout API client
│   ├── envio/
│   │   ├── envio-service.js         # HyperSync integration
│   │   ├── check-config.js          # Configuration validator
│   │   └── README.md                # Envio setup guide
│   ├── mcp/
│   │   └── blockscout-client.js     # MCP client wrapper
│   ├── routes/
│   │   ├── chat.js                  # AI chat endpoint
│   │   └── dashboard.js             # Dashboard API
│   ├── server.js                    # Express server
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatInterface.jsx    # Main chat UI
│   │   │   ├── MessageBubble.jsx    # Message rendering
│   │   │   └── LoadingIndicator.jsx # Loading states
│   │   ├── styles/
│   │   │   ├── index.css            # Global styles
│   │   │   └── animations.css       # Animations
│   │   ├── App.jsx                  # Root component
│   │   └── main.jsx                 # Entry point
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example
├── .gitignore
└── README.md
```

---

## 🔑 Environment Variables

### Backend (.env)
```env
GEMINI_API_KEY=        # Google Gemini API key
HYPERSYNC_BEARER_TOKEN=# Envio HyperSync bearer token
PORT=3001              # Server port
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001  # Backend API URL
```

---

## 🌐 Supported Chains

- **Ethereum (ETH)** - `eth.hypersync.xyz` + `eth.blockscout.com`
- **Polygon (MATIC)** - `polygon.hypersync.xyz` + `polygon.blockscout.com`
- **Optimism (OP)** - `optimism.hypersync.xyz` + `optimism.blockscout.com`
- **Base** - `base.hypersync.xyz` + `base.blockscout.com`
- **Arbitrum (ARB)** - `arbitrum.hypersync.xyz` + `arbitrum.blockscout.com`

---

## 🎯 Key Features Explained

### 1. **AI-Powered Analysis**
- Gemini Pro model for natural language understanding
- Function calling for structured blockchain queries
- Context-aware responses with markdown formatting

### 2. **HyperSync Integration**
- Query recent blocks (last 1000) for optimal performance
- Calculate real-time TPS from transaction counts
- Compute average gas fees in native tokens (ETH, MATIC, etc.)

### 3. **Dashboard Metrics**
- **TPS (Transactions Per Second)** - `totalTransactions / totalTimeInSeconds`
- **Gas Fees** - `(gasUsed × avgGasPrice) / 1e18` in native token
- **Avg Block Time** - `totalTimeInSeconds / blockCount`
- **Total Transactions** - Sum of all transactions in recent blocks

### 4. **Smart UI/UX**
- Hover-activated copy buttons for AI responses
- Smooth theme transitions (dark/light)
- Responsive design for all screen sizes
- Loading states and error handling

---

## 🐛 Troubleshooting

### Envio HyperSync Timeout Errors
If you see timeout errors, check:
1. Valid bearer token in `.env`
2. Network connectivity
3. See `backend/envio/README.md` for detailed troubleshooting

### Dashboard Shows Zero Stats
- Ensure backend server is running
- Check browser console for errors
- Verify Envio token is valid

### Frontend Can't Connect to Backend
- Confirm backend is running on port 3001
- Check `VITE_API_URL` in frontend `.env`
- Ensure CORS is enabled (already configured)

---

## 📝 API Endpoints

### Chat
```
POST /api/chat
Body: { message: "your question", chain: "eth" }
Response: { response: "AI answer" }
```

### Dashboard Stats
```
GET /api/dashboard/stats/:chain
Params: chain (eth, polygon, optimism, base, arbitrum)
Response: { tps, gasFee, avgBlockTime, totalTransactions }
```

---

## 🤝 Contributing

This project was built for ETHGlobal ETHOnline 2025. Feel free to fork and extend!

---

## 📄 License

MIT License - feel free to use this project for learning and building!

---

## 🏆 Built For

**ETHGlobal ETHOnline 2025**

Combining the power of:
- 🔥 **Envio HyperSync** - Lightning-fast blockchain indexing
- 🤖 **Google Gemini AI** - Intelligent natural language processing
- 🌐 **Blockscout API** - Comprehensive multi-chain explorer data

---

## 👥 Team

Built with ❤️ by the EnvioScout AI team

---

## 🔗 Links

- **GitHub**: [envioscout-ai](https://github.com/arpitmisra/envioscout-ai)
- **Envio Docs**: [docs.envio.dev](https://docs.envio.dev/)
- **Blockscout**: [blockscout.com](https://www.blockscout.com/)
- **Gemini AI**: [ai.google.dev](https://ai.google.dev/)

---

**Made with ⚡ for the Ethereum ecosystem**
