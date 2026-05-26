require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const snippetRoutes = require('./routes/snippets');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/snippets', snippetRoutes);

app.get('/', (req, res) => res.json({ success: true, message: 'API работает' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, '0.0.0.0' ,async () => {
  try {
    await pool.query('SELECT 1');
    console.log(`PostgreSQL подключен`);
    console.log(`Сервер запущен: http://localhost:${PORT}`);
  } catch (err) {
    console.error('Ошибка подключения к БД:', err.message);
  }
});