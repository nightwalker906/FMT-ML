'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { createClient } from '@/utils/supabase/client';
import { sendMessage, getMessageHistory, markMessagesAsRead, getConversations } from '@/app/actions';
import { formatDistanceToNow } from 'date-fns';
import { Send, MessageCircle, Search, ArrowLeft, GraduationCap, Check, CheckCheck } from 'lucide-react';

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
  user_type?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  has_booking?: boolean;
  booking_status?: string;
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
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
          isOwn
            ? 'bg-teal-500 text-white rounded-br-sm'
            : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-100 rounded-bl-sm'
        }`}
      >
        <p className="text-sm break-words">{message.content}</p>
        <div className="flex items-center justify-end gap-1 mt-1">
          <span
            className={`text-xs ${
              isOwn ? 'text-teal-100' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {formatDistanceToNow(new Date(message.created_at), {
              addSuffix: true,
            })}
          </span>
          {isOwn && (
            <CheckCheck 
              className={`h-4 w-4 ${
                message.is_read 
                  ? 'text-sky-300' 
                  : 'text-teal-200'
              }`} 
            />
          )}
        </div>
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
  // Badge color based on booking status
  const getBookingBadge = () => {
    if (!conversation.has_booking) return null;
    
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    
    const colorClass = statusColors[conversation.booking_status || 'pending'] || statusColors.pending;
    
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${colorClass}`}>
        {conversation.booking_status || 'Booked'}
      </span>
    );
  };

  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-left ${
        isActive ? 'bg-teal-50 dark:bg-teal-900/30 border-l-4 border-l-teal-500' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <img
          src={conversation.user_avatar}
          alt={conversation.user_name}
          className="w-12 h-12 rounded-full flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                {conversation.user_name}
              </h3>
              {getBookingBadge()}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
              {conversation.last_message_time ? formatDistanceToNow(new Date(conversation.last_message_time), {
                addSuffix: true,
              }) : 'No messages yet'}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
            {conversation.last_message || 'Start a conversation...'}
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
// TUTOR MESSAGES PAGE
// ============================================================================

export default function TutorMessagesPage() {
  const { user, isLoading } = useAuth();
  const searchParams = useSearchParams();
  const chatWithId = searchParams.get('chat');
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [newChatUser, setNewChatUser] = useState<{ id: string; name: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle chat URL parameter - start new conversation with student
  useEffect(() => {
    if (!user || !chatWithId) return;

    const startNewChat = async () => {
      // Fetch the student's profile info
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('id', chatWithId)
        .single();

      if (profile) {
        const userName = `${profile.first_name} ${profile.last_name}`;
        setNewChatUser({ id: profile.id, name: userName });
        
        // Create a temporary conversation object
        const tempConversation: Conversation = {
          id: profile.id,
          user_id: profile.id,
          user_name: userName,
          user_avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=14b8a6&color=fff`,
          last_message: '',
          last_message_time: new Date().toISOString(),
          unread_count: 0,
        };
        
        setSelectedConversation(tempConversation);
        setShowMobileChat(true);
        
        // Fetch any existing messages
        const result = await getMessageHistory(chatWithId);
        if (result.success) {
          setMessages(result.messages || []);
        }
      }
    };

    startNewChat();
  }, [user, chatWithId, supabase]);

  // Fetch conversations on mount
  useEffect(() => {
    if (!user) return;

    const fetchConversationsData = async () => {
      setPageLoading(true);
      try {
        const result = await getConversations();
        if (result.success) {
          setConversations(result.conversations || []);
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setPageLoading(false);
      }
    };

    fetchConversationsData();
  }, [user]);

  // Fetch messages when conversation is selected
  const fetchMessagesForConversation = async (otherUserId: string) => {
    try {
      const result = await getMessageHistory(otherUserId);
      if (result.success) {
        setMessages(result.messages || []);
        // Mark messages as read
        await markMessagesAsRead(otherUserId);
        // Update unread count in conversations
        setConversations(prev => 
          prev.map(conv => 
            conv.user_id === otherUserId 
              ? { ...conv, unread_count: 0 } 
              : conv
          )
        );
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Subscribe to real-time messages
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel(`messages:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new as Message;
          
          // Check if this message involves the current user
          if (newMessage.sender_id === user.id || newMessage.receiver_id === user.id) {
            // If we're viewing the conversation this message belongs to
            if (selectedConversation) {
              const isInCurrentConversation = 
                (newMessage.sender_id === selectedConversation.user_id && newMessage.receiver_id === user.id) ||
                (newMessage.sender_id === user.id && newMessage.receiver_id === selectedConversation.user_id);
              
              if (isInCurrentConversation) {
                setMessages(prev => [...prev, newMessage]);
                // Mark as read if we received it
                if (newMessage.receiver_id === user.id) {
                  markMessagesAsRead(selectedConversation.user_id);
                }
              }
            }
            
            // Update conversation list
            const otherUserId = newMessage.sender_id === user.id 
              ? newMessage.receiver_id 
              : newMessage.sender_id;
            
            setConversations(prev => {
              const existing = prev.find(c => c.user_id === otherUserId);
              if (existing) {
                return prev.map(c => 
                  c.user_id === otherUserId 
                    ? { 
                        ...c, 
                        last_message: newMessage.content,
                        last_message_time: newMessage.created_at,
                        unread_count: newMessage.receiver_id === user.id && 
                          (!selectedConversation || selectedConversation.user_id !== otherUserId)
                          ? c.unread_count + 1 
                          : c.unread_count
                      } 
                    : c
                );
              }
              return prev;
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, selectedConversation, supabase]);

  // Handle selecting a conversation
  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setShowMobileChat(true);
    fetchMessagesForConversation(conversation.user_id);
  };

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
        
        // If this is a new chat, add to conversations list
        if (newChatUser && !conversations.find(c => c.user_id === newChatUser.id)) {
          const newConv: Conversation = {
            id: newChatUser.id,
            user_id: newChatUser.id,
            user_name: newChatUser.name,
            user_avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newChatUser.name)}&background=14b8a6&color=fff`,
            last_message: messageInput,
            last_message_time: new Date().toISOString(),
            unread_count: 0,
          };
          setConversations(prev => [newConv, ...prev]);
          setNewChatUser(null);
        }
      } else {
        alert(`Error: ${result.error}`);
      }
    } finally {
      setIsSending(false);
    }
  };

  // Filter conversations by search
  const filteredConversations = conversations.filter(conv =>
    conv.user_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading || pageLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please log in to view messages
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-white dark:bg-slate-800 flex overflow-hidden">
      {/* SIDEBAR: CONVERSATIONS LIST */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-gray-200 dark:border-slate-700 flex flex-col bg-white dark:bg-slate-800 ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Messages</h2>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4">
              <GraduationCap className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-center mb-2">No student messages yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center">
                Messages from students who book sessions will appear here
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={selectedConversation?.id === conversation.id}
                onClick={() => handleSelectConversation(conversation)}
              />
            ))
          )}
        </div>
      </div>

      {/* MAIN AREA: ACTIVE CHAT */}
      <div className={`flex-1 flex flex-col ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center gap-3">
              {/* Back button for mobile */}
              <button
                onClick={() => setShowMobileChat(false)}
                className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              
              <img
                src={selectedConversation.user_avatar}
                alt={selectedConversation.user_name}
                className="w-10 h-10 rounded-full"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {selectedConversation.user_name}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-500">Online</span>
                  {selectedConversation.has_booking && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                      Student
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-slate-900">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <MessageCircle className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
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
            <div className="px-4 md:px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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
                  className="flex-1 px-4 py-3 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isSending || !messageInput.trim()}
                  className="px-4 py-3 bg-teal-500 text-white rounded-xl hover:bg-teal-600 disabled:bg-gray-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isSending ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900">
            <GraduationCap className="h-20 w-20 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">Select a conversation</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Choose from your student conversations
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
