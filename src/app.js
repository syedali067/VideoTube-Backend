import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN.split(',').map(o => o.trim())

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))

app.use(express.json({
    limit: '16kb'
}));
app.use(express.urlencoded({
    extended: true,
    limit: '16kb'
}));
app.use(express.static('public'));

app.use(cookieParser());

//routes
import userRoutes from './routes/user.route.js';
import healthcheckRoutes from './routes/healthcheck.route.js';
import videoRoutes from './routes/video.route.js';
import commentRoutes from './routes/comment.route.js';
import likeRoutes from './routes/like.route.js';
import playlistRoutes from './routes/playlist.route.js';
import subscriptionRoutes from './routes/subscription.route.js';
import tweetRoutes from './routes/tweet.route.js';
import dashboardRoutes from './routes/dashboard.route.js';

//routes declaration
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/healthcheck', healthcheckRoutes);
app.use('/api/v1/videos', videoRoutes);
app.use('/api/v1/comments', commentRoutes);
app.use('/api/v1/likes', likeRoutes);
app.use('/api/v1/playlists', playlistRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/tweets', tweetRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
        success: false,
        message: err.message || "Internal Server Error",
        errors: err.errors || []
    });
});


export { app };