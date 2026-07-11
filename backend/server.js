require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { protect } = require('./middleware/auth');
const db = require('./config/db');

const {
  authRouter, userRouter, chapterRouter,
  quizRouter, activityRouter, peerRouter, aiRouter
} = require('./routes/index');

const app  = express();
const PORT = process.env.PORT || 5005;

// const allowedOrigins = [
//   'http://localhost:3000',
//   'http://localhost:3001',
//   'https://mms-system-indol.vercel.app'
// ];

app.use(cors({ 
  origin: process.env.CLIENT_URL || 'http://localhost:3001', 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// routes
app.use('/api/auth',       authRouter);
app.use('/api/users',      userRouter);
app.use('/api/chapters',   chapterRouter);
app.use('/api/quiz',       quizRouter);
app.use('/api/activities', activityRouter);
app.use('/api/peer',       peerRouter);
app.use('/api/ai',         aiRouter);

// health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', system: 'MMS API', timestamp: new Date() }));

// serve react production
// if (process.env.NODE_ENV === 'production') {
//   app.use(express.static(path.join(__dirname, '../frontend/build')));
//   app.get('*', (req, res) =>
//     res.sendFile(path.join(__dirname, '../frontend/build/index.html'))
//   );
// }

app.get('/', (req, res) => {
  res.json({ message: "MMS API Server is live and running!" });
});

//error handler
app.use((err, req, res, next) => {
  console.error(' Unhandled error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// Explicitly bind to '0.0.0.0' to ensure Railway picks up the port instantly
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Server runnig port: https://localhost:${PORT}`)
  
});

module.exports = app;
