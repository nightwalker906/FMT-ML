'use client';

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Trash2,
  Copy,
  Check,
  BookOpen,
  Lightbulb,
  FlaskConical,
  PenLine,
  ChevronDown,
  RotateCcw,
  Zap,
  Globe,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { API_BASE } from '@/lib/api-config';
import { fetchJsonWithRetry } from '@/lib/fetch-json-with-retry';

// ─── Constants ───────────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  {
    icon: BookOpen,
    label: 'Explain Calculus limits',
    message:
      'Can you explain the concept of limits in Calculus? I want to understand both the intuition and the formal definition.',
    color: 'from-blue-500 to-indigo-500',
  },
  {
    icon: PenLine,
    label: 'Structure an essay',
    message:
      'Help me structure a persuasive essay. What are the key components and how should I organize my arguments?',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: FlaskConical,
    label: 'What is quantum physics?',
    message:
      "What is quantum physics? Explain it simply, like I'm a high school student.",
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Lightbulb,
    label: 'Python data structures',
    message:
      'Explain the main data structures in Python (lists, tuples, sets, dictionaries) with examples of when to use each one.',
    color: 'from-amber-500 to-orange-500',
  },
];

// ─── Animation Variants ─────────────────────────────────────────────────────

const messageVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

const chipVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.3 + i * 0.08,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

// ─── Typing Indicator ────────────────────────────────────────────────────────

const TypingIndicator = memo(function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className="flex items-start gap-3 max-w-[85%]"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
        <Bot size={16} className="text-white" />
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 rounded-2xl rounded-tl-md px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-indigo-400 dark:bg-indigo-500"
                animate={{
                  y: [0, -6, 0],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500 ml-1 font-medium">
            Thinking…
          </span>
        </div>
      </div>
    </motion.div>
  );
});

// ─── Copy Button ─────────────────────────────────────────────────────────────

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
      title="Copy"
    >
      {copied ? (
        <Check size={14} className="text-green-500" />
      ) : (
        <Copy size={14} />
      )}
    </button>
  );
}

// ─── Message Bubble ──────────────────────────────────────────────────────────

const MessageBubble = memo(function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      layout
      className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''} group`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-lg ${
          isUser
            ? 'bg-gradient-to-br from-indigo-500 to-blue-600 shadow-indigo-500/20'
            : 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-purple-500/20'
        }`}
      >
        {isUser ? (
          <User size={15} className="text-white" />
        ) : (
          <Bot size={15} className="text-white" />
        )}
      </div>

      {/* Content */}
      <div
        className={`max-w-[80%] relative ${isUser ? 'items-end' : 'items-start'}`}
      >
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-tr-md shadow-lg shadow-indigo-500/15'
              : 'bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 text-slate-800 dark:text-slate-200 rounded-tl-md shadow-sm'
          }`}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:my-2 prose-li:my-0.5 prose-pre:my-2 prose-code:text-indigo-600 dark:prose-code:text-indigo-400 prose-code:bg-indigo-50 dark:prose-code:bg-indigo-950/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:rounded-xl prose-pre:border prose-pre:border-slate-700 prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-strong:text-slate-900 dark:prose-strong:text-white">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Metadata row */}
        <div
          className={`flex items-center gap-2 mt-1.5 px-1 ${
            isUser ? 'justify-end' : 'justify-start'
          }`}
        >
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {!isUser && <CopyButton text={message.content} />}
          {message.has_sources && (
            <span className="text-[10px] text-indigo-400 dark:text-indigo-500 flex items-center gap-0.5">
              <Globe size={10} /> Web-enhanced
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
});

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onSelectPrompt }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      {/* Hero icon */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative mb-6"
      >
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
          <Sparkles size={36} className="text-white" />
        </div>
        {/* Glow ring */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-500 blur-xl opacity-30 -z-10 scale-110" />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="text-2xl font-bold text-slate-900 dark:text-white mb-2"
      >
        Hey! I&apos;m your Quick Tutor
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="text-slate-500 dark:text-slate-400 text-center max-w-md mb-8 text-sm leading-relaxed"
      >
        Ask me anything about your homework, study topics, or concepts
        you&apos;re struggling with. I&apos;ll guide you step by step — not
        just give answers.
      </motion.p>

      {/* Suggested prompts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {SUGGESTED_PROMPTS.map((prompt, i) => {
          const Icon = prompt.icon;
          return (
            <motion.button
              key={prompt.label}
              custom={i}
              variants={chipVariants}
              initial="hidden"
              animate="visible"
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelectPrompt(prompt.message)}
              className="group relative flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 bg-white dark:bg-slate-800/80 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg hover:shadow-indigo-500/10 transition-all text-left"
            >
              <div
                className={`flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br ${prompt.color} flex items-center justify-center shadow-sm`}
              >
                <Icon size={16} className="text-white" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors leading-snug">
                {prompt.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Scroll-to-bottom FAB ────────────────────────────────────────────────────

function ScrollToBottomFAB({ visible, onClick }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          onClick={onClick}
          className="absolute bottom-24 right-6 z-20 p-2.5 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-lg hover:shadow-xl transition-shadow"
        >
          <ChevronDown
            size={18}
            className="text-slate-600 dark:text-slate-300"
          />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function QuickTutor() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const chatContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const bottomRef = useRef(null);

  // ── Auto-scroll to bottom ──
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // ── Detect scroll position for FAB ──
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 120);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Auto-resize textarea ──
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  // ── Send message ──
  const sendMessage = useCallback(
    async (text) => {
      const content = (text || input).trim();
      if (!content || isLoading) return;

      setInput('');
      setError(null);

      const userMsg = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        // Build conversation history for context (last 10 messages)
        const history = messages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const data = await fetchJsonWithRetry(`${API_BASE}/ai/quick-tutor/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: content,
            history,
            student_id: user?.id || null,
          }),
          timeoutMs: 60000,
          retries: 1,
        });

        const aiMsg = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content:
            data.answer ||
            data.response ||
            "I couldn't generate a response. Please try again.",
          timestamp: new Date().toISOString(),
          has_sources: data.has_sources || false,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } catch (err) {
        console.error('Quick Tutor error:', err);
        setError(err.message || 'Something went wrong. Please try again.');
      } finally {
        setIsLoading(false);
        setTimeout(() => textareaRef.current?.focus(), 50);
      }
    },
    [input, isLoading, messages, user]
  );

  // ── Handle keyboard ──
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Clear chat ──
  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  // ── Retry last ──
  const retryLast = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      setMessages((prev) => {
        const idx = prev.length - 1;
        if (idx >= 0 && prev[idx].role === 'assistant') {
          return prev.slice(0, -1);
        }
        return prev;
      });
      setError(null);
      sendMessage(lastUserMsg.content);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200/60 dark:border-slate-700/40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Sparkles size={20} className="text-white" />
            </div>
            {/* Online pulse */}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            </span>
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Quick Tutor AI
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white tracking-wide uppercase">
                Beta
              </span>
            </h1>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <Zap size={10} /> Online &middot; Search-backed tutoring
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={clearChat}
              className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Clear chat"
            >
              <Trash2 size={18} />
            </motion.button>
          )}
        </div>
      </div>

      {/* ── Chat Area ── */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto relative">
        {isEmpty ? (
          <EmptyState onSelectPrompt={sendMessage} />
        ) : (
          <div className="px-4 md:px-6 py-6 space-y-6">
            <AnimatePresence mode="popLayout">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            <AnimatePresence>
              {isLoading && <TypingIndicator />}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-2xl max-w-[80%]"
                >
                  <p className="text-sm text-red-600 dark:text-red-400 flex-1">
                    {error}
                  </p>
                  <button
                    onClick={retryLast}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
                    title="Retry"
                  >
                    <RotateCcw size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={bottomRef} />
          </div>
        )}

        {/* Scroll-to-bottom FAB */}
        <ScrollToBottomFAB
          visible={showScrollBtn}
          onClick={() => scrollToBottom()}
        />
      </div>

      {/* ── Input Area ── */}
      <div className="border-t border-slate-200/60 dark:border-slate-700/40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-4 md:px-6 py-4">
        <div className="relative flex items-end gap-3 max-w-3xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your studies…"
              rows={1}
              disabled={isLoading}
              className="w-full resize-none rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3.5 pr-12 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 dark:focus:border-indigo-600 transition-all disabled:opacity-50"
              style={{ maxHeight: '160px' }}
            />
            <div className="absolute right-2 bottom-2 text-[10px] text-slate-300 dark:text-slate-600 select-none pointer-events-none">
              {input.length > 0 && `${input.length}`}
            </div>
          </div>

          {/* Send Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed transition-all"
          >
            <Send size={18} className="translate-x-[1px]" />
          </motion.button>
        </div>

        <p className="text-center text-[10px] text-slate-400 dark:text-slate-600 mt-2.5">
          Quick Tutor can make mistakes. Verify important information with your
          teacher.
        </p>
      </div>
    </div>
  );
}
