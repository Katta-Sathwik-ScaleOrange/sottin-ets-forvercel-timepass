require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { errorHandler } = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth.routes');
const apartmentRoutes = require('./routes/apartments.routes');
const officeRoutes = require('./routes/offices.routes');
const surveyRoutes = require('./routes/survey.routes');
const routesRoutes = require('./routes/routes.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const bookingRoutes = require('./routes/bookings.routes');
const tripRoutes = require('./routes/trips.routes');
const adminRoutes = require('./routes/admin.routes');
const usersRoutes = require('./routes/users.routes');

const app = express();

app.use(helmet());
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, mobile apps, Vite proxy)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(morgan('dev'));

// Razorpay webhook needs raw body
app.use('/api/bookings/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', stage: process.env.APP_STAGE }));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/apartments', apartmentRoutes);
app.use('/api/offices', officeRoutes);
app.use('/api/survey', surveyRoutes);
app.use('/api/routes', routesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', usersRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚌 Tellapur Transit API running on :${PORT}`));
