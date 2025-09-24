import { createEmptyBoard, dropDisc, checkWin, isFull } from './board.js';
import { botMove } from './bot.js';
import { pool } from '../db.js';

const waiting = [];
const games = new Map();

export function createGameServer(wss) {
  wss.on('connection', ws => {
    ws.on('message', raw => {
      const msg = JSON.parse(raw);
      if (msg.type === 'join') handleJoin(ws, msg.username);
      if (msg.type === 'move') handleMove(ws, msg.col);
    });
  });
}

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

  // **Broadcast updated board first**
  broadcast(game, { type:'update', board: game.board });

  // Then check win/draw
  if (checkWin(game.board, game.turn)) return endGame(game, ws.username);
  if (isFull(game.board)) return endGame(game, null);

  game.turn = 1 - game.turn;

  // Bot move if needed
  if (game.bot && game.players[game.turn].username === 'BOT') {
    const botCol = botMove(game.board, 1, 0);
    dropDisc(game.board, botCol, 1);
    broadcast(game, { type:'update', board: game.board }); // broadcast bot move too
    if (checkWin(game.board, 1)) return endGame(game, 'BOT');
    game.turn = 0;
  }
}


function botMoveAndEmit(game) {
  const col = botMove(game.board, 1, 0);
  dropDisc(game.board, col, 1);
  broadcast(game, { type: 'update', board: game.board });

  if (checkWin(game.board, 1)) return endGame(game, 'BOT');
  if (isFull(game.board)) return endGame(game, null);

  game.turn = 0;
}

function broadcast(game, data) {
  game.players.forEach(p => p.username !== 'BOT' && p.send(JSON.stringify(data)));
}

async function endGame(game, winner) {
  // Broadcast the final board first
  broadcast(game, { type:'end', winner, board: game.board });
  games.delete(game.id);

  // Save the game
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
       VALUES($1,1)
       ON CONFLICT (username)
       DO UPDATE SET wins = leaderboard.wins + 1`,
      [winner]
    );
  }
}
