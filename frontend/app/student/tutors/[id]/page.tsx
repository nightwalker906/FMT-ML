'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/auth-context';
import {
  Star,
  MapPin,
  DollarSign,
  Clock,
  Award,
  MessageSquare,
  BookOpen,
  ArrowLeft,
  Loader2,
  Heart,
  Share2,
  Check,
  Phone,
  Send,
  X,
} from 'lucide-react';

interface TutorDetail {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  location?: string;
  is_online: boolean;
  experience_years: number;
  hourly_rate: number;
  teaching_style: string;
  qualifications: string[];
  bio_text: string;
  availability: Record<string, any>;
  average_rating: number;
  reviews_count: number;
  total_students?: number;
  response_time?: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export default function TutorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();
  const tutorId = params.id as string;

  const [tutor, setTutor] = useState<TutorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    fetchTutorDetails();
  }, [tutorId]);

  // Load chat when modal opens
  useEffect(() => {
    if (showChat && user) {
      loadChatMessages();
    }
  }, [showChat, user]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          // Listen for messages in BOTH directions:
          // 1. Messages FROM tutor TO student (tutor replies)
          // 2. Messages FROM student TO tutor (student sends)
          filter: `or(and(sender_id.eq.${tutorId},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${tutorId}))`,
        },
        (payload) => {
          // Only add if not already in messages (avoid duplicates)
          const newMsg = payload.new as Message;
          const messageExists = messages.some((m) => m.id === newMsg.id);
          if (!messageExists) {
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, tutorId, messages]);

  async function fetchTutorDetails() {
    try {
      setLoading(true);
      setError(null);

      // Fetch tutor profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', tutorId)
        .single();

      if (profileError) throw profileError;

      // Fetch tutor-specific data
      const { data: tutorData, error: tutorError } = await supabase
        .from('tutors')
        .select('*')
        .eq('profile_id', tutorId)
        .single();

      if (tutorError) throw tutorError;

      // Fetch reviews
      const { data: reviewData } = await supabase
        .from('ratings')
        .select('*')
        .eq('tutor_id', tutorId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch total students (count of unique students who rated this tutor)
      const { count: studentCount } = await supabase
        .from('ratings')
        .select('*', { count: 'exact', head: true })
        .eq('tutor_id', tutorId);

      // Calculate availability string
      let availabilityDays = '';
      if (tutorData.availability?.days && Array.isArray(tutorData.availability.days)) {
        availabilityDays = tutorData.availability.days.join(', ');
      }

      setTutor({
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        phone_number: tutorData.phone_number,
        location: tutorData.location,
        is_online: profile.is_online,
        experience_years: tutorData.experience_years,
        hourly_rate: tutorData.hourly_rate,
        teaching_style: tutorData.teaching_style,
        qualifications: tutorData.qualifications || [],
        bio_text: tutorData.bio_text,
        availability: tutorData.availability || {},
        average_rating: tutorData.average_rating,
        reviews_count: reviewData?.length || 0,
        total_students: studentCount || 0,
        response_time: availabilityDays || 'Flexible',
      });

      setReviews(reviewData || []);
    } catch (err) {
      console.error('Error fetching tutor details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tutor details');
    } finally {
      setLoading(false);
    }
  }

  async function loadChatMessages() {
    if (!user) return;

    try {
      setChatLoading(true);

      // Fetch conversation between current user and tutor
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${tutorId}),and(sender_id.eq.${tutorId},receiver_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', user.id)
        .eq('sender_id', tutorId);
    } catch (err) {
      console.error('Error loading chat messages:', err);
    } finally {
      setChatLoading(false);
    }
  }

  async function sendMessage() {
    if (!user || !newMessage.trim()) return;

    try {
      setSendingMessage(true);

      // Create message object for immediate display
      const messageContent = newMessage.trim();
      const newMsg: Message = {
        id: `temp-${Date.now()}`, // Temporary ID until inserted
        sender_id: user.id,
        receiver_id: tutorId,
        content: messageContent,
        created_at: new Date().toISOString(),
        is_read: false,
      };

      // Add message to state immediately (optimistic update)
      setMessages((prev) => [...prev, newMsg]);

      // Then insert to database
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: user.id,
            receiver_id: tutorId,
            content: messageContent,
          },
        ])
        .select();

      if (error) throw error;

      // Replace temporary message with real one from database
      if (data && data[0]) {
        setMessages((prev) =>
          prev.map((m) => (m.id === newMsg.id ? (data[0] as Message) : m))
        );
      }

      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message');
      // Remove the optimistic message on error
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
    } finally {
      setSendingMessage(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-teal-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (error || !tutor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-teal-600 hover:text-teal-700 mb-6"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <p className="text-red-600 text-lg">{error || 'Tutor not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header with Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-teal-600 hover:text-teal-700 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Results
        </button>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Top Section with Basic Info */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-6 sm:px-8 py-12">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <img
                src={`https://ui-avatars.com/api/?name=${tutor.first_name}+${tutor.last_name}&background=0d9488&color=fff&size=120`}
                alt={`${tutor.first_name} ${tutor.last_name}`}
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-lg"
              />

              {/* Info */}
              <div className="flex-1 pt-2">
                <div className="flex items-center gap-2 mb-2">
                  {tutor.is_online && (
                    <span className="inline-block w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                  )}
                  <span className={`text-sm font-semibold ${tutor.is_online ? 'text-green-100' : 'text-white'}`}>
                    {tutor.is_online ? 'Online now' : 'Offline'}
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                  {tutor.first_name} {tutor.last_name}
                </h1>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                    <span className="text-white font-semibold">{tutor.average_rating?.toFixed(1) || 'N/A'}</span>
                    <span className="text-teal-100">({tutor.reviews_count} reviews)</span>
                  </div>
                  <div className="flex items-center gap-1 text-teal-100">
                    <Clock className="w-5 h-5" />
                    <span>{tutor.experience_years}+ years experience</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`p-3 rounded-full transition-all ${
                    isFavorite
                      ? 'bg-red-500 text-white'
                      : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                  }`}
                >
                  <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
                <button className="p-3 bg-white bg-opacity-20 text-white rounded-full hover:bg-opacity-30 transition-all">
                  <Share2 size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="px-6 sm:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Teaching Style & Qualifications */}
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">About</h2>
                  {tutor.bio_text && (
                    <p className="text-slate-600 text-lg mb-6 leading-relaxed">{tutor.bio_text}</p>
                  )}
                  {tutor.teaching_style && (
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
                      <h3 className="font-semibold text-teal-900 mb-2">Teaching Style</h3>
                      <p className="text-teal-800">{tutor.teaching_style}</p>
                    </div>
                  )}
                </div>

                {/* Qualifications */}
                {tutor.qualifications && tutor.qualifications.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Award className="w-6 h-6 text-teal-600" />
                      Qualifications & Subjects
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {tutor.qualifications.map((qual, idx) => (
                        <div
                          key={idx}
                          className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2"
                        >
                          <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          <span className="font-medium text-blue-900">{qual}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reviews */}
                {reviews.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Recent Reviews</h2>
                    <div className="space-y-4">
                      {reviews.map((review, idx) => (
                        <div
                          key={idx}
                          className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  size={16}
                                  className={`${
                                    i < (review.rating || 0)
                                      ? 'text-yellow-400 fill-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-slate-500">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {review.comment && (
                            <p className="text-slate-600 text-sm">{review.comment}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                {/* Pricing Card */}
                <div className="bg-gradient-to-br from-teal-50 to-blue-50 border border-teal-200 rounded-xl p-6 mb-6 sticky top-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-slate-600 font-medium">Hourly Rate</span>
                    <DollarSign className="w-5 h-5 text-teal-600" />
                  </div>
                  <p className="text-4xl font-bold text-slate-900 mb-6">
                    ${tutor.hourly_rate}
                    <span className="text-lg text-slate-600">/hr</span>
                  </p>

                  {/* CTA Buttons */}
                  <div className="space-y-3">
                    <button 
                      onClick={() => setShowChat(true)}
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <MessageSquare size={18} />
                      Send Message
                    </button>
                    <button className="w-full border-2 border-teal-600 text-teal-600 hover:bg-teal-50 font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
                      <BookOpen size={18} />
                      Book Session
                    </button>
                  </div>
                </div>

                {/* Info Cards */}
                <div className="space-y-3">
                  {tutor?.phone_number && (
                    <div className="bg-slate-50 rounded-lg p-4 flex items-center gap-3">
                      <Phone className="w-5 h-5 text-teal-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">
                          Phone
                        </p>
                        <a href={`tel:${tutor.phone_number}`} className="text-slate-900 font-semibold hover:text-teal-600">
                          {tutor.phone_number}
                        </a>
                      </div>
                    </div>
                  )}
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">
                      Response Time
                    </p>
                    <p className="text-slate-900 font-semibold">Usually within 1 hour</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">
                      Total Students
                    </p>
                    <p className="text-slate-900 font-semibold">{tutor?.total_students || 0}+ students</p>
                  </div>
                  {tutor?.location && (
                    <div className="bg-slate-50 rounded-lg p-4 flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-teal-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">
                          Location
                        </p>
                        <p className="text-slate-900 font-semibold">{tutor.location}</p>
                      </div>
                    </div>
                  )}
                  {tutor?.availability?.days && (
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">
                        Available Days
                      </p>
                      <p className="text-slate-900 font-semibold capitalize">{tutor.response_time}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Modal */}
      {showChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md h-[600px] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div>
                <h3 className="text-lg font-bold text-white">Chat with {tutor?.first_name}</h3>
                <p className="text-teal-100 text-sm">
                  {tutor?.is_online ? '🟢 Online' : '⚫ Offline'}
                </p>
              </div>
              <button
                onClick={() => setShowChat(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {chatLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-slate-400 text-center">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.sender_id === user?.id
                          ? 'bg-teal-600 text-white rounded-br-none'
                          : 'bg-white text-slate-900 border border-slate-200 rounded-bl-none'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.sender_id === user?.id ? 'text-teal-100' : 'text-slate-400'
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Area */}
            <div className="border-t border-slate-200 p-4 bg-white rounded-b-xl">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !sendingMessage) {
                      sendMessage();
                    }
                  }}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  disabled={sendingMessage}
                />
                <button
                  onClick={sendMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                  className="bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white rounded-lg px-4 py-2 transition-colors flex items-center gap-2"
                >
                  {sendingMessage ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
