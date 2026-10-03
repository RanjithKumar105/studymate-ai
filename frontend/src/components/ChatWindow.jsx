import React, { useRef, useEffect } from 'react';
import WelcomeScreen from './WelcomeScreen';
import ChatMessage from './ChatMessage';

export default function ChatWindow({ messages, onSelectPrompt, onRegenerate }) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!messages || messages.length === 0) {
    return (
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <WelcomeScreen onSelectPrompt={onSelectPrompt} />
      </div>
    );
  }

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '1rem',
      maxWidth: '780px',
      width: '100%',
      margin: '0 auto',
    }}>
      {messages.map((msg, idx) => (
        <ChatMessage
          key={msg.id || idx}
          message={msg}
          onRegenerate={() => onRegenerate(idx)}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
