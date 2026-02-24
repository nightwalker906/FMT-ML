╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                  ║
║                  📱 MESSAGING & SETTINGS IMPLEMENTATION GUIDE                    ║
║                                                                                  ║
║            Real-time Chat + Comprehensive Account Settings System                ║
║                                                                                  ║
╚════════════════════════════════════════════════════════════════════════════════╝


═════════════════════════════════════════════════════════════════════════════════
                              IMPLEMENTATION STEPS
═════════════════════════════════════════════════════════════════════════════════

STEP 1: SET UP SUPABASE DATABASE
────────────────────────────────────────────────────────────────────────────────

1. Go to Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to SQL Editor
4. Copy and run ALL commands from: frontend/supabase-setup.sql
   This creates:
   ✓ avatars storage bucket
   ✓ messages table with RLS policies
   ✓ sessions table
   ✓ notification_settings table
   ✓ Real-time subscriptions

5. Run ALL commands from: frontend/database-functions.sql
   This creates helper function: get_user_conversations()

Expected result: No errors, all tables created successfully ✓


STEP 2: VERIFY SUPABASE RLS POLICIES
────────────────────────────────────────────────────────────────────────────────

1. Go to Supabase Dashboard > Authentication > Policies
2. Verify these policies exist:
   ✓ messages: "Users can read their own messages" (SELECT)
   ✓ messages: "Users can insert their own messages" (INSERT)
   ✓ messages: "Users can update their own messages" (UPDATE)
   ✓ sessions: "Students can view their own sessions" (SELECT)
   ✓ sessions: "Tutors can view their sessions" (SELECT)
   ✓ notification_settings: Users can view their own (SELECT)
   ✓ notification_settings: Users can update their own (UPDATE)

3. Go to Storage > Buckets > avatars
4. Verify these policies exist:
   ✓ "Public read access on avatars"
   ✓ "Authenticated users can upload avatars"
   ✓ "Users can update their own avatars"
   ✓ "Users can delete their own avatars"


STEP 3: UPDATE PROFILES TABLE (if not already done)
────────────────────────────────────────────────────────────────────────────────

Run in SQL Editor to add missing columns to profiles table:

  ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT;

This allows storing tutor names for the conversation list.


STEP 4: VERIFY FILES ARE IN PLACE
────────────────────────────────────────────────────────────────────────────────

✓ frontend/app/actions.ts
  └─ Server actions for messaging and settings

✓ frontend/app/student/messages/page.tsx
  └─ Messaging page with real-time chat (TWO-COLUMN LAYOUT)
  └─ Components: MessageBubble, ConversationItem

✓ frontend/app/student/settings/page.tsx
  └─ Settings page with TAB INTERFACE
  └─ Sections: Profile, Security, Notifications, Billing

✓ frontend/supabase-setup.sql
  └─ Database schema and RLS policies

✓ frontend/database-functions.sql
  └─ Helper function: get_user_conversations()


STEP 5: INSTALL DATE FORMATTING LIBRARY (for timestamps)
────────────────────────────────────────────────────────────────────────────────

The messaging page uses date-fns for formatting. Install it:

  cd C:\Users\The Night\Documents\FMT-ML\frontend
  npm install date-fns

Or if using pnpm:

  pnpm install date-fns


STEP 6: START SERVERS AND TEST
────────────────────────────────────────────────────────────────────────────────

Terminal 1 (Backend):
  cd C:\Users\The Night\Documents\FMT-ML\backend
  python manage.py runserver 0.0.0.0:8000

Terminal 2 (Frontend):
  cd C:\Users\The Night\Documents\FMT-ML\frontend
  npm run dev

Browser:
  http://localhost:3001/student/settings
  http://localhost:3001/student/messages


═════════════════════════════════════════════════════════════════════════════════
                         📱 MESSAGING PAGE FEATURES
═════════════════════════════════════════════════════════════════════════════════

LAYOUT: Two-Column WhatsApp Style
──────────────────────────────────

┌──────────────────────────────────────────────────────────────┐
│ MESSAGES                  │  Chat Header (Tutor Name, Online) │
│                           │                                    │
│ 📌 Jama Samaradze        │  [Messages scrollable area]         │
│    Last: "See you..."     │                                    │
│    5 mins ago             │  Student: Teal right ████████      │
│    🔴 5 unread            │                                    │
│                           │  Tutor: Gray left ████████         │
│ 📌 Sarah Lee              │                                    │
│    Last: "Sure!"          │  Student: Teal right ████████      │
│    2 hours ago            │                                    │
│                           │  ─────────────────────────────────│
│ 📌 Alex Chen              │  [Type here...] [Send Button ✈️]  │
│    Last: "Math homework"  │                                    │
│    1 day ago              │                                    │
│                           │                                    │
└──────────────────────────────────────────────────────────────┘


FEATURES:
─────────

✓ Conversations List (Left Sidebar, 30% width)
  • Avatar image
  • Tutor/Tutor name
  • Last message snippet
  • Timestamp (e.g., "5 mins ago")
  • Unread count badge
  • Active conversation highlighting
  • Hover effects

✓ Active Chat Area (Main window, 70% width)
  • Tutor header with online status
  • Message bubbles with timestamps
  • Student messages: Right-aligned, teal background
  • Tutor messages: Left-aligned, gray background
  • Auto-scroll to latest message
  • Scrollable history

✓ Message Input
  • Text input field
  • Send button with paper airplane icon (✈️)
  • Loading spinner during send
  • Disabled state when empty
  • Enter key to send (Shift+Enter for new line)

✓ Real-Time Updates
  • Supabase channel subscription
  • New messages appear instantly
  • No page refresh needed
  • Active typing indicator (future enhancement)

✓ Empty States
  • "No conversations yet" if no chats
  • "Select a conversation" if no chat selected
  • "No messages yet" if conversation is empty


IMPORTANT NOTES:
────────────────

⚠️ Currently, conversations are loaded as empty. To fully populate:
   1. Create sessions between students and tutors
   2. Ensure both profiles have first_name and last_name
   3. The get_user_conversations() function will fetch them
   4. Update the fetchConversations function to call the API endpoint

📍 Message subscription is set up to listen to Realtime changes
   This requires Realtime enabled in Supabase settings

🔐 RLS policies prevent cross-user message access
   Users can only see messages they sent or received


═════════════════════════════════════════════════════════════════════════════════
                        ⚙️ SETTINGS PAGE FEATURES
═════════════════════════════════════════════════════════════════════════════════

LAYOUT: Sidebar Tabs with Content Area
───────────────────────────────────────

┌─────────────────────────────────────────────────────┐
│ Settings                                             │
│                                                      │
│ 👤 Profile                  │  Public Profile       │
│ 🔒 Security                 │  [Avatar with upload] │
│ 🔔 Notifications            │  Display Name: [text] │
│ 💳 Billing                  │  Email: [readonly]    │
│ 🚪 Sign Out                 │  Bio: [textarea]      │
│                             │  Learning Goals:[text]│
│                             │  [Save Changes]       │
│                             │                       │
└─────────────────────────────────────────────────────┘


TAB 1: PROFILE
──────────────

✓ Avatar Upload
  • Circular image display (24×24 rem)
  • "Upload Image" button with upload icon
  • File input accepts JPG, PNG (max 5MB)
  • Instant preview using FileReader API
  • Uploads to Supabase Storage 'avatars' bucket
  • Path: avatars/{user_id}/{timestamp}.{ext}

✓ Display Name Input
  • Text field, required
  • Default: first part of email
  • Max length: 255 characters

✓ Email Address
  • Read-only field (cannot edit from settings)
  • Shows user's auth email
  • Note: "Contact support to change email"

✓ Bio Textarea
  • 4 rows, expandable
  • Placeholder: "Tell tutors about yourself..."
  • Stored in user metadata

✓ Learning Goals Textarea
  • 4 rows, expandable
  • Placeholder: "What subjects do you want to learn?"
  • Stored in user metadata

✓ Save Button
  • Uploads avatar if selected
  • Updates profile in auth.users metadata
  • Shows loading spinner during save
  • Success notification on completion


TAB 2: SECURITY
───────────────

✓ Email Address (Read-only)
  • Displays current email
  • Locked with note: "Contact support to change"

✓ Change Password Section
  • Current Password field (disabled for now, just UI)
  • New Password field (min 8 characters)
  • Confirm Password field
  • Update Password button
  • Future: Implement password verification

✓ Danger Zone (Red Styling)
  • "Delete Account" button (initially visible)
  • Confirmation modal on click
  • "Are you sure?" warning
  • Cancel and "Yes, Delete" buttons
  • Prevents accidental deletion


TAB 3: NOTIFICATIONS
─────────────────────

✓ Toggle Switches (Checkbox UI)
  1. "Email me when a session is accepted"
     └─ Setting: email_on_session_accepted
  
  2. "Email me when I receive a message"
     └─ Setting: email_on_message
  
  3. "Receive marketing updates"
     └─ Setting: marketing_emails

✓ Save Preferences Button
  • Updates notification_settings table
  • Shows loading state
  • Success notification


TAB 4: BILLING
───────────────

✓ Current Plan Card
  • Title: "Free Student"
  • Features: "Unlimited tutors • 1 session/week"
  • "Upgrade to Premium" button (visual only)

✓ Payment Methods Section
  • Shows saved cards (e.g., "💳 Visa ending in 4242")
  • Expiration date
  • Remove button for each card
  • "+ Add Payment Method" button

✓ Billing History
  • Table or list (currently shows "No billing history")


EXTRA: Sign Out Button
──────────────────────

✓ Located in sidebar at bottom
✓ Red text styling
✓ Icon: LogOut icon
✓ Calls signOut() from useAuth hook
✓ Redirects to /login


═════════════════════════════════════════════════════════════════════════════════
                         🔑 KEY FUNCTIONS & APIS
═════════════════════════════════════════════════════════════════════════════════

MESSAGING APIs (app/actions.ts)......
────────────────────────────────

1. sendMessage(receiverId, content)
   Input:  receiverId (string), content (string)
   Output: { success: true, message } | { error: string }
   Notes:  Validates receiver ID, prevents self-messaging

2. getConversations()
   Input:  None (uses current user from auth)
   Output: { success: true, conversations: [] } | { error }
   Notes:  Calls get_user_conversations(user_id) function

3. getMessageHistory(otherUserId, limit=50)
   Input:  otherUserId (string), limit (optional)
   Output: { success: true, messages: [] } | { error }
   Notes:  Fetches messages between current user and other user

4. markMessagesAsRead(otherUserId)
   Input:  otherUserId (string)
   Output: { success: true } | { error }
   Notes:  Updates is_read flag for all messages from that user


SETTINGS APIs (app/actions.ts)
─────────────────────────────

1. updateProfile(displayName, bio, learningGoals)
   Input:  All strings
   Output: { success: true } | { error }
   Notes:  Updates user.user_metadata

2. updatePassword(newPassword)
   Input:  newPassword (string, min 8 chars)
   Output: { success: true } | { error }
   Notes:  Uses admin API (server-only)

3. deleteAccount()
   Input:  None
   Output: { success: true } | { error }
   Notes:  Deletes user account permanently

4. uploadAvatar(file)
   Input:  File object
   Output: { success: true, avatarUrl } | { error }
   Notes:  Uploads to storage and returns public URL

5. updateNotificationSettings(emailSession, emailMsg, marketingEmails)
   Input:  Three booleans
   Output: { success: true } | { error }
   Notes:  Upserts notification_settings row

6. getNotificationSettings()
   Input:  None
   Output: { success: true, settings: {...} } | { error }
   Notes:  Returns defaults if no user row exists


REAL-TIME SUBSCRIPTIONS
───────────────────────

Supabase Channel in messages/page.tsx:

  supabase
    .channel(`messages:${user.id}`)
    .on(
      'postgres_changes',
      {
        event: '*',                          // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'messages',
        filter: `or(sender_id=eq.${user.id},receiver_id=eq.${user.id})`
      },
      (payload) => {
        // Handle new message
        if (payload.eventType === 'INSERT') {
          const newMessage = payload.new;
          setMessages(prev => [...prev, newMessage]);
        }
      }
    )
    .subscribe();


═════════════════════════════════════════════════════════════════════════════════
                           🧪 TESTING CHECKLIST
═════════════════════════════════════════════════════════════════════════════════

MESSAGING TESTS
───────────────

□ Navigate to http://localhost:3001/student/messages
□ See "No conversations yet" message
□ [Manual] Create sessions via backend admin
□ Refresh page - conversations should appear
□ Click on a conversation - chat loads
□ Type a message and click Send
□ Message appears in chat with correct alignment
□ Sender message is right-aligned, teal
□ Receiver message is left-aligned, gray
□ Messages show timestamps
□ Scroll through message history
□ Real-time: Open chat in 2 tabs, send from one, appears in other
□ Mark unread messages as read
□ "Online/Offline" indicator shows correct status


SETTINGS TESTS - PROFILE
──────────────────────

□ Navigate to http://localhost:3001/student/settings
□ Profile tab is active by default
□ Avatar preview loads (or default avatar)
□ Click "Upload Image" button
□ Select an image file
□ Preview updates immediately
□ Enter Display Name
□ Enter Bio text
□ Enter Learning Goals text
□ Click "Save Changes"
□ Loading spinner appears
□ Success notification shows
□ Data persists on reload
□ Email field is read-only


SETTINGS TESTS - SECURITY
──────────────────────────

□ Click Security tab
□ Email field shows current email (read-only)
□ Password fields visible
□ Delete Account button visible
□ Click Delete Account button
□ Confirmation modal appears
□ Click Cancel - modal closes
□ Click Delete Account again
□ "Are you sure?" warning shows
□ Click Yes, Delete - (placeholder alert for now)


SETTINGS TESTS - NOTIFICATIONS
────────────────────────────────

□ Click Notifications tab
□ 3 toggle switches visible
□ All toggles are functional (click to change)
□ Toggle states persist
□ Click "Save Preferences"
□ Loading spinner shows
□ Success notification appears


SETTINGS TESTS - BILLING
──────────────────────────

□ Click Billing tab
□ "Free Student" plan shows
□ Features listed
□ "Upgrade to Premium" button visible
□ Payment methods section visible
□ Sample card shows "Visa ending in 4242"
□ "Remove" button present
□ "+ Add Payment Method" button visible


═════════════════════════════════════════════════════════════════════════════════
                        ⚠️ KNOWN LIMITATIONS & TODOS
═════════════════════════════════════════════════════════════════════════════════

MESSAGING
─────────

⚠️ Conversations list currently empty
   → Need to populate from sessions/relationships
   → Update fetchConversations() to call actual API

⚠️ Real-time subscriptions require Realtime enabled
   → Check Supabase project settings > Realtime
   → May need to restart app if not enabled

⚠️ No typing indicator
   → Can be added with similar Realtime channel pattern

⚠️ No message search/filtering
   → Can be added with Ctrl+F style interface

⚠️ No file attachments
   → Can be added using Supabase Storage


SETTINGS
────────

⚠️ Password change doesn't verify current password
   → Current implementation only updates via admin (server)
   → Should use supabase.auth.updateUser() for client-side update

⚠️ Account deletion is placeholder
   → Shows alert instead of actual deletion
   → Needs confirmation + password verification

⚠️ Avatar upload shows preview but doesn't validate file size
   → Should add client-side validation before upload

⚠️ No email verification after profile update
   → Email address stored in auth.users metadata
   → Should verify before finalizing


═════════════════════════════════════════════════════════════════════════════════
                          📖 DATABASE SCHEMA REFERENCE
═════════════════════════════════════════════════════════════════════════════════

MESSAGES TABLE
──────────────

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  receiver_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_read BOOLEAN DEFAULT false,
  CONSTRAINT different_users CHECK (sender_id != receiver_id)
);

Indexes:
  - idx_messages_sender_id (for filtering by sender)
  - idx_messages_receiver_id (for filtering by receiver)
  - idx_messages_conversation (for conversation pairs)


NOTIFICATION_SETTINGS TABLE
────────────────────────────

CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  email_on_session_accepted BOOLEAN DEFAULT true,
  email_on_message BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);


SESSIONS TABLE (existing, updated)
───────────────────────────────────

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  tutor_id UUID NOT NULL REFERENCES profiles(id),
  subject_id UUID REFERENCES subjects(id),
  scheduled_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'pending' CHECK (...),
  meeting_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);


STORAGE: AVATARS BUCKET
─────────────────────────

Path format: avatars/{user_id}/{timestamp}.{ext}
Public: true (readable by anyone)
Upload: Authenticated users only
Deletion: User can delete their own


═════════════════════════════════════════════════════════════════════════════════
                          🚀 NEXT PHASE (PHASE 4)
═════════════════════════════════════════════════════════════════════════════════

Future enhancements:

1. MESSAGING IMPROVEMENTS
   □ Typing indicator ("User is typing...")
   □ Message search and filtering
   □ File/image attachments
   □ Message reactions (emoji)
   □ Message deletion/editing
   □ Group chats (multiple students + tutors)

2. NOTIFICATIONS
   □ Email notifications (webhook integration)
   □ Push notifications (PWA)
   □ In-app notification center
   □ Email digest (weekly summary)

3. SETTINGS IMPROVEMENTS
   □ Two-factor authentication (2FA)
   □ Session management (active devices)
   □ Login history
   □ API key management
   □ Integration settings

4. TUTOR-SPECIFIC
   □ Tutor dashboard with earnings
   □ Student management
   □ Availability scheduling
   □ Calendar integration

5. PAYMENT SYSTEM
   □ Stripe integration
   □ Payment processing
   □ Invoice generation
   □ Subscription management

═════════════════════════════════════════════════════════════════════════════════
