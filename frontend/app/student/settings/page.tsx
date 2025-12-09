'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import {
  updateProfile,
  uploadAvatar,
  updateNotificationSettings,
  getNotificationSettings,
} from '@/app/actions';
import {
  User,
  Lock,
  Bell,
  CreditCard,
  LogOut,
  Upload,
  Save,
} from 'lucide-react';

type Tab = 'profile' | 'security' | 'notifications' | 'billing';

interface NotificationSettingsType {
  email_on_session_accepted: boolean;
  email_on_message: boolean;
  marketing_emails: boolean;
}

export default function SettingsPage() {
  const { user, signOut, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [isSaving, setIsSaving] = useState(false);

  // Profile State
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [learningGoals, setLearningGoals] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  // Security State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationSettingsType>({
    email_on_session_accepted: true,
    email_on_message: true,
    marketing_emails: false,
  });

  // Load user data on mount
  useEffect(() => {
    if (!user) return;

    // Load from user metadata
    const metadata = user.user_metadata || {};
    setDisplayName(metadata.display_name || user.email?.split('@')[0] || '');
    setBio(metadata.bio || '');
    setLearningGoals(metadata.learning_goals || '');
    setAvatarPreview(
      metadata.avatar_url ||
        `https://ui-avatars.com/api/?name=${metadata.display_name || user.email}`
    );

    // Load notification settings
    const loadNotifications = async () => {
      const result = await getNotificationSettings();
      if (result.success) {
        setNotifications(result.settings);
      }
    };

    loadNotifications();
  }, [user]);

  // Handle avatar file change
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle profile save
  const handleProfileSave = async () => {
    setIsSaving(true);
    try {
      let avatarUrl = '';

      // Upload avatar if selected
      if (avatarFile) {
        const uploadResult = await uploadAvatar(avatarFile);
        if (uploadResult.success) {
          avatarUrl = uploadResult.avatarUrl;
        }
      }

      // Update profile
      const result = await updateProfile(displayName, bio, learningGoals);
      if (result.success) {
        alert('Profile updated successfully!');
        setAvatarFile(null);
      } else {
        alert(`Error: ${result.error}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Handle notification save
  const handleNotificationSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateNotificationSettings(
        notifications.email_on_session_accepted,
        notifications.email_on_message,
        notifications.marketing_emails
      );

      if (result.success) {
        alert('Notification settings updated!');
      } else {
        alert(`Error: ${result.error}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Please log in to access settings
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">
            Manage your account and preferences
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1">
            <nav className="space-y-2 sticky top-8">
              {[
                { id: 'profile' as Tab, label: 'Profile', icon: User },
                { id: 'security' as Tab, label: 'Security', icon: Lock },
                { id: 'notifications' as Tab, label: 'Notifications', icon: Bell },
                { id: 'billing' as Tab, label: 'Billing', icon: CreditCard },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === id
                      ? 'bg-teal-500 text-white'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{label}</span>
                </button>
              ))}
            </nav>

            {/* Logout Button */}
            <button
              onClick={() => signOut()}
              className="w-full mt-8 flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow">
              {/* PROFILE TAB */}
              {activeTab === 'profile' && (
                <div className="p-6 space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">
                      Public Profile
                    </h2>

                    {/* Avatar Upload */}
                    <div className="mb-8">
                      <label className="block text-sm font-medium text-gray-700 mb-4">
                        Profile Picture
                      </label>
                      <div className="flex items-end gap-4">
                        <img
                          src={avatarPreview}
                          alt="Profile"
                          className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                        />
                        <div className="flex-1">
                          <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors">
                            <Upload size={18} />
                            <span>Upload Image</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleAvatarChange}
                              className="hidden"
                            />
                          </label>
                          <p className="text-sm text-gray-500 mt-2">
                            JPG, PNG up to 5MB
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Display Name */}
                    <div className="mb-6">
                      <label
                        htmlFor="displayName"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Display Name
                      </label>
                      <input
                        id="displayName"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="Your name"
                      />
                    </div>

                    {/* Email (Read-only) */}
                    <div className="mb-6">
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Email Address
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={user.email || ''}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                      <p className="text-sm text-gray-500 mt-2">
                        Contact support to change email
                      </p>
                    </div>

                    {/* Bio */}
                    <div className="mb-6">
                      <label
                        htmlFor="bio"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Bio
                      </label>
                      <textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="Tell tutors about yourself..."
                      />
                    </div>

                    {/* Learning Goals */}
                    <div className="mb-6">
                      <label
                        htmlFor="learningGoals"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Learning Goals
                      </label>
                      <textarea
                        id="learningGoals"
                        value={learningGoals}
                        onChange={(e) => setLearningGoals(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="What subjects do you want to learn?"
                      />
                    </div>

                    {/* Save Button */}
                    <button
                      onClick={handleProfileSave}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSaving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Save size={18} />
                      )}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SECURITY TAB */}
              {activeTab === 'security' && (
                <div className="p-6 space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">
                      Account Security
                    </h2>

                    {/* Email (Read-only) */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <div className="p-3 bg-gray-50 rounded-lg text-gray-600 border border-gray-300">
                        {user.email}
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        Email cannot be changed directly. Contact support for
                        email changes.
                      </p>
                    </div>

                    {/* Change Password */}
                    <div className="mb-8 pb-8 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Change Password
                      </h3>

                      <div className="mb-4">
                        <label
                          htmlFor="currentPassword"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Current Password
                        </label>
                        <input
                          id="currentPassword"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>

                      <div className="mb-4">
                        <label
                          htmlFor="newPassword"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          New Password
                        </label>
                        <input
                          id="newPassword"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>

                      <div className="mb-6">
                        <label
                          htmlFor="confirmPassword"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Confirm Password
                        </label>
                        <input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>

                      <button className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors">
                        Update Password
                      </button>
                    </div>

                    {/* Danger Zone */}
                    <div>
                      <h3 className="text-lg font-medium text-red-600 mb-4">
                        Danger Zone
                      </h3>

                      {!showDeleteConfirm ? (
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Delete Account
                        </button>
                      ) : (
                        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                          <p className="text-red-800 font-semibold mb-4">
                            Are you sure? This action cannot be undone.
                          </p>
                          <div className="flex gap-3">
                            <button
                              onClick={() => setShowDeleteConfirm(false)}
                              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                // TODO: Implement actual account deletion
                                alert('Account deletion not yet implemented');
                                setShowDeleteConfirm(false);
                              }}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              Yes, Delete My Account
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* NOTIFICATIONS TAB */}
              {activeTab === 'notifications' && (
                <div className="p-6 space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">
                      Notification Preferences
                    </h2>

                    {/* Toggle Items */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">
                            Session Acceptance
                          </p>
                          <p className="text-sm text-gray-600">
                            Email when a tutor accepts your session request
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={
                            notifications.email_on_session_accepted
                          }
                          onChange={(e) =>
                            setNotifications({
                              ...notifications,
                              email_on_session_accepted: e.target.checked,
                            })
                          }
                          className="w-5 h-5 text-teal-500 rounded focus:ring-2 focus:ring-teal-500 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">
                            New Messages
                          </p>
                          <p className="text-sm text-gray-600">
                            Email when you receive a message from a tutor
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifications.email_on_message}
                          onChange={(e) =>
                            setNotifications({
                              ...notifications,
                              email_on_message: e.target.checked,
                            })
                          }
                          className="w-5 h-5 text-teal-500 rounded focus:ring-2 focus:ring-teal-500 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">
                            Marketing Updates
                          </p>
                          <p className="text-sm text-gray-600">
                            Receive special offers and feature announcements
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifications.marketing_emails}
                          onChange={(e) =>
                            setNotifications({
                              ...notifications,
                              marketing_emails: e.target.checked,
                            })
                          }
                          className="w-5 h-5 text-teal-500 rounded focus:ring-2 focus:ring-teal-500 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Save Button */}
                    <button
                      onClick={handleNotificationSave}
                      disabled={isSaving}
                      className="mt-6 inline-flex items-center gap-2 px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSaving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Save size={18} />
                      )}
                      <span>Save Preferences</span>
                    </button>
                  </div>
                </div>
              )}

              {/* BILLING TAB */}
              {activeTab === 'billing' && (
                <div className="p-6 space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">
                      Billing & Payments
                    </h2>

                    {/* Current Plan */}
                    <div className="mb-8 p-4 bg-teal-50 border border-teal-200 rounded-lg">
                      <p className="text-sm text-teal-600 mb-1">Current Plan</p>
                      <p className="text-2xl font-bold text-teal-900">
                        Free Student
                      </p>
                      <p className="text-sm text-teal-700 mt-2">
                        Unlimited tutors • 1 session/week
                      </p>
                      <button className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
                        Upgrade to Premium
                      </button>
                    </div>

                    {/* Payment Methods */}
                    <div className="mb-8 pb-8 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Payment Methods
                      </h3>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 border border-gray-300 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">
                              💳 Visa ending in 4242
                            </p>
                            <p className="text-sm text-gray-600">
                              Expires 12/25
                            </p>
                          </div>
                          <button className="text-red-600 hover:text-red-700 font-medium text-sm">
                            Remove
                          </button>
                        </div>
                      </div>

                      <button className="mt-4 px-4 py-2 border-2 border-teal-500 text-teal-600 rounded-lg hover:bg-teal-50 transition-colors font-medium">
                        + Add Payment Method
                      </button>
                    </div>

                    {/* Billing History */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Billing History
                      </h3>
                      <div className="text-center py-8 text-gray-500">
                        <p>No billing history yet</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
