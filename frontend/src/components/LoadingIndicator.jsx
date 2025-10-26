import React from 'react';
function LoadingIndicator() {
  return (
    <div className="message-row message-ai">
      <div className="message-avatar avatar-ai">AI</div>
      <div className="message-content-wrapper">
        <div className="message-bubble bubble-ai">
          <div className="loading-dots">
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default LoadingIndicator;