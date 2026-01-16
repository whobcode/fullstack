# MEAN Stack Version

This is an alternative MEAN stack (MongoDB, Express, Angular, Node.js) implementation of the fullstack application.

## Tech Stack

- **M**ongoDB - Document database for data storage
- **E**xpress.js - Node.js web framework for the backend API
- **A**ngular 17 - Frontend framework with standalone components
- **N**ode.js - JavaScript runtime for the backend

## Project Structure

```
mean/
├── server/                 # Express.js backend
│   └── src/
│       ├── models/         # Mongoose data models
│       ├── routes/         # Express route handlers
│       ├── middleware/     # Auth and other middleware
│       ├── lib/            # Utilities (auth, database)
│       └── index.ts        # Server entry point
├── client/                 # Angular frontend
│   └── src/
│       └── app/
│           ├── components/ # Reusable UI components
│           ├── pages/      # Page components
│           ├── services/   # Angular services
│           └── guards/     # Route guards
├── package.json            # Root dependencies
└── .env.example            # Environment variables template
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Angular CLI (`npm install -g @angular/cli`)

### Installation

1. Install root dependencies:
   ```bash
   cd mean
   npm install
   ```

2. Install client dependencies:
   ```bash
   cd client
   npm install
   ```

3. Create a `.env` file from the template:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your MongoDB connection string and other settings.

### Development

Run both server and client in development mode:
```bash
npm run dev
```

Or run them separately:
```bash
# Server only (port 3000)
npm run server:dev

# Client only (port 4200)
npm run client:dev
```

The Angular dev server proxies `/api` requests to the Express server.

### Production Build

```bash
npm run build
```

This builds both the server and client for production.

### Start Production Server

```bash
npm start
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/:id` - Get user profile
- `PATCH /api/users/me` - Update current user profile
- `GET /api/users` - Search users

### Social
- `GET /api/social/feed` - Get post feed
- `POST /api/social/posts` - Create post
- `GET /api/social/posts/:id` - Get single post
- `PATCH /api/social/posts/:id` - Update post
- `DELETE /api/social/posts/:id` - Delete post

### Friends
- `GET /api/friends` - Get friends list
- `GET /api/friends/requests` - Get pending requests
- `POST /api/friends/request/:userId` - Send friend request
- `POST /api/friends/accept/:requestId` - Accept request
- `POST /api/friends/reject/:requestId` - Reject request
- `DELETE /api/friends/:friendId` - Remove friend

### Messages
- `GET /api/messages/conversations` - Get conversations
- `GET /api/messages/:userId` - Get messages with user
- `POST /api/messages/:userId` - Send message

### Game
- `GET /api/game/character` - Get current character
- `GET /api/game/characters` - Get all character slots
- `POST /api/game/character/initialize` - Initialize character
- `POST /api/game/character/allocate` - Allocate stat points
- `GET /api/game/players` - Get players list
- `POST /api/game/battle/start` - Start battle
- `GET /api/game/leaderboard` - Get leaderboard

## Data Models

The MongoDB schemas are based on the original SQLite D1 schema, adapted for document-based storage:

- **User** - User accounts
- **Session** - Login sessions
- **OAuthAccount** - OAuth provider links
- **Friend** - Friend relationships
- **Message** - Direct messages
- **Post** - Social posts
- **Group** - User groups
- **Notification** - In-app notifications
- **Character** - Game characters (with embedded trophies)
- **Battle** - Battle records (with embedded turns)
- **LeaderboardSnapshot** - Leaderboard data
- **OfflineXP** - Offline XP tracking

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/fullstack` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `SESSION_SECRET` | Session encryption key | - |
| `CLIENT_URL` | Frontend URL for CORS | `http://localhost:4200` |

## Differences from Main Branch

The main branch uses:
- **Cloudflare Workers** - Serverless runtime
- **Hono** - Lightweight web framework
- **D1 (SQLite)** - Relational database
- **React** - Frontend framework
- **React Router** - Client-side routing

This MEAN branch uses:
- **Node.js** - Traditional server runtime
- **Express.js** - Full-featured web framework
- **MongoDB** - Document database
- **Angular** - Frontend framework
- **Angular Router** - Client-side routing
