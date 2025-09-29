import pkg from 'pg';
const { Pool } = pkg;

export const pool = new Pool({
  user: 'postgres',
  password: 'lalitya',
  host: 'localhost',
  port: 5432,
  database: 'connect4'
});

(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS games(
        id SERIAL PRIMARY KEY,
        player1 TEXT,
        player2 TEXT,
        winner TEXT,
        moves JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leaderboard(
        username TEXT PRIMARY KEY,
        wins INT DEFAULT 0
      );`);
  } catch (err) {
    console.error('Failed to ensure DB schema:', err);
    // Don't crash — but you can rethrow if you want the process to exit
  }
})();
