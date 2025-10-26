import React, { useState } from 'react';
function MessageBubble({ message, onEdit }) {
  const [hover, setHover] = useState(false);
  const [copied, setCopied] = useState(false);
  const isUser = (message?.role || '').toLowerCase() === 'user';
  const isError = !!message?.isError;
  const text = message?.text ?? message?.content ?? message?.message ?? '';
  const timestamp = message?.timestamp ?? message?.time ?? new Date().toISOString();
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed', e);
    }
  };
  const handleEdit = () => {
    if (onEdit && isUser) {
      onEdit(text);
    }
  };
  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  const formatMessage = (content) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>')
      .replace(/\n/g, '<br>');
  };
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`message-row ${isUser ? 'message-user' : 'message-ai'}`}
    >
      <div className={`message-avatar ${isUser ? 'avatar-user' : 'avatar-ai'}`}>
        {isUser ? 'You' : 'AI'}
      </div>
      <div className="message-content-wrapper">
        <div className={`message-bubble ${isUser ? 'bubble-user' : isError ? 'bubble-error' : 'bubble-ai'}`}>
          {}
          {isUser && (
            <div className={`user-message-actions ${hover ? 'actions-visible' : ''}`}>
              <button 
                className="action-button edit-button"
                onClick={handleEdit}
                title="Edit and resend"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button 
                className="action-button copy-button-user"
                onClick={handleCopy}
                title={copied ? "Copied!" : "Copy message"}
              >
                {copied ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                )}
              </button>
            </div>
          )}
          {}
          {!isUser && (
            <div className={`ai-message-actions ${hover ? 'actions-visible' : ''}`}>
              <button 
                className="action-button copy-button-ai"
                onClick={handleCopy}
                title={copied ? "Copied!" : "Copy message"}
              >
                {copied ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                )}
              </button>
            </div>
          )}
          <div 
            className="message-text"
            dangerouslySetInnerHTML={{ __html: formatMessage(text) }}
          />
          {Array.isArray(message?.toolsUsed) && message.toolsUsed.length > 0 && (
            <div className="tools-used">
              <span className="tools-label">Tools used:</span>
              {message.toolsUsed.map((tool, i) => (
                <span key={i} className="tool-badge">
                  {tool}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className={`message-timestamp ${isUser ? 'timestamp-right' : 'timestamp-left'}`}>
          {formatTime(timestamp)}
        </div>
      </div>
      {}
      {}
    </div>
  );
}
export default MessageBubble;