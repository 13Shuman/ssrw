const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth, requireOwner } = require('../auth');

const parseTags = (tagStr) => tagStr ? tagStr.split(',').map(t => t.trim()).filter(Boolean) : [];

router.get('/', requireAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const lang = req.query.lang || '';
    const sort = req.query.sort || 'new';

    let where = 'WHERE user_id = $1';
    const values = [req.user.id];
    let idx = 2;

    if (search) {
      where += ` AND (title ILIKE $${idx} OR description ILIKE $${idx} OR tags ILIKE $${idx})`;
      values.push(`%${search}%`); idx++;
    }
    if (lang) {
      where += ` AND language = $${idx}`;
      values.push(lang); idx++;
    }

    const order = sort === 'old' ? 'ORDER BY created_at ASC' 
              : sort === 'alpha' ? 'ORDER BY title ASC' 
              : 'ORDER BY created_at DESC';

    const countRes = await pool.query(`SELECT COUNT(*) FROM snippets ${where}`, values);
    const total = parseInt(countRes.rows[0].count);

    values.push(limit, offset);
    const dataRes = await pool.query(
      `SELECT id, title, language, description, tags, created_at, updated_at 
       FROM snippets ${where} ${order} LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    const snippets = dataRes.rows.map(s => ({ ...s, tags: parseTags(s.tags) }));

    res.json({ success: true, data: { snippets, pagination: { page, limit, total } } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Ошибка получения списка' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, language, code, description, tags } = req.body;
    if (!title || !language || !code) return res.status(400).json({ success: false, error: 'Название, язык и код обязательны' });
    if (title.length > 100) return res.status(400).json({ success: false, error: 'Название > 100 символов' });
    if (code.length > 50000) return res.status(400).json({ success: false, error: 'Код > 50 000 символов' });
    if (description?.length > 100) return res.status(400).json({ success: false, error: 'Описание > 100 символов' });

    const dup = await pool.query('SELECT id FROM snippets WHERE user_id = $1 AND title = $2', [req.user.id, title.trim()]);
    if (dup.rows.length > 0) return res.status(400).json({ success: false, error: 'Название уже существует' });

    const { rows } = await pool.query(
      `INSERT INTO snippets (user_id, title, language, code, description, tags)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, title, language, code, description, tags, created_at, updated_at`,
      [req.user.id, title.trim(), language.trim(), code, description?.trim() || null, tags?.trim() || null]
    );

    res.status(201).json({ success: true, data: { snippet: { ...rows[0], tags: parseTags(rows[0].tags) } } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Ошибка создания сниппета' });
  }
});

router.patch('/:id', requireAuth, requireOwner, async (req, res) => {
  try {
    const { title, language, code, description, tags } = req.body;
    if (code?.length > 50000) return res.status(400).json({ success: false, error: 'Код > 50 000 символов' });
    if (description?.length > 100) return res.status(400).json({ success: false, error: 'Описание > 100 символов' });

    if (title) {
      const dup = await pool.query('SELECT id FROM snippets WHERE user_id = $1 AND title = $2 AND id != $3', [req.user.id, title.trim(), req.params.id]);
      if (dup.rows.length > 0) return res.status(400).json({ success: false, error: 'Название уже существует' });
    }

    const { rows } = await pool.query(
      `UPDATE snippets SET 
         title = COALESCE($1, title), language = COALESCE($2, language), code = COALESCE($3, code),
         description = COALESCE($4, description), tags = COALESCE($5, tags), updated_at = NOW()
       WHERE id = $6 AND user_id = $7 RETURNING id, title, language, code, description, tags, created_at, updated_at`,
      [title, language, code, description, tags, req.params.id, req.user.id]
    );

    if (!rows[0]) return res.status(404).json({ success: false, error: 'Сниппет не найден' });
    res.json({ success: true, data: { snippet: { ...rows[0], tags: parseTags(rows[0].tags) } } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Ошибка обновления' });
  }
});

router.delete('/:id', requireAuth, requireOwner, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM snippets WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (rowCount === 0) return res.status(404).json({ success: false, error: 'Сниппет не найден' });
    res.json({ success: true, data: { message: 'Сниппет удалён' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Ошибка удаления' });
  }
});

module.exports = router;