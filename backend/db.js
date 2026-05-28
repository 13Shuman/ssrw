const { Pool } = require('pg');
module.exports.pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:12345678@localhost:5432/snippet_db'
});
