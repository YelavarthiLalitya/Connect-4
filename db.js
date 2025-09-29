import { Pool } from 'pg';
import 'dotenv/config'; // only needed for local dev

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

export async function initializeDatabase() {
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

    console.log('Database initialized');
  } catch (err) {
    console.error('Database initialization failed:', err);
    process.exit(1);
  }
}

export { pool };
