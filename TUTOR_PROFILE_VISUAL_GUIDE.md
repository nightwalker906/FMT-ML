# Tutor Profile & Messaging - Visual Guide

## User Interface

### Tutor Profile Page (Full View)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ← Back to Results                                                          │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                    TUTOR PROFILE                                           │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  [Avatar]  🟢 Online now                                      [❤][↗]│ │
│  │            John Smith                                               │ │
│  │            ⭐ 4.8 (142 reviews) | 8+ years experience            │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌─ MAIN CONTENT ──────────────────┐  ┌─ SIDEBAR ─────────────────────┐ │
│  │                                 │  │                               │ │
│  │ About                           │  │  Hourly Rate                │ │
│  │ ─────────────────────────────   │  │  ┌─────────────────────────┐ │ │
│  │ Expert Python developer with    │  │  │      $45/hr             │ │ │
│  │ 8 years of teaching experience │  │  │  [Send Message]         │ │ │
│  │ specialized in web development │  │  │  [Book Session]         │ │ │
│  │ and machine learning.           │  │  └─────────────────────────┘ │ │
│  │                                 │  │                               │ │
│  │ Teaching Style:                 │  │  📍 New York, NY              │ │
│  │ ┌──────────────────────────────┐ │  │  📞 +1-555-0123             │ │
│  │ │ Hands-on project-based       │ │  │  ⏰ Usually within 1 hour   │ │
│  │ │ learning with real-world     │ │  │  👥 47 students             │ │
│  │ │ applications                 │ │  │  📅 Mon, Wed, Fri           │ │
│  │ └──────────────────────────────┘ │  │                               │ │
│  │                                 │  └─────────────────────────────────┘ │
│  │ Qualifications & Subjects       │                                      │
│  │ ┌──────────────────────────────┐                                      │
│  │ │ ✓ Python      ✓ JavaScript   │                                      │
│  │ │ ✓ React       ✓ Web Dev      │                                      │
│  │ │ ✓ Machine L.  ✓ Data Science │                                      │
│  │ └──────────────────────────────┘                                      │
│  │                                 │                                      │
│  │ Recent Reviews                  │                                      │
│  │ ├─ ⭐⭐⭐⭐⭐ 2 weeks ago      │                                      │
│  │ │  "Excellent tutor! Very      │                                      │
│  │ │   knowledgeable and patient" │                                      │
│  │ │                              │                                      │
│  │ ├─ ⭐⭐⭐⭐⭐ 1 month ago      │                                      │
│  │ │  "Great communicator,        │                                      │
│  │ │   helped me understand..."   │                                      │
│  │ │                              │                                      │
│  │ └─ ⭐⭐⭐⭐ 2 months ago       │                                      │
│  │    "Very helpful, quick        │                                      │
│  │    responses..."               │                                      │
│  └──────────────────────────────────┘                                      │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

## Chat Modal Interface

### When User Clicks "Send Message"

```
┌──────────────────────────────────────────────────────┐
│ Chat with John Smith                          [X]    │
│ 🟢 Online                                            │
├──────────────────────────────────────────────────────┤
│                                                      │
│                                                      │
│  You: "Hi John, when are you available?"            │
│                                          1:20 PM     │
│                                                      │
│                    "I'm available Monday and         │
│                     Wednesday after 5pm."            │
│                                          1:25 PM     │
│                                                      │
│  You: "Perfect! I'll book a session then"           │
│                                          1:26 PM     │
│                                                      │
│                    "Great! Looking forward to        │
│                     seeing you!"                     │
│                                          1:27 PM     │
│                                                      │
│                                                      │
├──────────────────────────────────────────────────────┤
│ [Type your message...................] [Send]        │
└──────────────────────────────────────────────────────┘
```

## Data Fetching Flow

```
┌─────────────────────────────────────────────┐
│ User clicks "View Profile" on Recommendation │
└─────────────┬───────────────────────────────┘
              ↓
    ┌─────────────────────────────────────┐
    │ /student/tutors/[id] page loads     │
    └────────────┬────────────────────────┘
                 ↓
      ┌──────────────────────────┐
      │ useEffect triggers       │
      │ fetchTutorDetails()      │
      └────────┬─────────────────┘
               ↓
    ┌──────────────────────────────────────────┐
    │ PARALLEL QUERIES:                        │
    │                                          │
    │ 1️⃣ Query profiles table                  │
    │    ↓ Get: name, email, is_online        │
    │                                          │
    │ 2️⃣ Query tutors table                    │
    │    ↓ Get: experience, rate, location,   │
    │        phone, qualifications, bio,      │
    │        teaching_style, availability     │
    │                                          │
    │ 3️⃣ Query ratings table                   │
    │    ↓ Get: reviews, student count        │
    └───────────┬──────────────────────────────┘
                ↓
       ┌────────────────────────────────┐
       │ Parse availability.days        │
       │ Extract available days list    │
       └────────┬───────────────────────┘
                ↓
       ┌────────────────────────────────┐
       │ Set tutor state                │
       │ Render page with real data     │
       └────────────────────────────────┘
```

## Chat Interaction Flow

### Scenario: Student sends message

```
Student at Tutor Profile
         ↓
Click "Send Message" button
         ↓
showChat = true
Chat modal opens
         ↓
loadChatMessages() executes
  → Query messages table
  → Filter: between student and tutor
  → Sort by created_at
  → Mark as read
  → Set messages state
         ↓
Chat history displays
         ↓
Student types message
"Hi John, I need help with Python"
         ↓
Student clicks Send (or presses Enter)
         ↓
sendMessage() executes
  → Insert to messages table:
      sender_id: student.id
      receiver_id: tutor.id
      content: "Hi John..."
  → Clear input field
  → Message appears immediately
         ↓
Real-time subscription triggers
  → If tutor is subscribed to channel
  → Message appears in tutor's chat
```

### Scenario: Tutor replies

```
Tutor receives message
         ↓
(Optional) Open chat from notifications
         ↓
Tutor types reply
"Sure! I'm available Monday at 5pm"
         ↓
Tutor clicks Send
         ↓
Message inserted to messages table
         ↓
Real-time subscription on student's side triggers
         ↓
Message appears in student's chat
  "John: Sure! I'm available Monday at 5pm"
  Shows timestamp: 2:15 PM
```

## Data Structure Visualization

### Tutor Object (After Data Fetch)

```javascript
{
  // Identity
  id: "550e8400-e29b-41d4-a716-446655440000",
  first_name: "John",
  last_name: "Smith",
  email: "john@example.com",
  
  // Online Status
  is_online: true,  // 🟢 Shows in UI
  
  // Experience & Rating
  experience_years: 8,           // "8+ years"
  average_rating: 4.8,           // ⭐ 4.8
  reviews_count: 142,
  
  // Teaching Info
  teaching_style: "Hands-on project-based learning",
  qualifications: [
    "Python",
    "JavaScript",
    "Web Development",
    "React",
    "Machine Learning",
    "Data Science"
  ],
  bio_text: "Expert Python developer with 8 years of teaching experience...",
  
  // Scheduling & Location
  availability: {
    days: ["monday", "wednesday", "friday"]
  },
  response_time: "monday, wednesday, friday",  // Parsed from availability
  location: "New York, NY",
  
  // Contact & Pricing
  phone_number: "+1-555-0123",
  hourly_rate: 45.00,
  
  // Statistics
  total_students: 47  // Count from ratings table
}
```

### Message Object

```javascript
{
  id: "msg-550e8400-e29b-41d4-a716-446655440001",
  sender_id: "student-uuid-123",
  receiver_id: "tutor-uuid-456",
  content: "Hi John! I need help with Python programming",
  created_at: "2026-02-08T14:30:00Z",
  is_read: true,
  
  // In UI:
  // Shows: "You: Hi John! I need help with Python programming"
  //        "1:30 PM"
  //        (Aligned to right because sender_id === user.id)
}
```

## Component State Management

```typescript
const [tutor, setTutor] = useState<TutorDetail | null>(null)
  // Complete tutor data object
  // Updated when page loads

const [loading, setLoading] = useState(true)
  // Show spinner while fetching tutor data

const [error, setError] = useState<string | null>(null)
  // Display error message if fetch fails

const [isFavorite, setIsFavorite] = useState(false)
  // Heart button state

const [reviews, setReviews] = useState<any[]>([])
  // Array of review objects from ratings table

const [showChat, setShowChat] = useState(false)
  // Toggle chat modal visibility

const [messages, setMessages] = useState<Message[]>([])
  // Chat conversation history

const [newMessage, setNewMessage] = useState('')
  // User's current message being typed

const [sendingMessage, setSendingMessage] = useState(false)
  // Show loading spinner in send button

const [chatLoading, setChatLoading] = useState(false)
  // Show spinner while loading chat history
```

## Real-time Events

```
┌─────────────────────────────────────────────────────┐
│ SUPABASE REAL-TIME SUBSCRIPTION                    │
└────────┬────────────────────────────────────────────┘
         ↓
Channel: "messages"
Event Type: "postgres_changes"
Schema: "public"
Table: "messages"
Filter: sender_id = tutor.id AND receiver_id = user.id
         ↓
When new message inserted into messages table:
  → Subscription detects change
  → Trigger payload with new message data
  → Update messages state
  → Message appears in chat immediately
         ↓
Result: Live chat experience without polling!
```

## UI State Transitions

### Initial Load
```
Loading: true
  ↓ (fetching data)
Loading: false, Tutor data loaded
  ↓
Page renders with all real data
```

### Opening Chat
```
showChat: false
  ↓ (user clicks "Send Message")
showChat: true, chatLoading: true
  ↓ (loading chat history)
chatLoading: false, messages populated
  ↓
Chat modal displays messages
```

### Sending Message
```
newMessage: "Hi John!"
  ↓ (user clicks Send)
sendingMessage: true
Send button disabled
  ↓ (inserting to database)
sendingMessage: false
newMessage: ""
Message appears in chat
  ↓
Ready to send next message
```

## Error Scenarios

### Scenario 1: Failed to load tutor data
```
Error message displays:
"Failed to load tutor details"
Back button available
```

### Scenario 2: Failed to send message
```
Alert: "Failed to send message"
Message stays in input field
User can retry
```

### Scenario 3: Chat history failed to load
```
Chat modal opens
Shows: "Loading chat..." (spinner)
User can still type (message will be sent)
```

## Mobile View

```
┌─────────────────────────────────┐
│ ← Back to Results              │
├─────────────────────────────────┤
│          [Avatar]               │
│       John Smith                │
│    🟢 Online now                │
│    ⭐ 4.8 (142)                 │
│ 8+ years experience             │
│                                 │
│ [Send Message]                  │
│ [Book Session]                  │
├─────────────────────────────────┤
│ About                           │
│ Expert Python developer...      │
│                                 │
│ Teaching Style:                 │
│ Hands-on project-based          │
│                                 │
│ Qualifications:                 │
│ ✓ Python    ✓ JavaScript        │
│ ✓ React     ✓ Web Dev           │
│                                 │
│ 📍 New York, NY                 │
│ 📞 +1-555-0123                  │
│ ⏰ Usually 1 hour               │
│ 👥 47 students                  │
│ 📅 Mon, Wed, Fri                │
│                                 │
│ Recent Reviews:                 │
│ ⭐⭐⭐⭐⭐                     │
│ "Excellent tutor..."            │
│                                 │
│ ... more reviews ...            │
└─────────────────────────────────┘
```

### Chat Modal on Mobile

```
┌───────────────────────────────────┐
│ Chat with John Smith       [X]    │
│ 🟢 Online                         │
├───────────────────────────────────┤
│                                   │
│ You: "Hi John!"                   │
│                          1:20 PM   │
│                                   │
│              "Hi there!"           │
│                          1:21 PM   │
│                                   │
│ You: "I need help with..."        │
│                          1:22 PM   │
│                                   │
├───────────────────────────────────┤
│ [Type msg...............] [Send]   │
└───────────────────────────────────┘
```

## Summary of Changes

```
BEFORE                          AFTER
─────────────────────────────────────────
Generic tutor page      →  Real database data
Dummy data              →  Live metrics
No messaging            →  Full chat system
Static student count    →  Actual from ratings
Hardcoded availability  →  From database
No contact info         →  Location + Phone
```

**Everything is now connected to your database! 🎯**
