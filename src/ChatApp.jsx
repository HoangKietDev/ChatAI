import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './ChatApp.css';

const ChatApp = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]); // Lưu lịch sử tìm kiếm
  const [loading, setLoading] = useState(false); // Cờ để kiểm tra trạng thái loading
  const [highlightedIndex, setHighlightedIndex] = useState(null);   // in đậm tin nhắn
  const [showHistory, setShowHistory] = useState(true);    // tắt ẩn lịch sử
  const [isTypingComplete, setIsTypingComplete] = useState(true); // Cờ hoàn tất typing
  const [isSending, setIsSending] = useState(false); // Cờ để kiểm tra quá trình gửi câu hỏi
  const [isAtBottom, setIsAtBottom] = useState(true);  // Cờ để kiểm tra vị trí cuộn

  const containerRef = useRef(null); // ref đến .chat-messages
  const messageRefs = useRef([]);    // mảng ref đến từng tin nhắn
  const historyContainerRef = useRef(null); //ref đến .chat-messages
  const CHAT_API_KEY = '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';
  const typingIntervalRef = useRef(null); // Giữ ref để dừng typing
  const controllerRef = useRef(null); // Ref để hủy API call

  // ✅ Cuộn đến cuối khi có tin nhắn mới
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


  // ✅ Ẩn hiện nút kéo xuống để scroll nếu không ở cuối
  useEffect(() => {
    const container = containerRef.current;
    const handleScroll = () => {
      if (!container) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 10); // +-10 cho mượt
    };
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  // ✅ Gọi API tới ChatAI khi nhấn nút gửi
  const handleSend = async () => {
    if (!input.trim() || isSending || loading || !isTypingComplete) return;   // Không gửi nếu không có nội dung hoặc đang gửi hoặc đang loading
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
          signal: controller.signal, // ✅ Gán signal để hủy yêu cầu
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

  // Hiệu ứng gõ phím typing
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

  // ✅ Hủy đặt câu hỏi cho ChatAI
  const handleCancel = () => {
    // Hủy gọi API nếu đang gọi
    if (controllerRef.current) {
      controllerRef.current.abort();
      console.log('Đã huỷ request đến OpenRouter.');
    }

    // Dừng hiệu ứng gõ phím
    clearInterval(typingIntervalRef.current);
    typingIntervalRef.current = null;

    setIsTypingComplete(true);
    setLoading(false);
    setIsSending(false);
  };

  // ✅ xử lý sự kiện nhấn phím Ente
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) handleSend();
  };

  // ✅ Cuộn đến tin nhắn được chọn trong lịch sử
  const scrollToMessage = (index) => {
    const userIndexes = messages
      .map((msg, idx) => (msg.role === 'user' ? idx : null))
      .filter((idx) => idx !== null);

    const userMsgIndex = userIndexes[index];
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

    // Scroll lịch sử
    if (historyContainerRef.current) {
      const historyItems = historyContainerRef.current.querySelectorAll('.history-item');
      const historyItemEl = historyItems[index];
      if (historyItemEl) {
        historyItemEl.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  };

  // ✅ Reset tất cả tin nhắn và lịch sử 
  const handleResetChat = () => {
    setMessages([]);
    setHistory([]);
    setInput('');
    setIsAtBottom(true);
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
            <ul className="history-list" ref={historyContainerRef}>
              {history.map((item, index) => (
                <li
                  key={index}
                  className="history-item"
                  onClick={() => scrollToMessage(index)}
                >
                  {item}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="chat-container">
        <div className="chat-header">
          <div className="chat-actions">
            {isTypingComplete &&
              <button onClick={handleResetChat} className="reset-chat-btn">
                🔄 New Chat
              </button>
            }

          </div>
          💬 ChatAI
        </div>
        <div className="chat-content">
          <div className="chat-messages" ref={containerRef}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chat-message ${msg.role} ${i === highlightedIndex ? 'highlighted' : ''}`}
                ref={el => messageRefs.current[i] = el}
              >
                {msg.role === 'assistant' ?
                  <span className="chat-icon">{msg.content}🤖</span>
                  : <span className="chat-icon">👤{msg.content}</span>}
              </div>
            ))}
            {loading && (
              <div className="chat-message assistant">
                Đang tải...<span className="chat-icon">🤖</span>
              </div>
            )}
            <div className="end-of-chat"></div> {/* Phần tạo khoảng trống phía dưới */}
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
              container.scrollTo({
                top: container.scrollHeight,              // Cuộn xuống cuối tag .chat-messages khi nhấn nút
                behavior: 'smooth'
              });
            }}
            className="scroll-to-bottom-btn"
          >
            ↓
          </button>
        )}

        {/* {!isAtBottom && (
          <button
            onClick={() => {
              const lastMessage = messageRefs.current[messageRefs.current.length - 1];      // Cuộn xuống cuối mảng messageRefs khi nhấn nút
              lastMessage?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="scroll-to-bottom-btn"
          >
            ↓
          </button>
        )} */}

      </div>
    </div>
  );
};

export default ChatApp;
