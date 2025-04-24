import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './ChatApp.css';

const ChatApp = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]); // Lưu lịch sử tìm kiếm
  const [loading, setLoading] = useState(false); // Cờ để kiểm tra trạng thái loading
  const [highlightedIndex, setHighlightedIndex] = useState(null);
  const [showHistory, setShowHistory] = useState(true);
  const [isTypingComplete, setIsTypingComplete] = useState(true); // Cờ hoàn tất typing
  const [isSending, setIsSending] = useState(false); // Cờ để kiểm tra quá trình gửi câu hỏi
  const [isAtBottom, setIsAtBottom] = useState(true);

  const containerRef = useRef(null); // ref đến .chat-messages
  const messageRefs = useRef([]);    // mảng ref đến từng tin nhắn
  const CHAT_API_KEY = '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';
  const typingIntervalRef = useRef(null); // Giữ ref để dừng typing
  const controllerRef = useRef(null); // Ref để hủy API call

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (containerRef.current && lastMessage?.role === 'user') {
      const totalMessages = messageRefs.current.length;
      const lastMessageRef = messageRefs.current[totalMessages - 1];

      if (lastMessageRef) {
        lastMessageRef.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [messages]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
  
    const threshold = 50; // khoảng cách cho phép lệch khỏi đáy
    const isBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
    setIsAtBottom(isBottom);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      console.log('❌ containerRef is null');
      return;
    }
  
    const handleScroll = () => {
      console.log('✅ scroll event triggered');
      const threshold = 50;
      const isBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
      setIsAtBottom(isBottom);
    };
  
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!isAtBottom) return;
  
    const container = containerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isSending || loading || !isTypingComplete) return;

    setIsSending(true);
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setHistory(prev => [...prev, input]);
    setLoading(true);
    setIsTypingComplete(false);

    const controller = new AbortController(); // ✅ Tạo controller mới
    controllerRef.current = controller;       // ✅ Lưu vào ref

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [...messages, userMessage],
        },
        {
          signal: controller.signal, // ✅ Gán signal vào đây
          headers: {
            'Authorization': `Bearer ${CHAT_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'ChatGPT Demo'
          }
        }
      );

      const assistantReply = response.data.choices[0].message;
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      setLoading(false);
      setIsSending(false);

      displayTypingEffect(assistantReply.content);
    } catch (err) {
      if (err.name === 'CanceledError') {
        console.log('Yêu cầu đã bị hủy.');
      } else {
        console.error('Lỗi khi gọi API:', err);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '❌ Lỗi khi gọi API. Vui lòng thử lại.'
        }]);
      }

      setLoading(false);
      setIsSending(false);
      setIsTypingComplete(true);
    }
  };



  const displayTypingEffect = (text) => {
    let index = -1;
    typingIntervalRef.current = setInterval(() => {
      if (index < text.length) {
        setMessages(prev => {
          const updatedMessages = [...prev];
          updatedMessages[updatedMessages.length - 1] = {
            ...updatedMessages[updatedMessages.length - 1],
            content: updatedMessages[updatedMessages.length - 1].content + text.charAt(index),
          };
          return updatedMessages;
        });
        index++;
      } else {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
        setIsTypingComplete(true);  // Đánh dấu đã hoàn tất typing
      }
    }, 30);
  };


  const handleCancel = () => {
    // ✅ Hủy gọi API nếu đang gọi
    if (controllerRef.current) {
      controllerRef.current.abort();
      console.log('Đã huỷ request đến OpenRouter.');
    }

    // ✅ Dừng hiệu ứng gõ phím
    clearInterval(typingIntervalRef.current);
    typingIntervalRef.current = null;

    setIsTypingComplete(true);
    setLoading(false);
    setIsSending(false);
  };


  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) handleSend();
  };


  const scrollToMessage = (index) => {
    // Tìm trong messages vị trí của câu hỏi (vai trò user) khớp với lịch sử
    const userIndexes = messages
      .map((msg, idx) => (msg.role === 'user' ? idx : null))
      .filter((idx) => idx !== null);

    const userMsgIndex = userIndexes[index]; // index trong messages tương ứng với lịch sử

    const messageEl = messageRefs.current[userMsgIndex];
    if (messageEl) {
      messageEl.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      setHighlightedIndex(userMsgIndex);

      setTimeout(() => {
        setHighlightedIndex(null);
      }, 2000);
    }
  };

  return (
    <div className='main'>
      <div className={`history-sidebar ${showHistory ? '' : 'collapsed'}`}>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="toggle-history-btn"
          title={showHistory ? 'Ẩn lịch sử' : 'Hiện lịch sử'}
        >
          {showHistory ? '❌' : '✔️'}
        </button>

        {showHistory && (
          <>
            <h4>Lịch sử tìm kiếm</h4>
            <ul>
              {history.map((item, index) => (
                <li key={index} onClick={() => scrollToMessage(index)}>
                  {item}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="chat-container">
        <div className="chat-header">
          💬 ChatGPT Demo
        </div>
        <div className="chat-content">
          <div className="chat-messages" ref={containerRef}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chat-message ${msg.role} ${i === highlightedIndex ? 'highlighted' : ''}`}
                ref={el => messageRefs.current[i] = el}
              >
                {msg.content}
              </div>
            ))}
            {loading && (
              <div className="chat-message assistant">
                Đang tải...
              </div>
            )}
          </div>
        </div>
        <div className="chat-input">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Nhập tin nhắn..."
            disabled={isSending || loading}  // Disabled khi đang gửi hoặc loading
          />
          {loading || isSending || !isTypingComplete ? (
            <button onClick={handleCancel}>❌ Cancel</button>
          ) : (
            <button onClick={handleSend} disabled={isSending || !input.trim() || loading}>
              Gửi
            </button>
          )}
        </div>
        {!isAtBottom && (
          <button
            onClick={() => {
              const container = containerRef.current;
              container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            }}
            className="scroll-to-bottom-btn"
            style={{
              position: 'fixed',
              width: '50px',
              height: '50px',
              top: '80%',
              left: '50%',
              padding: '10px 15px',
              borderRadius: '50%',
              backgroundColor: '#007bff',
              color: '#fff',
              border: 'none',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
              cursor: 'pointer',
              zIndex: 9999,
            }}
          >
            ↓
          </button>
        )}

      </div>
    </div>
  );
};

export default ChatApp;
