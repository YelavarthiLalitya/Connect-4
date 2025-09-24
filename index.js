import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { Pool } from 'pg';
import { createEmptyBoard, dropDisc, checkWin, isFull } from './game/board.js';
import { botMove } from './game/bot.js';

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL pool
export const pool = new Pool({
  user: 'postgres',
  password: 'lalitya',
  database: 'connect4',
  host: 'localhost',
  port: 5432,
});

// Leaderboard endpoint
app.get('/leaderboard', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT username, wins FROM leaderboard ORDER BY wins DESC LIMIT 10'
    );
    res.json(rows); // frontend can now fetch this
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Use environment port first, fallback to 3000
const PORT = process.env.PORT || 3000;

// Bind to 0.0.0.0 so it's accessible outside the container
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});


// WebSocket server on same port
const wss = new WebSocketServer({ server });

// --- Game Manager ---
const waiting = [];
const games = new Map();

wss.on('connection', ws => {
  ws.on('message', raw => {
    const msg = JSON.parse(raw);
    if (msg.type === 'join') handleJoin(ws, msg.username);
    if (msg.type === 'move') handleMove(ws, msg.col);
  });
});

// --- Game Functions ---
function handleJoin(ws, username) {
  ws.username = username;
  const opponent = waiting.shift();
  if (opponent) startGame(opponent, ws);
  else {
    waiting.push(ws);
    ws.timeout = setTimeout(() => startBotGame(ws), 10000);
  }
}

function startGame(p1, p2, bot = false) {
  const id = Date.now().toString();
  const board = createEmptyBoard();
  const game = { id, board, players: [p1, p2], turn: 0, bot };
  games.set(id, game);

  [p1, p2].forEach((p,i) => {
    p.gameId = id;
    p.send(JSON.stringify({ type:'start', you:i }));
  });

  if (bot) botMoveAndEmit(game);
}

function startBotGame(p1) {
  const dummy = { username: 'BOT', send: () => {} };
  startGame(p1, dummy, true);
}

function handleMove(ws, col) {
  const game = games.get(ws.gameId);
  if (!game) return;

  const playerIndex = game.players.indexOf(ws);
  if (playerIndex !== game.turn) return; // not your turn

  const row = dropDisc(game.board, col, game.turn);
  if (row === -1) return; // column full

  // Broadcast updated board before checking win
  broadcast(game, { type:'update', board: game.board });

  if (checkWin(game.board, game.turn)) return endGame(game, ws.username);
  if (isFull(game.board)) return endGame(game, null);

  game.turn = 1 - game.turn;

  // Bot move if needed
  if (game.bot && game.players[game.turn].username === 'BOT') {
    const botCol = botMove(game.board, 1, 0);
    dropDisc(game.board, botCol, 1);
    broadcast(game, { type:'update', board: game.board });
    if (checkWin(game.board, 1)) return endGame(game, 'BOT');
    game.turn = 0;
  }
}

function botMoveAndEmit(game) {
  const botCol = botMove(game.board, 1, 0);
  dropDisc(game.board, botCol, 1);
  broadcast(game, { type:'update', board: game.board });
  game.turn = 0;
}

function broadcast(game, data) {
  game.players.forEach(p => p.username !== 'BOT' && p.send(JSON.stringify(data)));
}

async function endGame(game, winner) {
  broadcast(game, { type:'end', winner, board: game.board });
  games.delete(game.id);

  // Save game in Postgres
  await pool.query(
    'INSERT INTO games(player1, player2, winner, moves) VALUES($1,$2,$3,$4)',
    [
      game.players[0].username,
      game.players[1].username,
      winner,
      JSON.stringify(game.board)
    ]
  );

  // Update leaderboard
  if (winner && winner !== 'BOT') {
    await pool.query(
      `INSERT INTO leaderboard(username, wins)
       VALUES($1, 1)
       ON CONFLICT (username)
       DO UPDATE SET wins = leaderboard.wins + 1`,
      [winner]
    );
  }
}
