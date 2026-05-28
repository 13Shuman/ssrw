const { pool } = require('./db');

const parseTags = (q) => {
  if (!q) return { sql: '', params: [] };
  const orGroups = q.split('||').map(g => g.trim()).filter(Boolean);
  let sqlParts = [], params = [], p = 1;
  for (const group of orGroups) {
    const tags = group.split('&&').map(t => t.trim().toLowerCase()).filter(Boolean);
    if (!tags.length) continue;
    const andParts = tags.map(t => { 
      params.push(`%${t}%`); 
      return `EXISTS (SELECT 1 FROM snippet_tags st JOIN tags t ON st.tag_id=t.id WHERE st.snippet_id=s.id AND t.name ILIKE $${p++})`; 
    });
    sqlParts.push(`(${andParts.join(' AND ')})`);
  }
  return { sql: sqlParts.length ? `AND (${sqlParts.join(' OR ')})` : '', params };
};

const validateTag = (t) => t.startsWith('#') && t.length > 1 && !t.includes(' ');

module.exports = (app, { requireAuth }) => {
  app.get('/api/tags', async (_, res) => {
    const { rows } = await pool.query('SELECT name FROM tags ORDER BY name');
    res.json(rows.map(r => r.name));
  });

  app.get('/api/my-tags', requireAuth, async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT DISTINCT t.name 
        FROM tags t
        JOIN snippet_tags st ON t.id = st.tag_id
        JOIN snippets s ON st.snippet_id = s.id
        WHERE s.user_id = $1
        ORDER BY t.name
      `, [req.userId]);
      res.json(rows.map(r => r.name));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.get('/api/snippets', requireAuth, async (req, res) => {
    const { page = 1, limit = 20, lang, sort, q, tags } = req.query;
    const p = Math.max(1, parseInt(page)), l = Math.max(1, parseInt(limit));
    const offset = (p - 1) * l;
    
    let where = 'WHERE s.user_id = $1';
    const params = [req.userId];
    let idx = 2;
    
    if (lang?.trim()) { params.push(lang.trim()); where += ` AND s.language = $${idx++}`; }
    if (q?.trim()) {
      const v = `%${q.trim()}%`;
      params.push(v);
      where += ` AND (s.title ILIKE $${idx} OR s.description ILIKE $${idx} OR EXISTS (SELECT 1 FROM snippet_tags st JOIN tags t ON st.tag_id=t.id WHERE st.snippet_id=s.id AND t.name ILIKE $${idx}))`;
      idx++;
    }
    
    const { sql: tagSql, params: tagParams } = parseTags(tags?.trim());
    where += tagSql; params.push(...tagParams);
    
    const sortMap = { newest: 's.created_at DESC', oldest: 's.created_at ASC', alpha: 's.title ASC' };
    const orderBy = sortMap[sort?.trim()] || sortMap.newest;
    
    const limitIdx = idx++;
    const offsetIdx = idx++;
    
    try {
      const { rows: items } = await pool.query(`
        SELECT s.id, s.title, s.language, s.description, s.is_public, s.created_at, s.updated_at, u.email as author,
        (SELECT json_agg(t.name) FROM snippet_tags st JOIN tags t ON st.tag_id=t.id WHERE st.snippet_id=s.id) as tags
        FROM snippets s JOIN users u ON s.user_id = u.id ${where} ORDER BY ${orderBy} LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        [...params, l, offset]);
      
      const { rows: [{ count }] } = await pool.query(`SELECT COUNT(*) FROM snippets s ${where}`, params);
      res.json({ items, total: parseInt(count), page: p, pages: Math.ceil(count / l) });
    } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
  });

  app.get('/api/users/:username/snippets', async (req, res) => {
    const { page = 1, limit = 20, lang, sort, q, tags } = req.query;
    const p = Math.max(1, parseInt(page)), l = Math.max(1, parseInt(limit));
    const offset = (p - 1) * l;
    const username = decodeURIComponent(req.params.username);
    
    try {
      const { rows: [user] } = await pool.query('SELECT id, email FROM users WHERE email = $1', [username]);
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      const isOwner = req.userId === user.id;
      let where = isOwner ? 'WHERE s.user_id = $1' : 'WHERE s.user_id = $1 AND s.is_public = TRUE';
      const params = [user.id];
      let idx = 2;
      
      if (lang?.trim()) { params.push(lang.trim()); where += ` AND s.language = $${idx++}`; }
      if (q?.trim()) {
        const v = `%${q.trim()}%`;
        params.push(v);
        where += ` AND (s.title ILIKE $${idx} OR s.description ILIKE $${idx} OR EXISTS (SELECT 1 FROM snippet_tags st JOIN tags t ON st.tag_id=t.id WHERE st.snippet_id=s.id AND t.name ILIKE $${idx}))`;
        idx++;
      }
      const { sql: tagSql, params: tagParams } = parseTags(tags?.trim());
      where += tagSql; params.push(...tagParams);
      
      const sortMap = { newest: 's.created_at DESC', oldest: 's.created_at ASC', alpha: 's.title ASC' };
      const orderBy = sortMap[sort?.trim()] || sortMap.newest;
      
      const limitIdx = idx++;
      const offsetIdx = idx++;
      
      const { rows: items } = await pool.query(`
        SELECT s.id, s.title, s.language, s.description, s.is_public, s.created_at, s.updated_at, u.email as author,
        (SELECT json_agg(t.name) FROM snippet_tags st JOIN tags t ON st.tag_id=t.id WHERE st.snippet_id=s.id) as tags
        FROM snippets s JOIN users u ON s.user_id = u.id ${where} ORDER BY ${orderBy} LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        [...params, l, offset]);
      
      const { rows: [{ count }] } = await pool.query(`SELECT COUNT(*) FROM snippets s ${where}`, params);
      res.json({ items, total: parseInt(count), page: p, pages: Math.ceil(count / l), username: user.email, isOwner });
    } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
  });

  app.get('/api/snippets/:username/:id', async (req, res) => {
    try {
      const { rows: [s] } = await pool.query(`
        SELECT s.*, u.email as author FROM snippets s JOIN users u ON s.user_id = u.id 
        WHERE s.id = $1 AND u.email = $2`,
        [req.params.id, decodeURIComponent(req.params.username)]);
      if (!s) return res.status(404).json({ error: 'Snippet not found' });
      if (!s.is_public && req.userId !== s.user_id) return res.status(403).json({ error: 'Private snippet' });
      const { rows: tags } = await pool.query('SELECT t.name FROM snippet_tags st JOIN tags t ON st.tag_id=t.id WHERE st.snippet_id=$1', [s.id]);
      res.json({ ...s, tags: tags.map(t => t.name) });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/snippets', requireAuth, async (req, res) => {
    const { title, language, code, description, tags: rawTags, is_public = true } = req.body;
    if (!title || !language || !code || code.length > 50000) return res.status(400).json({ error: 'Validation failed' });
    const tagList = (rawTags || '').split(',').map(t => t.trim()).filter(validateTag);
    try {
      const { rows: [snippet] } = await pool.query(
        'INSERT INTO snippets (user_id, title, language, code, description, is_public) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [req.userId, title, language, code, description || '', is_public]
      );
      if (tagList.length) {
        await pool.query("INSERT INTO tags (name) SELECT unnest($1::text[]) ON CONFLICT (name) DO NOTHING", [tagList]);
        await pool.query('INSERT INTO snippet_tags SELECT $1, id FROM tags WHERE name = ANY($2::text[]) ON CONFLICT DO NOTHING', [snippet.id, tagList]);
      }
      res.status(201).json(snippet);
    } catch (err) {
      if (err.code === '23505') res.status(409).json({ error: 'Title already exists' });
      else res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/snippets/:id', requireAuth, async (req, res) => {
    const { title, language, code, description, tags: rawTags, is_public } = req.body;
    if (!title || !language || !code || code.length > 50000) return res.status(400).json({ error: 'Validation failed' });
    const tagList = (rawTags || '').split(',').map(t => t.trim()).filter(validateTag);
    try {
      const { rows: [s] } = await pool.query('SELECT user_id FROM snippets WHERE id = $1', [req.params.id]);
      if (!s || s.user_id !== req.userId) return res.status(403).json({ error: 'Forbidden' });
      await pool.query('UPDATE snippets SET title=$1, language=$2, code=$3, description=$4, is_public=$5, updated_at=NOW() WHERE id=$6 AND user_id=$7',
        [title, language, code, description || '', is_public, req.params.id, req.userId]);
      await pool.query('DELETE FROM snippet_tags WHERE snippet_id = $1', [req.params.id]);
      if (tagList.length) {
        await pool.query("INSERT INTO tags (name) SELECT unnest($1::text[]) ON CONFLICT (name) DO NOTHING", [tagList]);
        await pool.query('INSERT INTO snippet_tags SELECT $1, id FROM tags WHERE name = ANY($2::text[]) ON CONFLICT DO NOTHING', [req.params.id, tagList]);
      }
      res.json({ id: req.params.id });
    } catch (err) {
      if (err.code === '23505') res.status(409).json({ error: 'Title already exists' });
      else res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/snippets/:id', requireAuth, async (req, res) => {
    const { rows: [d] } = await pool.query('DELETE FROM snippets WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.userId]);
    d ? res.json({ success: true }) : res.status(404).json({ error: 'Not found or forbidden' });
  });
};