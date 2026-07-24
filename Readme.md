# VideoTube Backend

A full-featured YouTube-inspired backend API built with **Node.js**, **Express**, and **MongoDB**. Implements complete authentication, video management, engagement (comments, likes, subscriptions), content organization (playlists, tweets), and channel analytics — all with JWT-based auth, file uploads via Cloudinary, and MongoDB aggregation pipelines.

## Status

✅ **All modules fully implemented and tested**: Users, Videos, Comments, Likes, Playlists, Subscriptions, Tweets, Dashboard, and Healthcheck.

## Tech Stack

- **Runtime:** Node.js (ESM / `"type": "module"`)
- **Framework:** Express 5
- **Database:** MongoDB with Mongoose (+ `mongoose-aggregate-paginate-v2` for paginated aggregations)
- **Auth:** JWT (access + refresh tokens), bcrypt for password hashing, httpOnly cookies + Bearer token support
- **File uploads:** Multer (local temp storage) → Cloudinary (persistent hosting)
- **Dev tooling:** nodemon, Prettier

## Project Structure

```
src/
├── controllers/       # Route handler logic (all implemented)
│   ├── user.controller.js
│   ├── video.controller.js
│   ├── comment.controller.js
│   ├── like.controller.js
│   ├── playlist.controller.js
│   ├── subscription.controller.js
│   ├── tweet.controller.js
│   ├── dashboard.controller.js
│   └── healthcheck.controller.js
├── models/             # Mongoose schemas (user, video, comment, like, playlist, tweet, subscription)
├── middlewares/         # auth.middleware.js (JWT verification), multer.js (file upload handling)
├── routes/               # One route module per resource, all mounted in app.js
├── utils/                 # ApiError, ApiResponse, asyncHandler, cloudinary upload helper
├── db/                     # MongoDB connection logic
├── app.js                  # Express app setup, middleware, route mounting, global error handler
└── index.js                 # Entry point — loads env, connects DB, starts server
```

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- A MongoDB Atlas cluster (or local MongoDB instance)
- A Cloudinary account (for video/image uploads)

### Installation

```bash
git clone https://github.com/syedali067/backend.git
cd backend
npm install
```

### Environment Variables

Copy `.env.sample` to `.env` and fill in your own values:

```env
PORT=8000
CORS_ORIGIN=*
ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=7d
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

> ⚠️ Never commit your real `.env` file. Use strong, randomly generated values for both token secrets (e.g. `openssl rand -hex 64`).

### Running Locally

```bash
npm run dev
```

Starts the server with nodemon on `http://localhost:8000` (or your configured `PORT`), watching for file changes.

## API Reference

Base URL: `/api/v1`

All protected routes accept either an `accessToken` httpOnly cookie (set automatically on login) or an `Authorization: Bearer <token>` header.

**Response format:**
```json
{ "status": 200, "message": "Description of what happened", "data": {}, "success": true }
```
Errors follow the same shape with `"success": false` and an `"errors"` array.

### Healthcheck

| Method | Endpoint | Auth | Description |
|--------|----------|:---:|--------------|
| GET | `/healthcheck` | No | Returns server status and uptime |

### Users — `/users`

| Method | Endpoint | Auth | Description |
|--------|----------|:---:|--------------|
| POST | `/register` | No | Register (multipart: `avatar`, `coverImage` files + text fields) |
| POST | `/login` | No | Log in; returns access & refresh tokens |
| POST | `/logout` | Yes | Log out and clear tokens |
| POST | `/refresh-tokken` | No* | Issue new access token from a valid refresh token |
| POST | `/change-password` | Yes | Change password |
| GET | `/current-user` | Yes | Get authenticated user's profile |
| PATCH | `/update-account` | Yes | Update `fullName` and `email` |
| PATCH | `/avatar` | Yes | Update avatar (multipart: `avatar` file) |
| PATCH | `/cover-image` | Yes | Update cover image (multipart: `coverImage` file) |
| GET | `/c/:username` | Yes | Get a channel's public profile with subscriber counts |
| GET | `/history` | Yes | Get authenticated user's watch history |

### Videos — `/videos`

| Method | Endpoint | Auth | Description |
|--------|----------|:---:|--------------|
| GET | `/` | Yes | List videos — paginated, searchable (`query`), sortable (`sortBy`, `sortType`), filterable by `userId` |
| POST | `/` | Yes | Publish a video (multipart: `videoFile`, `thumbnail` files + `title`, `description`) |
| GET | `/:videoId` | Yes | Get a video by ID (increments view count) |
| PATCH | `/:videoId` | Yes | Update title/description/thumbnail (owner only) |
| DELETE | `/:videoId` | Yes | Delete a video (owner only) |
| PATCH | `/toggle/publish/:videoId` | Yes | Toggle publish status (owner only) |

### Comments — `/comments`

| Method | Endpoint | Auth | Description |
|--------|----------|:---:|--------------|
| GET | `/:videoId` | Yes | Get paginated comments for a video |
| POST | `/:videoId` | Yes | Add a comment to a video |
| PATCH | `/c/:commentId` | Yes | Update a comment (owner only) |
| DELETE | `/c/:commentId` | Yes | Delete a comment (owner only) |

### Likes — `/likes`

| Method | Endpoint | Auth | Description |
|--------|----------|:---:|--------------|
| POST | `/toggle/v/:videoId` | Yes | Toggle like on a video |
| POST | `/toggle/c/:commentId` | Yes | Toggle like on a comment |
| POST | `/toggle/t/:tweetId` | Yes | Toggle like on a tweet |
| GET | `/videos` | Yes | Get all videos liked by the authenticated user |

### Playlists — `/playlists`

| Method | Endpoint | Auth | Description |
|--------|----------|:---:|--------------|
| POST | `/` | Yes | Create a playlist |
| GET | `/:playlistId` | Yes | Get a playlist with populated videos |
| PATCH | `/:playlistId` | Yes | Update name/description (owner only) |
| DELETE | `/:playlistId` | Yes | Delete a playlist (owner only) |
| PATCH | `/add/:videoId/:playlistId` | Yes | Add a video to a playlist (owner only) |
| PATCH | `/remove/:videoId/:playlistId` | Yes | Remove a video from a playlist (owner only) |
| GET | `/user/:userId` | Yes | Get all playlists for a user |

### Subscriptions — `/subscriptions`

| Method | Endpoint | Auth | Description |
|--------|----------|:---:|--------------|
| POST | `/c/:channelId` | Yes | Toggle subscription to a channel |
| GET | `/c/:channelId` | Yes | Get a channel's subscriber list |
| GET | `/u/:subscriberId` | Yes | Get channels a user is subscribed to |

### Tweets — `/tweets`

| Method | Endpoint | Auth | Description |
|--------|----------|:---:|--------------|
| POST | `/` | Yes | Create a tweet |
| GET | `/user/:userId` | Yes | Get all tweets by a user |
| PATCH | `/:tweetId` | Yes | Update a tweet (owner only) |
| DELETE | `/:tweetId` | Yes | Delete a tweet (owner only) |

### Dashboard — `/dashboard`

| Method | Endpoint | Auth | Description |
|--------|----------|:---:|--------------|
| GET | `/stats` | Yes | Get the authenticated user's channel stats (total videos, views, subscribers, likes) |
| GET | `/videos` | Yes | Get all videos uploaded by the authenticated user's channel |

\* `/refresh-tokken` doesn't require a valid access token, but does require a valid refresh token (via cookie or request body).

## Postman Collection

A Postman collection and environment are included under `/postman`. Import `postman/collections/Youtube` and `postman/environments/Youtube.environment.yaml`, and set the `server` environment variable to:

```
http://localhost:8000/api/v1
```

## Author

**Muhammad Ali Shah**
- GitHub: [@syedali067](https://github.com/syedali067)
- LinkedIn: [muhammad-ali-mern067](https://linkedin.com/in/muhammad-ali-mern067)
