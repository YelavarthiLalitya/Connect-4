import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set');
  console.error('Please set DATABASE_URL to your PostgreSQL connection string');
  console.error('Example: DATABASE_URL=postgresql://user:password@host:port/database');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initializeDatabase() {
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
        wins INT DEFAULT 0,
        games_played INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );`);
  } catch (err) {
    console.error('Database initialization failed:', err);
    process.exit(1);
  }
}

initializeDatabase();

export { pool };