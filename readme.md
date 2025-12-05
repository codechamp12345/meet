# SyncRoom - Video Conferencing Platform

A real-time video conferencing application with WebRTC, similar to Google Meet.

## Features

- **Video Calls** - HD video with camera toggle
- **Audio** - Crystal clear audio with noise suppression
- **Screen Sharing** - Share your screen with everyone
- **Live Chat** - Send messages during the meeting
- **Host Controls** - Admit or deny participants (like Google Meet)
- **Email OTP** - Secure signup with email verification

## How It Works

1. **Register** → Enter your details and verify your email with OTP
2. **Login** → Access your dashboard
3. **Create Meeting** → Get a unique meeting code
4. **Share Code** → Send the code to participants
5. **Join Meeting** → Participants enter the code and wait for approval
6. **Host Admits** → Click "Admit" to let participants in
7. **Start Talking!** → Video, audio, screen share, chat - all in real-time

## Tech Stack

**Backend:**
- Node.js + Express
- MongoDB (database)
- Socket.io (real-time communication)
- JWT (authentication)
- Nodemailer (email OTP)

**Frontend:**
- React + Vite
- TailwindCSS (styling)
- WebRTC (video/audio)
- Socket.io-client

## Quick Start

### Prerequisites

- Node.js 18+ installed
- MongoDB database (local or MongoDB Atlas)
- Gmail account for sending OTPs

### 1. Clone and Install

```bash
# Clone the repo
git clone <your-repo-url>
cd video_conference

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend/frontend
npm install
```

### 2. Setup Environment Variables

**Backend** (`backend/.env`):
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/syncroom
JWT_SECRET=your_secret_key_here
FRONTEND_URL=http://localhost:5173
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
```

> **Note:** For Gmail, you need an [App Password](https://support.google.com/accounts/answer/185833), not your regular password.

**Frontend** (`frontend/frontend/.env`):
```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

### 3. Run the Application

Open two terminals:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend/frontend
npm run dev
```

### 4. Open in Browser

Go to `http://localhost:5173`

## Usage Guide

### As Host (Creating a Meeting)

1. Register and login
2. Click "New Meeting" on the home page
3. You'll enter the meeting room
4. Share the meeting code with others
5. When someone requests to join, click the People icon
6. Click "Admit" to let them in, or "Deny" to reject

### As Participant (Joining a Meeting)

1. Register and login
2. Enter the meeting code in "Join Meeting"
3. Wait for the host to admit you
4. Once admitted, you're in the meeting!

### Meeting Controls

| Button | Action |
|--------|--------|
| 🎤 Mic | Toggle microphone |
| 📹 Camera | Toggle camera |
| 🖥️ Screen | Share your screen |
| 💬 Chat | Open chat panel |
| 👥 People | View participants |
| 🚪 Leave | Exit the meeting |

## Project Structure

```
video_conference/
├── backend/
│   ├── index.js          # Server entry point
│   ├── routes/
│   │   ├── auth.js       # Login, register, OTP
│   │   └── meeting.js    # Create, join meetings
│   ├── models/
│   │   ├── User.js       # User schema
│   │   └── Meeting.js    # Meeting schema
│   ├── middleware/
│   │   └── auth.js       # JWT verification
│   ├── socket/
│   │   └── signaling.js  # WebRTC signaling
│   └── utils/
│       └── mailer.js     # Email sender
│
└── frontend/frontend/
    ├── src/
    │   ├── pages/        # Login, Register, Home, Meeting
    │   ├── components/   # VideoTile, ChatSidebar, etc.
    │   ├── webrtc/       # WebRTC and Socket logic
    │   ├── context/      # Auth context
    │   └── utils/        # API client
    └── index.html
```

## Troubleshooting

**Camera not working?**
- Allow camera access in browser
- Make sure no other app is using the camera

**Can't hear audio?**
- Check if mic is muted
- Try using headphones to avoid echo

**Connection stuck on "Connecting"?**
- Refresh the page
- Check if both users allowed camera/mic access

**OTP not received?**
- Check spam folder
- Verify EMAIL_USER and EMAIL_PASS in .env
