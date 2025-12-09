'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { createClient } from '@/utils/supabase/client';
import { sendMessage, getMessageHistory, markMessagesAsRead } from '@/app/actions';
import { formatDistanceToNow } from 'date-fns';
import { Send } from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface Conversation {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

// ============================================================================
// MESSAGE BUBBLE COMPONENT
// ============================================================================

function MessageBubble({
  message,
  isOwn,
}: {
  message: Message;
  isOwn: boolean;
}) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isOwn
            ? 'bg-teal-500 text-white rounded-br-none'
            : 'bg-gray-200 text-gray-800 rounded-bl-none'
        }`}
      >
        <p className="text-sm break-words">{message.content}</p>
        <p
          className={`text-xs mt-1 ${
            isOwn ? 'text-teal-100' : 'text-gray-500'
          }`}
        >
          {formatDistanceToNow(new Date(message.created_at), {
            addSuffix: true,
          })}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// CONVERSATION ITEM COMPONENT
// ============================================================================

function ConversationItem({
  conversation,
  isActive,
  onClick,
}: {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 border-b border-gray-200 hover:bg-gray-50 transition-colors ${
        isActive ? 'bg-teal-50 border-l-4 border-l-teal-500' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <img
          src={
            conversation.user_avatar ||
            `https://ui-avatars.com/api/?name=${conversation.user_name}`
          }
          alt={conversation.user_name}
          className="w-10 h-10 rounded-full flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-semibold text-gray-900 truncate">
              {conversation.user_name}
            </h3>
            <span className="text-xs text-gray-500 flex-shrink-0">
              {formatDistanceToNow(new Date(conversation.last_message_time), {
                addSuffix: true,
              })}
            </span>
          </div>
          <p className="text-sm text-gray-600 truncate">
            {conversation.last_message}
          </p>
          {conversation.unread_count > 0 && (
            <div className="mt-1">
              <span className="inline-block bg-teal-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                {conversation.unread_count}
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// MESSAGES PAGE
// ============================================================================

export default function MessagesPage() {
  const { user, isLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch conversations on mount
  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      setPageLoading(true);
      try {
        // For now, we'll fetch from a mock endpoint
        // Replace this with actual API call once backend is ready
        setConversations([]);
      } finally {
        setPageLoading(false);
      }
    };

    fetchConversations();
  }, [user]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!selectedConversation || !user) return;

    // Mark messages as read
    markMessagesAsRead(selectedConversation.user_id);

    // Subscribe to messages
    const subscription = supabase
      .channel(`messages:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `or(sender_id=eq.${user.id},receiver_id=eq.${user.id})`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as Message;
            if (
              (newMessage.sender_id === selectedConversation.user_id &&
                newMessage.receiver_id === user.id) ||
              (newMessage.sender_id === user.id &&
                newMessage.receiver_id === selectedConversation.user_id)
            ) {
              setMessages((prev) => [...prev, newMessage]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedConversation, user, supabase]);

  // Handle send message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;

    setIsSending(true);
    try {
      const result = await sendMessage(
        selectedConversation.user_id,
        messageInput
      );

      if (result.success) {
        setMessageInput('');
      } else {
        alert(`Error: ${result.error}`);
      }
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading || pageLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Please log in to view messages
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white flex">
      {/* SIDEBAR: CONVERSATIONS LIST */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <h2 className="text-xl font-bold text-gray-900">Messages</h2>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center px-4">
                <p className="text-gray-500 mb-2">No conversations yet</p>
                <p className="text-sm text-gray-400">
                  Book a tutor to start chatting
                </p>
              </div>
            </div>
          ) : (
            conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={selectedConversation?.id === conversation.id}
                onClick={() => {
                  setSelectedConversation(conversation);
                  fetchMessages(conversation.user_id);
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* MAIN AREA: ACTIVE CHAT */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={
                    selectedConversation.user_avatar ||
                    `https://ui-avatars.com/api/?name=${selectedConversation.user_name}`
                  }
                  alt={selectedConversation.user_name}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedConversation.user_name}
                  </h3>
                  <p className="text-sm text-gray-500">Online</p>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-white">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwn={message.sender_id === user.id}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="px-6 py-4 border-t border-gray-200 bg-white">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isSending || !messageInput.trim()}
                  className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isSending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <p className="text-gray-500 mb-2">Select a conversation</p>
              <p className="text-sm text-gray-400">
                to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to fetch messages
async function fetchMessages(otherUserId: string) {
  try {
    const result = await getMessageHistory(otherUserId);
    if (result.success) {
      // Update messages state
      // This should be moved to a proper state management solution
      return result.messages;
    }
  } catch (error) {
    console.error('Error fetching messages:', error);
  }
}
