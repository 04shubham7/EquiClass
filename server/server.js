require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const mongoose = require('mongoose');

const { listColleges, register, login } = require('./controllers/authController');
const { registerCollege } = require('./controllers/collegeController');
const {
  getMyTimetable,
  saveWeeklySchedule,
  checkProfessorAvailability,
  checkDateOverrideAvailability,
} = require('./controllers/timetableController');
const {
  createRequest,
  acceptRequest,
  getIncomingRequests,
  getOutgoingRequests,
  declineRequest,
  cancelRequest,
} = require('./controllers/requestController');
const {
  getMyLedgerSummary,
  getPairwiseBalance,
  getMyLedgerTransactions,
} = require('./controllers/ledgerController');
const { listUsers } = require('./controllers/userController');
const {
  getMyRoutine,
  updateRoutine,
  checkRoutineAvailability,
} = require('./controllers/routineController');
const {
  getAdminOverview,
  listCollegesForAdmin,
  verifyCollege,
  setCollegeActiveState,
  listUsersForAdmin,
  listAdminAuditLogs,
} = require('./controllers/adminController');
const { protect, requireRole } = require('./middleware/auth');

const app = express();

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error('MONGO_URI is not set in environment variables.');
}

app.disable('x-powered-by');

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    credentials: true,
  })
);
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(mongoSanitize());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts. Try again later.',
    },
  },
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      env: NODE_ENV,
      uptime: process.uptime(),
    },
  });
});

app.get('/api/colleges', listColleges);
app.post('/api/colleges/register', authLimiter, registerCollege);
app.post('/api/auth/register', authLimiter, register);
app.post('/api/auth/login', authLimiter, login);

app.get('/api/auth/me', protect, (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

app.get('/api/timetables/me', protect, getMyTimetable);
app.put('/api/timetables/me', protect, saveWeeklySchedule);
app.post('/api/timetables/availability', protect, checkProfessorAvailability);
app.post('/api/timetables/override-availability', protect, checkDateOverrideAvailability);
app.get('/api/users', protect, listUsers);

app.post('/api/requests', protect, createRequest);
app.get('/api/requests/incoming', protect, getIncomingRequests);
app.get('/api/requests/outgoing', protect, getOutgoingRequests);
app.patch('/api/requests/:id/accept', protect, acceptRequest);
app.patch('/api/requests/:id/decline', protect, declineRequest);
app.patch('/api/requests/:id/cancel', protect, cancelRequest);

app.get('/api/ledger/me/summary', protect, getMyLedgerSummary);
app.get('/api/ledger/me/transactions', protect, getMyLedgerTransactions);
app.get('/api/ledger/pairwise', protect, getPairwiseBalance);

app.get('/api/routine/me', protect, getMyRoutine);
app.put('/api/routine/update', protect, updateRoutine);
app.post('/api/routine/check-availability', protect, checkRoutineAvailability);

app.get('/api/admin/overview', protect, requireRole('global_admin'), getAdminOverview);
app.get('/api/admin/colleges', protect, requireRole('global_admin'), listCollegesForAdmin);
app.patch('/api/admin/colleges/:id/verify', protect, requireRole('global_admin'), verifyCollege);
app.patch('/api/admin/colleges/:id/active', protect, requireRole('global_admin'), setCollegeActiveState);
app.get('/api/admin/users', protect, requireRole('global_admin'), listUsersForAdmin);
app.get('/api/admin/audit-logs', protect, requireRole('global_admin'), listAdminAuditLogs);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.originalUrl} not found`,
    },
  });
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  if (NODE_ENV !== 'production') {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred',
      ...(NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
});

const startServer = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      autoIndex: NODE_ENV !== 'production',
    });

    const preferredPort = Number(PORT) || 5000;
    const maxAttempts = 5;

    const listenWithRetry = (port, attemptsLeft) => {
      const server = app.listen(port, () => {
        console.log(`Server running on port ${port} in ${NODE_ENV} mode`);
      });

      server.on('error', (listenError) => {
        if (listenError.code === 'EADDRINUSE' && attemptsLeft > 1) {
          const nextPort = port + 1;
          console.warn(`Port ${port} is in use. Retrying on port ${nextPort}...`);
          listenWithRetry(nextPort, attemptsLeft - 1);
          return;
        }

        console.error('Failed to start server:', listenError.message);
        process.exit(1);
      });
    };

    listenWithRetry(preferredPort, maxAttempts);
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
};

startServer();
