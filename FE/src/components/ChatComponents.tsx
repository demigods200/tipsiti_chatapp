import React, { useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface IMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface IConversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messages: Message[];
}

interface ISidebarProps {
  onNewChat: () => void;
  onClearHistory: () => void;
  conversations: Conversation[];
  onSelectConversation: (conversation: Conversation) => void;
  currentConversationId?: string;
}

export const Sidebar = ({ onNewChat, onClearHistory, conversations, onSelectConversation, currentConversationId }: ISidebarProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-[280px] bg-white border-r border-gray-100 
        transform transition-transform duration-200 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        flex flex-col
      `}>
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <Link to="/" className="text-xl font-bold text-gray-900">Tipsiti</Link>
          </div>
          <div className="space-y-2">
            <button 
              onClick={onNewChat}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl px-4 py-3 font-medium hover:from-indigo-600 hover:to-purple-600 transition-all duration-200"
            >
              New Conversation
            </button>
            <button 
              onClick={onClearHistory}
              disabled={conversations.length === 0}
              className={`w-full text-white rounded-xl px-4 py-3 font-medium transition-all duration-200 ${
                conversations.length === 0 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              Clear History
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Recent Conversations</div>
            {conversations.map((conversation) => (
              <div 
                key={conversation.id}
                onClick={() => onSelectConversation(conversation)}
                className={`p-3 rounded-lg cursor-pointer transition-colors duration-200 ${
                  currentConversationId === conversation.id 
                    ? 'bg-indigo-50 hover:bg-indigo-100' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="text-sm font-medium text-gray-900 truncate">{conversation.title}</div>
                <div className="text-xs text-gray-500 mt-1 flex justify-between">
                  <span className="truncate">{conversation.lastMessage}</span>
                  <span>{formatTimestamp(conversation.timestamp)}</span>
                </div>
              </div>
            ))}
            {conversations.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-4">
                No conversations yet
              </div>
            )}
          </div>
        </div>
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="text-sm font-medium text-gray-900">User</div>
            </div>
            <button onClick={handleLogout} className="text-sm text-gray-600 hover:text-gray-900">
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

const MessageCard = ({ message }: { message: Message }) => (
  <div className={`w-full max-w-2xl ${message.sender === 'user' ? 'ml-auto' : 'mr-auto'}`}>
    <div className={`
      p-4 sm:p-6 rounded-2xl backdrop-blur-lg
      ${message.sender === 'bot' 
        ? 'bg-white/80 border border-gray-100 shadow-sm' 
        : 'bg-gradient-to-r from-blue-500/90 to-blue-600/90 text-white'
      }
      ${message.sender === 'user' ? 'ml-12' : 'mr-12'}
    `}>
      <div className={`flex items-start gap-3 sm:gap-4 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
        {message.sender === 'user' ? (
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        ) : (
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className={`text-sm sm:text-base break-words ${message.sender === 'user' ? 'text-white text-right' : 'text-gray-800'}`}>
            {message.text}
          </div>
          <div className={`text-xs mt-2 ${message.sender === 'bot' ? 'text-gray-400' : 'text-blue-100'} ${message.sender === 'user' ? 'text-right' : ''}`}>
            {new Date(message.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const ChatArea = ({ messages, isTyping, showWelcome }: { messages: Message[], isTyping: boolean, showWelcome: boolean }) => (
  <div className="flex-1 overflow-y-auto py-4 sm:py-8 px-4 sm:px-6">
    <div className="max-w-4xl mx-auto">
      {messages.length === 0 && showWelcome ? (
        <div className="text-center py-12 sm:py-20 px-4">
          <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-6 sm:mb-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-12 sm:w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">Welcome to Tipsiti!</h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-lg mx-auto leading-relaxed">
            Your personal AI travel companion is ready to help you discover amazing places and unforgettable experiences.
          </p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {messages.map((message) => (
            <MessageCard key={message.id} message={message} />
          ))}
          {isTyping && (
            <div className="w-full max-w-2xl">
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-200"></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-400"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);

export const InputArea = ({ input, setInput, handleSubmit, isDisabled }: { 
  input: string, 
  setInput: React.Dispatch<React.SetStateAction<string>>, 
  handleSubmit: (e: React.FormEvent) => void,
  isDisabled?: boolean
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isDisabled) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-transparent via-white to-white">
      <div className="max-w-4xl mx-auto px-4 pb-6 sm:pb-8 pt-4 sm:pt-6">
        <div className={`relative flex items-end w-full bg-white rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.05)] border transition-all duration-200 ${
          isDisabled 
            ? 'border-gray-200 opacity-50' 
            : 'border-gray-200 focus-within:border-indigo-500 focus-within:rounded-3xl'
        }`}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isDisabled ? "Start a new conversation to chat..." : "Message Tipsiti..."}
            disabled={isDisabled}
            rows={1}
            className="w-full resize-none border-0 bg-transparent py-3 sm:py-4 pl-4 sm:pl-5 pr-12 text-gray-900 placeholder:text-gray-400 focus:ring-0 focus:outline-none text-sm sm:text-base leading-6 max-h-[200px] overflow-y-auto disabled:cursor-not-allowed"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#E5E7EB transparent' }}
          />
          <button
            type="button"
            onClick={(e) => handleSubmit(e)}
            disabled={!input.trim() || isDisabled}
            className={`absolute right-2 bottom-2 sm:bottom-3 p-1.5 rounded-lg transition-all duration-200 ${
              input.trim() && !isDisabled
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-sm' 
                : 'text-gray-400 bg-gray-100'
            }`}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="currentColor" 
              className="w-4 h-4 sm:w-5 sm:h-5 rotate-90"
            >
              <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
            </svg>
          </button>
        </div>
        <div className="px-2 pt-2 text-xs text-gray-500">
          {!isDisabled && "Press Enter to send, Shift + Enter for new line"}
        </div>
      </div>
    </div>
  );
}; 