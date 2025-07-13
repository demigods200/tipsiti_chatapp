import { useState, useEffect, } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Home from './pages/Home';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, ChatArea, InputArea } from './components/ChatComponents';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messages: Message[];
}

// Helper functions for localStorage
const CURRENT_CHAT_KEY = 'currentChat';
const CHAT_TYPE_KEY = 'chatType';

const saveToLocalStorage = (messages: Message[], chatType: string = 'general') => {
  localStorage.setItem(CURRENT_CHAT_KEY, JSON.stringify(messages));
  localStorage.setItem(CHAT_TYPE_KEY, chatType);
};

const loadFromLocalStorage = (): { messages: Message[], chatType: string } => {
  const savedMessages = localStorage.getItem(CURRENT_CHAT_KEY);
  const chatType = localStorage.getItem(CHAT_TYPE_KEY) || 'general';
  return {
    messages: savedMessages ? JSON.parse(savedMessages) : [],
    chatType
  };
};

const clearLocalStorage = () => {
  localStorage.removeItem(CURRENT_CHAT_KEY);
  localStorage.removeItem(CHAT_TYPE_KEY);
};

const Dashboard = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string>();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [chatType, setChatType] = useState('general');
  const { token } = useAuth();

  // Load messages from localStorage on initial render
  useEffect(() => {
    const { messages: savedMessages, chatType: savedChatType } = loadFromLocalStorage();
    setMessages(savedMessages);
    setChatType(savedChatType);
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (!isViewingHistory) {
      saveToLocalStorage(messages, chatType);
    }
  }, [messages, chatType, isViewingHistory]);

  const loadConversations = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/chat/conversations/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load conversations');
      }

      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  useEffect(() => {
    if (token) {
      loadConversations();
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping || isViewingHistory) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // Get all messages for context
      const allMessages = messages.concat(userMessage);
      
      const endpoint = `/api/auth/chat/message/`;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(import.meta.env.VITE_API_BASE_URL + endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          message: userMessage.text,
          chatType,
          context: allMessages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
          }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.response) {
        throw new Error('Invalid response from server');
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        sender: 'bot',
        timestamp: new Date(data.created_at || Date.now())
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: error instanceof Error 
          ? `Error: ${error.message}` 
          : 'Sorry, I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleNewChat = async () => {
    try {
      // Only save if there are messages and we're not viewing history
      if (token && messages.length > 0 && !isViewingHistory) {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/chat/save/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messages: messages.map(msg => ({
              role: msg.sender === 'user' ? 'user' : 'assistant',
              content: msg.text
            })),
            chatType
          })
        });

        const data = await response.json();
        
        if (data.status === 'error') {
          throw new Error(data.error || 'Failed to save conversation');
        }

        // Only refresh conversations if we actually saved something
        if (data.id) {
          await loadConversations();
        }
      }
      
      // Clear current chat and reset state
      setMessages([]);
      setCurrentConversationId(undefined);
      setIsViewingHistory(false);
      setInput('');
      clearLocalStorage();
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear all chat history? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/chat/clear/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to clear chat history');
      }

      setMessages([]);
      setCurrentConversationId(undefined);
      setConversations([]);
      setIsViewingHistory(false);
      setInput('');
      clearLocalStorage();
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    setCurrentConversationId(conversation.id);
    setIsViewingHistory(true);
    setInput('');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/chat/history/${conversation.id}/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load conversation history');
      }

      const history = await response.json();
      const formattedHistory = history
        .filter((chat: any) => chat.message || chat.response) // Filter out empty messages
        .map((chat: any) => {
          const messages = [];
          
          // Add user message if it exists
          if (chat.message) {
            messages.push({
              id: chat.id + '_user',
              text: chat.message,
              sender: 'user' as const,
              timestamp: new Date(chat.created_at)
            });
          }
          
          // Add bot message if it exists
          if (chat.response) {
            messages.push({
              id: chat.id + '_bot',
              text: chat.response,
              sender: 'bot' as const,
              timestamp: new Date(chat.created_at)
            });
          }
          
          return messages;
        })
        .flat();

      setMessages(formattedHistory);
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        onNewChat={handleNewChat}
        onClearHistory={handleClearHistory}
        conversations={conversations}
        onSelectConversation={handleSelectConversation}
        currentConversationId={currentConversationId}
      />
      <main className="flex-1 flex flex-col relative">
        <ChatArea messages={messages} isTyping={isTyping} showWelcome={messages.length === 0} />
        <InputArea 
          input={input} 
          setInput={setInput} 
          handleSubmit={handleSubmit}
          isDisabled={isViewingHistory} 
        />
      </main>
    </div>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/" />;
};

const App = () => (
  <AuthProvider>
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  </AuthProvider>
);

export default App;
