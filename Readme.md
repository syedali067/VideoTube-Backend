# VideoTube Backend

A YouTube-inspired backend API built with **Node.js**, **Express**, and **MongoDB**. Implements a complete authentication and user-management system with JWT-based access/refresh tokens, file uploads via Cloudinary, and a scaffolded structure for video, comments, likes, playlists, tweets, and subscriptions.

## Status

✅ **User module — fully implemented and tested**: registration, login, logout, token refresh, password change, profile updates, avatar/cover image uploads, channel profile aggregation, and watch history.

🚧 **Video, Comment, Like, Playlist, Tweet, Subscription, Dashboard, Healthcheck** — models and controller scaffolding exist but business logic is not yet implemented, and routes are not yet mounted in `app.js`.

## Tech Stack

- **Runtime:** Node.js (ESM / `"type": "module"`)
- **Framework:** Express 5
- **Database:** MongoDB with Mongoose (+ `mongoose-aggregate-paginate-v2` for paginated aggregations)
- **Auth:** JWT (access + refresh tokens), bcrypt for password hashing, httpOnly cookies
- **File uploads:** Multer (local temp storage) → Cloudinary (persistent hosting)
- **Dev tooling:** nodemon, Prettier

## Project Structure

```
src/
├── controllers/       # Route handler logic
│   ├── user.controller.js         ✅ implemented
│   ├── video.controller.js        🚧 scaffolded
│   ├── comment.controller.js      🚧 scaffolded
│   ├── like.controller.js         🚧 scaffolded
│   ├── playlist.controller.js     🚧 scaffolded
│   ├── tweet.controller.js        🚧 scaffolded
│   ├── subscription.controller.js 🚧 scaffolded
│   ├── dashboard.controller.js    🚧 scaffolded
│   └── healthcheck.controller.js  🚧 scaffolded
├── models/             # Mongoose schemas (user, video, comment, like, playlist, tweet, subscription)
├── middlewares/         # auth.middleware.js (JWT verification), multer.js (file upload handling)
├── routes/
│   └── user.route.js    # Only route module currently wired into the app
├── utils/                # ApiError, ApiResponse, asyncHandler, cloudinary upload helper
├── db/                    # MongoDB connection logic
├── app.js                 # Express app setup, middleware, route mounting, global error handler
└── index.js                # Entry point — loads env, connects DB, starts server
```

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- A MongoDB Atlas cluster (or local MongoDB instance)
- A Cloudinary account (for avatar/cover image uploads)

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

This starts the server with nodemon on `http://localhost:8000` (or your configured `PORT`), watching for file changes.

## API Reference

Base URL: `/api/v1/users`

| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|--------------|
| POST | `/register` | No | Register a new user (multipart form: `avatar`, `coverImage` files + text fields) |
| POST | `/login` | No | Log in with username/email + password; returns access & refresh tokens |
| POST | `/logout` | Yes | Clear tokens and log out |
| POST | `/refresh-tokken` | No (needs refresh token) | Issue a new access token using a valid refresh token |
| POST | `/change-password` | Yes | Change the logged-in user's password |
| GET | `/current-user` | Yes | Get the currently authenticated user's profile |
| PATCH | `/update-account` | Yes | Update `fullName` and `email` |
| PATCH | `/avatar` | Yes | Update avatar image (multipart form: `avatar` file) |
| PATCH | `/cover-image` | Yes | Update cover image (multipart form: `coverImage` file) |
| GET | `/c/:username` | Yes | Get a channel's public profile with subscriber counts |
| GET | `/history` | Yes | Get the authenticated user's watch history |

**Auth:** Protected routes accept either an `accessToken` httpOnly cookie (set automatically on login) or an `Authorization: Bearer <token>` header.

**Response format:**
```json
{
  "status": 200,
  "message": "Description of what happened",
  "data": { },
  "success": true
}
```

Errors follow the same shape with `"success": false` and an `"errors"` array.

## Postman Collection

A Postman collection and environment are included under `/postman` for testing all implemented endpoints. Import `postman/collections/Youtube` and `postman/environments/Youtube.environment.yaml` into Postman, and set the `server` environment variable to your local base URL, e.g.:

```
http://localhost:8000/api/v1
```

## Roadmap

- [ ] Implement and mount `video.route.js` (upload, stream, update, delete videos)
- [ ] Implement `comment`, `like`, `playlist`, `tweet`, and `subscription` modules
- [ ] Implement `healthcheck` endpoint
- [ ] Implement `dashboard` (channel stats) endpoint
- [ ] Add request validation layer
- [ ] Add automated tests

## Author

**Muhammad Ali Shah**
- GitHub: [@syedali067](https://github.com/syedali067)
- LinkedIn: [muhammad-ali-mern067](https://linkedin.com/in/muhammad-ali-mern067)
