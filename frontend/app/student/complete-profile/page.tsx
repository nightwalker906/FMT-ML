'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { createClient } from '@/utils/supabase/client';
import { User, BookOpen, Target, Brain, ArrowRight, Loader2 } from 'lucide-react';

const GRADE_LEVELS = [
  'Elementary School',
  'Middle School',
  'High School',
  'Undergraduate',
  'Graduate',
  'Professional',
];

const LEARNING_STYLES = [
  'Visual',
  'Auditory',
  'Reading/Writing',
  'Kinesthetic',
];

const SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'History',
  'Computer Science',
  'Economics',
];

export default function StudentCompleteProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [preferredSubjects, setPreferredSubjects] = useState<string[]>([]);
  const [learningGoals, setLearningGoals] = useState('');
  const [learningStyle, setLearningStyle] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      // Fetch existing profile and student data
      const fetchExistingData = async () => {
        try {
          // Fetch profile data (first_name, last_name)
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', user.id)
            .single();

          console.log('Profile data:', profileData, 'Error:', profileError);

          if (profileData) {
            setFirstName(profileData.first_name || '');
            setLastName(profileData.last_name || '');
          }

          // Fetch student data (phone_number)
          const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('grade_level, preferred_subjects, learning_goals, learning_style, phone_number')
            .eq('profile_id', user.id)
            .single();

          console.log('Student data:', studentData, 'Error:', studentError);

          if (studentData) {
            setGradeLevel(studentData.grade_level || '');
            setPreferredSubjects(studentData.preferred_subjects || []);
            setLearningGoals(Array.isArray(studentData.learning_goals) ? studentData.learning_goals.join('\n') : '');
            setLearningStyle(studentData.learning_style || '');
            setPhoneNumber(studentData.phone_number || '');
          }
        } catch (err) {
          console.error('Error fetching existing data:', err);
        } finally {
          setInitialLoading(false);
        }
      };

      fetchExistingData();
    }
  }, [user, authLoading, router, supabase]);

  const toggleSubject = (subject: string) => {
    setPreferredSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]
    );
  };

  const handleSubmit = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Check if student record exists
      const { data: existingStudent } = await supabase
        .from('students')
        .select('profile_id')
        .eq('profile_id', user.id)
        .single();

      if (existingStudent) {
        // Update existing student record (includes phone_number)
        const { error: studentError } = await supabase
          .from('students')
          .update({
            grade_level: gradeLevel,
            preferred_subjects: preferredSubjects,
            learning_goals: learningGoals.split('\n').filter((g) => g.trim()),
            learning_style: learningStyle,
            phone_number: phoneNumber || null,
          })
          .eq('profile_id', user.id);

        if (studentError) throw studentError;
      } else {
        // Insert new student record (includes phone_number)
        const { error: studentError } = await supabase
          .from('students')
          .insert({
            profile_id: user.id,
            grade_level: gradeLevel,
            preferred_subjects: preferredSubjects,
            learning_goals: learningGoals.split('\n').filter((g) => g.trim()),
            learning_style: learningStyle,
            phone_number: phoneNumber || null,
          });
            learning_goals: learningGoals.split('\n').filter((g) => g.trim()),
            learning_style: learningStyle,
          });

        if (studentError) throw studentError;
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      console.error('Profile completion error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const canProceedStep1 = firstName.trim() && lastName.trim();
  const canProceedStep2 = gradeLevel && preferredSubjects.length > 0;
  const canSubmit = learningStyle;

  if (authLoading || initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-teal-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Complete Your Profile
          </h1>
          <p className="text-slate-600">
            Help us personalize your learning experience
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  step >= s
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`w-16 h-1 mx-2 rounded ${
                    step > s ? 'bg-teal-600' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-teal-100 rounded-lg">
                  <User className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Personal Information
                  </h2>
                  <p className="text-slate-500 text-sm">
                    Let's start with your name
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all bg-white text-gray-900 placeholder-gray-400"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all bg-white text-gray-900 placeholder-gray-400"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all bg-white text-gray-900 placeholder-gray-400"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                className="w-full mt-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                Continue <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Step 2: Academic Info */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-teal-100 rounded-lg">
                  <BookOpen className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Academic Preferences
                  </h2>
                  <p className="text-slate-500 text-sm">
                    Tell us about your learning needs
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Grade Level *
                </label>
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all bg-white text-gray-900"
                >
                  <option value="">Select your grade level</option>
                  {GRADE_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Subjects You Need Help With *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SUBJECTS.map((subject) => (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => toggleSubject(subject)}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        preferredSubjects.includes(subject)
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      {subject}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!canProceedStep2}
                  className="flex-1 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  Continue <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Goals & Style */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-teal-100 rounded-lg">
                  <Target className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Goals & Learning Style
                  </h2>
                  <p className="text-slate-500 text-sm">
                    Help tutors understand how you learn best
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Learning Goals
                </label>
                <textarea
                  value={learningGoals}
                  onChange={(e) => setLearningGoals(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all resize-none bg-white text-gray-900 placeholder-gray-400"
                  placeholder="What do you want to achieve? (one goal per line)&#10;e.g., Improve my math grades&#10;Prepare for SAT exams"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Learning Style *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {LEARNING_STYLES.map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setLearningStyle(style)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        learningStyle === style
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Brain
                          className={`w-5 h-5 ${
                            learningStyle === style
                              ? 'text-teal-600'
                              : 'text-slate-400'
                          }`}
                        />
                        <span
                          className={`font-medium ${
                            learningStyle === style
                              ? 'text-teal-700'
                              : 'text-slate-700'
                          }`}
                        >
                          {style}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || loading}
                  className="flex-1 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>Complete Profile</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
