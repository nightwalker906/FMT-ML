'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  memo,
  Fragment,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Search,
  X,
  Sparkles,
  CalendarDays,
  HelpCircle,
  FileText,
  Users,
  CornerDownLeft,
  Clock,
  Bot,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { API_BASE } from '@/lib/api-config';

// ─── Quick Actions ───────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    id: 'upcoming',
    icon: CalendarDays,
    label: 'Summarize my upcoming lessons',
    description: 'Get a quick overview of your scheduled sessions',
    query: 'Summarize my upcoming lessons for this week. What should I prepare for?',
    bgColor: 'bg-blue-500/10 dark:bg-blue-500/20',
    textColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    id: 'payouts',
    icon: HelpCircle,
    label: 'How do payouts work?',
    description: 'Platform payment and withdrawal policies',
    query:
      'How do payouts work on the Find My Tutor platform? Explain the process, timing, and any fees.',
    bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    textColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'lesson-plan',
    icon: FileText,
    label: 'Generate a lesson plan template',
    description: 'Create a structured plan for your next session',
    query:
      'Generate a professional lesson plan template I can use for a 1-hour tutoring session. Include sections for objectives, materials, warm-up, main activity, and assessment.',
    bgColor: 'bg-purple-500/10 dark:bg-purple-500/20',
    textColor: 'text-purple-600 dark:text-purple-400',
  },
  {
    id: 'student-tips',
    icon: Users,
    label: 'Tips for engaging struggling students',
    description: 'Strategies to motivate and support learners',
    query:
      'Give me practical tips for engaging students who are struggling or unmotivated during online tutoring sessions.',
    bgColor: 'bg-amber-500/10 dark:bg-amber-500/20',
    textColor: 'text-amber-600 dark:text-amber-400',
  },
];

const RECENT_KEY = 'fmt_cmd_center_recent';
const MAX_RECENT = 5;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRecent() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRecent(q) {
  if (typeof window === 'undefined' || !q?.trim()) return;
  try {
    const list = getRecent().filter((r) => r !== q);
    list.unshift(q);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch {
    /* silent */
  }
}

function usePlatformKey() {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(
      typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent)
    );
  }, []);
  return isMac;
}

// ─── Animations ──────────────────────────────────────────────────────────────

const overlayV = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

const modalV = {
  hidden: { opacity: 0, scale: 0.96, y: -20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', damping: 28, stiffness: 380 },
  },
  exit: { opacity: 0, scale: 0.96, y: -10, transition: { duration: 0.12 } },
};

const resultV = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const itemV = {
  hidden: { opacity: 0, x: -8 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.04 + i * 0.035, duration: 0.22 },
  }),
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const ThinkingDots = memo(function ThinkingDots() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-center gap-3 px-5 py-4"
    >
      <div className="relative flex-shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Bot size={14} className="text-white" />
        </div>
        <motion.div
          className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600"
          animate={{ opacity: [0.4, 0.1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-indigo-400"
              animate={{ y: [0, -5, 0], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
            />
          ))}
        </div>
        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
          AI is thinking…
        </span>
      </div>
    </motion.div>
  );
});

const AIResult = memo(function AIResult({ content, query, timestamp }) {
  return (
    <motion.div variants={resultV} initial="hidden" animate="visible" className="px-5 py-4">
      {/* Query echo */}
      <div className="flex items-start gap-2.5 mb-4">
        <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center mt-0.5">
          <Search size={12} className="text-slate-500 dark:text-slate-400" />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
          {query}
        </p>
      </div>

      {/* Answer */}
      <div className="flex items-start gap-2.5">
        <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mt-0.5 shadow-sm shadow-indigo-500/20">
          <Sparkles size={12} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:my-2 prose-headings:text-base prose-li:my-0.5 prose-pre:my-2 prose-code:text-indigo-600 dark:prose-code:text-indigo-400 prose-code:bg-indigo-50 dark:prose-code:bg-indigo-950/40 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:rounded-xl prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-strong:text-slate-900 dark:prose-strong:text-white">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
          {timestamp && (
            <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-2 flex items-center gap-1">
              <Clock size={9} />
              {new Date(timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
});

// ─── Exported Trigger ────────────────────────────────────────────────────────

export const CommandCenterTrigger = memo(function CommandCenterTrigger({ onClick }) {
  const isMac = usePlatformKey();
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 w-full max-w-md px-4 py-2.5 bg-slate-100/80 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer"
    >
      <Search
        size={16}
        className="text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 transition-colors"
      />
      <span className="flex-1 text-left text-sm text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors truncate">
        Ask AI or search…
      </span>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md shadow-sm">
        {isMac ? '⌘' : 'Ctrl'}
        <span>K</span>
      </kbd>
    </button>
  );
});

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TutorCommandCenter() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [recentQueries, setRecentQueries] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(-1);

  const inputRef = useRef(null);
  const resultRef = useRef(null);

  // ── Cmd+K / Ctrl+K global shortcut ──
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((p) => !p);
      }
      if (e.key === 'Escape' && isOpen) close();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  // ── Focus on open ──
  useEffect(() => {
    if (isOpen) {
      setRecentQueries(getRecent());
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // ── Scroll to result ──
  useEffect(() => {
    if (result)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
  }, [result]);

  const close = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => {
      setQuery('');
      setResult(null);
      setError(null);
      setSelectedIdx(-1);
    }, 200);
  }, []);

  // ── Submit ──
  const submit = useCallback(
    async (text) => {
      const q = (text || query).trim();
      if (!q || isLoading) return;

      setQuery(q);
      setError(null);
      setResult(null);
      setIsLoading(true);
      saveRecent(q);

      try {
        const res = await fetch(`${API_BASE}/ai/tutor-command/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, tutor_id: user?.id || null }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || `Request failed (${res.status})`);
        }

        const data = await res.json();
        setResult({
          content: data.answer || "I couldn't generate a response. Please try again.",
          query: q,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        setError(err.message || 'Something went wrong. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [query, isLoading, user]
  );

  // ── Keyboard nav ──
  const onInputKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!result && !query.trim() && selectedIdx >= 0 && selectedIdx < QUICK_ACTIONS.length) {
        submit(QUICK_ACTIONS[selectedIdx].query);
      } else {
        submit();
      }
    }
    if (e.key === 'ArrowDown' && !result) {
      e.preventDefault();
      setSelectedIdx((p) => (p < QUICK_ACTIONS.length - 1 ? p + 1 : 0));
    }
    if (e.key === 'ArrowUp' && !result) {
      e.preventDefault();
      setSelectedIdx((p) => (p > 0 ? p - 1 : QUICK_ACTIONS.length - 1));
    }
  };

  const showEmpty = !result && !isLoading && !error;

  return (
    <>
      <CommandCenterTrigger onClick={() => setIsOpen(true)} />

      <AnimatePresence>
        {isOpen && (
          <Fragment>
            {/* Backdrop */}
            <motion.div
              variants={overlayV}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={close}
              className="fixed inset-0 z-[60] bg-black/40 dark:bg-black/60 backdrop-blur-sm"
            />

            {/* Modal */}
            <div className="fixed inset-0 z-[61] flex items-start justify-center pt-[12vh] sm:pt-[16vh] px-4">
              <motion.div
                variants={modalV}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="w-full max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* ── Input Bar ── */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/40">
                  <div className="flex-shrink-0">
                    {isLoading ? (
                      <Loader2 size={20} className="text-indigo-500 animate-spin" />
                    ) : (
                      <Search size={20} className="text-slate-400 dark:text-slate-500" />
                    )}
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setSelectedIdx(-1);
                    }}
                    onKeyDown={onInputKey}
                    placeholder="Ask anything about FMT, teaching, or your students…"
                    className="flex-1 bg-transparent text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                    disabled={isLoading}
                  />
                  {query && !isLoading && (
                    <button
                      onClick={() => {
                        setQuery('');
                        setResult(null);
                        setError(null);
                        inputRef.current?.focus();
                      }}
                      className="flex-shrink-0 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                  <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded">
                    ESC
                  </kbd>
                </div>

                {/* ── Body ── */}
                <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mx-5 mt-4 mb-2 px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl"
                      >
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Thinking */}
                  <AnimatePresence>{isLoading && <ThinkingDots />}</AnimatePresence>

                  {/* Result */}
                  <AnimatePresence>
                    {result && (
                      <div ref={resultRef}>
                        <AIResult
                          content={result.content}
                          query={result.query}
                          timestamp={result.timestamp}
                        />
                      </div>
                    )}
                  </AnimatePresence>

                  {/* Empty / Quick Actions */}
                  {showEmpty && (
                    <div className="px-2 py-3">
                      {/* Recent */}
                      {recentQueries.length > 0 && !query && (
                        <div className="mb-2">
                          <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            Recent
                          </p>
                          {recentQueries.slice(0, 3).map((rq, i) => (
                            <button
                              key={`recent-${i}`}
                              onClick={() => submit(rq)}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors group"
                            >
                              <Clock size={14} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />
                              <span className="text-sm text-slate-600 dark:text-slate-400 truncate flex-1 group-hover:text-slate-900 dark:group-hover:text-slate-200">
                                {rq}
                              </span>
                              <CornerDownLeft
                                size={12}
                                className="text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Quick Actions */}
                      <div>
                        <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          {query ? 'Suggestions' : 'Quick Actions'}
                        </p>
                        {QUICK_ACTIONS.filter(
                          (a) =>
                            !query ||
                            a.label.toLowerCase().includes(query.toLowerCase()) ||
                            a.description.toLowerCase().includes(query.toLowerCase())
                        ).map((action, i) => {
                          const Icon = action.icon;
                          const sel = selectedIdx === i;
                          return (
                            <motion.button
                              key={action.id}
                              custom={i}
                              variants={itemV}
                              initial="hidden"
                              animate="visible"
                              onClick={() => submit(action.query)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                                sel
                                  ? 'bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-800/30'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                              }`}
                            >
                              <div
                                className={`flex-shrink-0 w-8 h-8 rounded-lg ${action.bgColor} flex items-center justify-center transition-transform group-hover:scale-110`}
                              >
                                <Icon size={15} className={action.textColor} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-sm font-medium truncate ${
                                    sel
                                      ? 'text-indigo-700 dark:text-indigo-300'
                                      : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'
                                  }`}
                                >
                                  {action.label}
                                </p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                                  {action.description}
                                </p>
                              </div>
                              <ChevronRight
                                size={14}
                                className={`flex-shrink-0 transition-all ${
                                  sel
                                    ? 'text-indigo-400 translate-x-0 opacity-100'
                                    : 'text-slate-300 dark:text-slate-600 -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                                }`}
                              />
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Footer ── */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200/60 dark:border-slate-700/40 bg-slate-50/50 dark:bg-slate-800/30">
                  <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                    <Sparkles size={10} className="text-indigo-400" />
                    FMT AI Assistant
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                      <CornerDownLeft size={10} /> to send
                    </span>
                    <span className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                      ↑↓ navigate
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </Fragment>
        )}
      </AnimatePresence>
    </>
  );
}
