const express = require('express');
const { cookieParser, requireAuth, hashPwd, signCookie } = require('./auth');
const { pool } = require('./db');
const setupSnippets = require('./snippets');
const app = express();

app.use(express.json());
app.use(cookieParser);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || FRONTEND_ORIGIN);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || password.length < 6) return res.status(400).json({ error: 'Invalid credentials' });
  try {
    const { rows: [user] } = await pool.query('INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id', [email.toLowerCase(), hashPwd(password)]);
    res.cookie('sid', signCookie(String(user.id)), { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' });
    res.json({ id: user.id, email });
  } catch (err) {
    if (err.code === '23505') res.status(409).json({ error: 'Email exists' });
    else res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const { rows: [user] } = await pool.query('SELECT id, password_hash, email FROM users WHERE email=$1', [email?.toLowerCase()]);
  if (!user || user.password_hash !== hashPwd(password)) return res.status(401).json({ error: 'Invalid credentials' });
  res.cookie('sid', signCookie(String(user.id)), { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' });
  res.json({ id: user.id, email: user.email });
});

app.post('/api/logout', (_, res) => { res.clearCookie('sid'); res.json({ success: true }); });

setupSnippets(app, { requireAuth });
app.use((_, res) => res.status(404).json({ error: 'Not found' }));

app.listen(process.env.PORT || 3000, () => console.log('Server running'));
