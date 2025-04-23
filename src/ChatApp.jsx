import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './ChatApp.css';

const ChatApp = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]); // Lưu lịch sử tìm kiếm
  const containerRef = useRef(null); // ref đến .chat-messages
  const messageRefs = useRef([]);    // mảng ref đến từng tin nhắn

  useEffect(() => {
    if (containerRef.current) {
      // Lấy tin nhắn cuối từ người dùng và cuộn tới nó
      const totalMessages = messageRefs.current.length;
      const lastMessage = messageRefs.current[totalMessages - 1];

      if (lastMessage) {
        lastMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [messages]); // Chạy khi messages thay đổi

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setHistory(prev => [...prev, input]); // Lưu câu hỏi vào lịch sử tìm kiếm

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo', // model miễn phí
          messages: [...messages, userMessage]
        },
        {
          headers: {
            'Authorization': `Bearer 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`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000', // hoặc domain bạn đang test
            'X-Title': 'ChatGPT Demo'
          }
        }
      );

      const assistantReply = response.data.choices[0].message;
      setMessages(prev => [...prev, assistantReply]);
    } catch (err) {
      console.error('Lỗi khi gọi API:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Lỗi khi gọi API. Vui lòng thử lại.'
      }]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  // Cuộn đến tin nhắn tương ứng khi click vào lịch sử tìm kiếm
  const scrollToMessage = (index) => {
    if (messageRefs.current[index]) {
      messageRefs.current[index].scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  return (
    <div className='main'>
      <div className="history-sidebar">
        <h4>Lịch sử tìm kiếm</h4>
        <ul>
          {history.map((item, index) => (
            <li key={index} onClick={() => scrollToMessage(index)}>
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="chat-container">
        <div className="chat-header">💬 ChatGPT Demo</div>
        <div className="chat-content">
          <div className="chat-messages" ref={containerRef}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chat-message ${msg.role}`}
                ref={el => messageRefs.current[i] = el}
              >
                {msg.content}
              </div>
            ))}
          </div>
        </div>
        <div className="chat-input">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Nhập tin nhắn..."
          />
          <button onClick={handleSend}>Gửi</button>
        </div>
      </div>
    </div>
  );
};

export default ChatApp;
