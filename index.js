import express from 'express';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';
import { createEmptyBoard, dropDisc, checkWin, isFull } from './game/board.js';
import { botMove } from './game/bot.js';
import 'dotenv/config';


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/leaderboard', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT username, wins FROM leaderboard ORDER BY wins DESC LIMIT 10'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

const wss = new WebSocketServer({ server });

const waiting = [];
const games = new Map();
const disconnectedPlayers = new Map();

wss.on('connection', ws => {
  ws.on('message', raw => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'join') handleJoin(ws, msg.username);
      if (msg.type === 'move') handleMove(ws, msg.col);
      if (msg.type === 'reconnect') handleReconnect(ws, msg.username, msg.gameId);
    } catch (err) {
      console.error('Message parsing error:', err);
    }
  });

  ws.on('close', () => {
    handleDisconnect(ws);
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

function handleJoin(ws, username) {
  ws.username = username;
  ws.isAlive = true;
  
  if (ws.timeout) {
    clearTimeout(ws.timeout);
  }
  
  const opponent = waiting.shift();
  if (opponent) {
    if (opponent.timeout) {
      clearTimeout(opponent.timeout);
    }
    startGame(opponent, ws);
  } else {
    waiting.push(ws);
    ws.timeout = setTimeout(() => startBotGame(ws), 10000);
  }
}

function handleReconnect(ws, username, gameId) {
  const game = games.get(gameId);
  if (!game) return;
  
  const playerIndex = game.players.findIndex(p => p.username === username);
  if (playerIndex === -1) return;
  
  const disconnectedKey = `${gameId}_${username}`;
  if (disconnectedPlayers.has(disconnectedKey)) {
    clearTimeout(disconnectedPlayers.get(disconnectedKey));
    disconnectedPlayers.delete(disconnectedKey);
  }
  
  ws.username = username;
  ws.gameId = gameId;
  ws.isAlive = true;
  game.players[playerIndex] = ws;
  
  ws.send(JSON.stringify({ 
    type: 'reconnected', 
    you: playerIndex, 
    board: game.board,
    turn: game.turn 
  }));
}

function handleDisconnect(ws) {
  if (ws.timeout) {
    clearTimeout(ws.timeout);
  }
  
  const waitingIndex = waiting.indexOf(ws);
  if (waitingIndex > -1) {
    waiting.splice(waitingIndex, 1);
    return;
  }
  
  const game = games.get(ws.gameId);
  if (!game || game.bot) return;
  
  const playerIndex = game.players.indexOf(ws);
  if (playerIndex === -1) return;
  
  const disconnectedKey = `${ws.gameId}_${ws.username}`;
  disconnectedPlayers.set(disconnectedKey, setTimeout(() => {
    const otherPlayer = game.players[1 - playerIndex];
    if (otherPlayer && otherPlayer.username !== 'BOT') {
      endGame(game, otherPlayer.username);
    }
    disconnectedPlayers.delete(disconnectedKey);
  }, 30000));
  
  const otherPlayer = game.players[1 - playerIndex];
  if (otherPlayer && otherPlayer.readyState === 1) {
    otherPlayer.send(JSON.stringify({ 
      type: 'opponent_disconnected', 
      message: 'Opponent disconnected. They have 30 seconds to reconnect.' 
    }));
  }
}

function startGame(p1, p2, bot = false) {
  const id = Date.now().toString();
  const board = createEmptyBoard();
  const game = { id, board, players: [p1, p2], turn: 0, bot };
  games.set(id, game);

  [p1, p2].forEach((p, i) => {
    if (p.username !== 'BOT') {
      p.gameId = id;
      p.send(JSON.stringify({ type: 'start', you: i, board: game.board }));
    }
  });

  if (bot && game.turn === 1) {
    setTimeout(() => botMoveAndEmit(game), 500);
  }
}

function startBotGame(p1) {
  const dummy = { username: 'BOT', send: () => {} };
  startGame(p1, dummy, true);
}

function handleMove(ws, col) {
  const game = games.get(ws.gameId);
  if (!game) return;

  const playerIndex = game.players.indexOf(ws);
  if (playerIndex !== game.turn) return;

  const row = dropDisc(game.board, col, game.turn);
  if (row === -1) return;

  broadcast(game, { type: 'update', board: game.board });

  if (checkWin(game.board, game.turn)) return endGame(game, ws.username);
  if (isFull(game.board)) return endGame(game, null);

  game.turn = 1 - game.turn;

  if (game.bot && game.players[game.turn].username === 'BOT') {
    setTimeout(() => {
      const botCol = botMove(game.board, 1, 0);
      dropDisc(game.board, botCol, 1);
      broadcast(game, { type: 'update', board: game.board });
      if (checkWin(game.board, 1)) return endGame(game, 'BOT');
      if (isFull(game.board)) return endGame(game, null);
      game.turn = 0;
    }, 500);
  }
}

function botMoveAndEmit(game) {
  const botCol = botMove(game.board, 1, 0);
  dropDisc(game.board, botCol, 1);
  broadcast(game, { type: 'update', board: game.board });
  if (checkWin(game.board, 1)) return endGame(game, 'BOT');
  if (isFull(game.board)) return endGame(game, null);
  game.turn = 0;
}

function broadcast(game, data) {
  game.players.forEach(p => {
    if (!p || p.username === 'BOT') return;
    try {
      if (p.readyState === 1) {
        p.send(JSON.stringify(data));
      }
    } catch (err) {
      console.error('Broadcast error:', err);
    }
  });
}

async function endGame(game, winner) {
  broadcast(game, { type: 'end', winner, board: game.board });
  games.delete(game.id);

  try {
    await pool.query(
      'INSERT INTO games(player1, player2, winner, moves) VALUES($1,$2,$3,$4)',
      [
        game.players[0].username,
        game.players[1].username,
        winner,
        JSON.stringify(game.board)
      ]
    );

    if (winner && winner !== 'BOT') {
      await pool.query(
        `INSERT INTO leaderboard(username, wins)
         VALUES($1, 1)
         ON CONFLICT (username)
         DO UPDATE SET wins = leaderboard.wins + 1`,
        [winner]
      );
    }
  } catch (err) {
    console.error('Database error in endGame:', err);
  }
}

setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) {
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('connection', ws => {
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });
});
