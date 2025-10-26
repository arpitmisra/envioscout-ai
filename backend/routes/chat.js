import express from 'express';
import { getGeminiAgent } from '../ai/gemini-agent.js';
const router = express.Router();
let agentInitialized = false;
async function ensureAgentInitialized() {
  if (agentInitialized) return;
  const agent = getGeminiAgent();
  await agent.initialize();
  agentInitialized = true;
  console.log('✅ Agent initialization complete');
}
router.post('/message', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: 'Message is required and must be a string' 
      });
    }
    console.log(`📨 Received message: ${message}`);
    await ensureAgentInitialized();
    const agent = getGeminiAgent();
    const result = await agent.chat(message);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process message',
      message: error.message
    });
  }
});
router.get('/history', async (req, res) => {
  try {
    await ensureAgentInitialized();
    const agent = getGeminiAgent();
    const history = agent.getHistory();
    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch history'
    });
  }
});
router.post('/clear', async (req, res) => {
  try {
    await ensureAgentInitialized();
    const agent = getGeminiAgent();
    agent.clearHistory();
    res.json({
      success: true,
      message: 'Conversation history cleared'
    });
  } catch (error) {
    console.error('Error clearing history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear history'
    });
  }
});
export default router;