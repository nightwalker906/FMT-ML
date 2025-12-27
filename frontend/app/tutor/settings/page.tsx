'use client'

import { useState, useEffect, useRef } from 'react'
import { User, Lock, Bell, Camera, Save, Loader2, Check, DollarSign, Sun, Moon } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useTheme } from '@/context/theme-context'

export default function TutorSettingsPage() {
  const { theme, toggleTheme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Profile form states
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [bio, setBio] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  
  // Security form states
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // Preferences state
  const [emailNotifications, setEmailNotifications] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const supabase = createClient()
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      console.log('Auth user:', user, 'Auth error:', authError)
      
      if (authError || !user) {
        console.error('No authenticated user found')
        setLoading(false)
        return
      }

      setEmail(user.email || '')

      // Get profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      console.log('Profile query for user ID:', user.id)
      console.log('Tutor Profile data:', profile)
      console.log('Profile error:', profileError)

      if (profile) {
        console.log('Setting firstName to:', profile.first_name)
        console.log('Setting lastName to:', profile.last_name)
        setFirstName(profile.first_name || '')
        setLastName(profile.last_name || '')
        // Generate avatar from name (avatar_url column doesn't exist in profiles table)
        const generatedAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.first_name || '')}+${encodeURIComponent(profile.last_name || '')}&background=0d9488&color=fff`
        setAvatarUrl(generatedAvatar)
      } else {
        console.log('No profile found for user')
      }

      // Get tutor data (including phone_number which is in tutors table)
      const { data: tutor, error: tutorError } = await supabase
        .from('tutors')
        .select('profile_id, experience_years, hourly_rate, qualifications, teaching_style, bio_text, availability, average_rating, phone_number')
        .eq('profile_id', user.id)
        .single()

      console.log('Tutor specific data:', tutor)
      console.log('Tutor error:', tutorError)

      if (tutor) {
        setBio(tutor.bio_text || '')
        setHourlyRate(tutor.hourly_rate?.toString() || '')
        setPhone(tutor.phone_number || '')
      }

      // Get user settings
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('id', user.id)
        .single()

      console.log('Settings data:', settings, 'Settings error:', settingsError)

      if (settings) {
        setEmailNotifications(settings.notify_email_bookings ?? true)
      }

      setLoading(false)
    } catch (err) {
      console.error('Error loading settings:', err)
      setLoading(false)
    }
  }

  function showSuccess(section: string) {
    setSuccess(section)
    setTimeout(() => setSuccess(null), 3000)
  }

  function showError(message: string) {
    setError(message)
    setTimeout(() => setError(null), 5000)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setSaving('avatar')
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      showError('Not authenticated')
      setSaving(null)
      return
    }

    // Validate file
    if (!file.type.startsWith('image/')) {
      showError('File must be an image')
      setSaving(null)
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('File must be less than 5MB')
      setSaving(null)
      return
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/avatar.${fileExt}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      showError(uploadError.message)
      setSaving(null)
      return
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    // Update profile with avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)

    if (updateError) {
      console.error('Avatar update error:', updateError)
      showError('Failed to update profile with avatar')
      setSaving(null)
      return
    }

    setAvatarUrl(publicUrl)
    showSuccess('avatar')
    setSaving(null)
  }

  async function handleProfileSave() {
    setSaving('profile')
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      showError('Not authenticated')
      setSaving(null)
      return
    }

    // Update profiles table (without updated_at since it may not exist)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
      showError(profileError.message)
      setSaving(null)
      return
    }

    // Update tutors table (including phone_number)
    const { error: tutorError } = await supabase
      .from('tutors')
      .update({
        bio_text: bio,
        hourly_rate: parseFloat(hourlyRate) || 0,
        phone_number: phone
      })
      .eq('profile_id', user.id)

    if (tutorError) {
      console.error('Tutor update error:', tutorError)
      showError(tutorError.message)
    } else {
      showSuccess('profile')
    }
    setSaving(null)
  }

  async function handlePasswordChange() {
    if (newPassword !== confirmPassword) {
      showError('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      showError('Password must be at least 6 characters')
      return
    }

    setSaving('password')
    const supabase = createClient()
    
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      showError(error.message)
    } else {
      setNewPassword('')
      setConfirmPassword('')
      showSuccess('password')
    }
    setSaving(null)
  }

  async function handlePreferencesSave() {
    setSaving('preferences')
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      showError('Not authenticated')
      setSaving(null)
      return
    }

    // Upsert user settings (without updated_at since column may not exist)
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        id: user.id,
        notify_email_bookings: emailNotifications,
        notify_email_messages: emailNotifications
      })

    if (error) {
      console.error('Settings save error:', error)
      showError(error.message)
    } else {
      showSuccess('preferences')
    }
    setSaving(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-slate-400">Manage your tutor profile and preferences</p>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50">
          {error}
        </div>
      )}

      {/* Section A: Profile */}
      <section id="profile" className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
            <User className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Update your tutor information</p>
          </div>
        </div>

        {/* Avatar Upload */}
        <div className="flex items-center gap-6 mb-6">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-gray-400 dark:text-slate-400 text-2xl font-semibold">
                  {firstName?.[0]}{lastName?.[0]}
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={saving === 'avatar'}
              className="absolute bottom-0 right-0 p-2 bg-teal-600 rounded-full text-white hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {saving === 'avatar' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300">Profile Photo</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">JPG, PNG. Max 5MB</p>
            {success === 'avatar' && (
              <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                <Check className="h-3 w-3" /> Avatar updated!
              </p>
            )}
          </div>
        </div>

        {/* Profile Form */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
          />
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Email cannot be changed</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Hourly Rate ($)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
              <input
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="50"
                min="0"
                step="5"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
              />
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="Tell students about your experience, teaching style, and what makes you a great tutor..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
          />
        </div>

        <button
          onClick={handleProfileSave}
          disabled={saving === 'profile'}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          {saving === 'profile' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : success === 'profile' ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {success === 'profile' ? 'Saved!' : 'Save Changes'}
        </button>
      </section>

      {/* Section B: Security */}
      <section id="security" className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <Lock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Update your password</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
            />
          </div>
        </div>

        <button
          onClick={handlePasswordChange}
          disabled={saving === 'password' || !newPassword || !confirmPassword}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
        >
          {saving === 'password' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : success === 'password' ? (
            <Check className="h-4 w-4" />
          ) : (
            <Lock className="h-4 w-4" />
          )}
          {success === 'password' ? 'Password Changed!' : 'Change Password'}
        </button>
      </section>

      {/* Section C: Preferences */}
      <section id="preferences" className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Bell className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Preferences</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Manage your notification settings</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="h-5 w-5 text-slate-400" />
              ) : (
                <Sun className="h-5 w-5 text-amber-500" />
              )}
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Dark Mode</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {theme === 'dark' ? 'Currently using dark theme' : 'Currently using light theme'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                theme === 'dark' ? 'bg-teal-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Email Notifications</p>
              <p className="text-sm text-gray-500 dark:text-slate-400">Receive email updates about bookings and student requests</p>
            </div>
            <button
              onClick={() => setEmailNotifications(!emailNotifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                emailNotifications ? 'bg-teal-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  emailNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <button
          onClick={handlePreferencesSave}
          disabled={saving === 'preferences'}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          {saving === 'preferences' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : success === 'preferences' ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {success === 'preferences' ? 'Saved!' : 'Save Preferences'}
        </button>
      </section>
    </div>
  )
}
