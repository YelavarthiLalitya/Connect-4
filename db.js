import pkg from 'pg';
const { Pool } = pkg;

export const pool = new Pool({
  user: 'postgres',          // 👈 your username
  password: 'lalitya',       // 👈 your password
  host: 'localhost',
  port: 5432,
  database: 'connect4'       // make sure this database exists
});

// Create tables if they don't exist
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS games(
      id SERIAL PRIMARY KEY,
      player1 TEXT,
      player2 TEXT,
      winner TEXT,
      moves JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leaderboard(
      username TEXT PRIMARY KEY,
      wins INT DEFAULT 0
    );
  `);
})();
