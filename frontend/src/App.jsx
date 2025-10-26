import React from 'react';
import ChatInterface from './components/ChatInterface';
import './styles/animations.css';
import './styles/index.css';
function App() {
  return (
    <div className="app-wrapper">
      {}
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>
      {}
      <div className="grid-background"></div>
      {}
      <div className="app-content">
        <ChatInterface />
      </div>
    </div>
  );
}
export default App;