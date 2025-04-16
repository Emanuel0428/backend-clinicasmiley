// src/index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const dataRoutes = require('./routes/dataRoutes');
const recordRoutes = require('./routes/recordRoutes');
const sedeRoutes = require('./routes/sedeRoutes');
const errorHandler = require('./middleware/errorHandler');
const cajaRoutes = require('./routes/cajaRoutes');
const gastosRoutes = require('./routes/gastosRoutes');
const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', dataRoutes);
app.use('/api', recordRoutes);
app.use('/api', sedeRoutes); 
app.use('/api', cajaRoutes);
app.use('/api', gastosRoutes);  

// Error Handling Middleware
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});