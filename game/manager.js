import { createEmptyBoard, dropDisc, checkWin, isFull } from './board.js';
import { botMove } from './bot.js';
import { pool } from '../db.js';

class GameManager {
  constructor() {
    this.waiting = [];
    this.games = new Map();
    this.disconnectedPlayers = new Map();
  }

  handleConnection(ws) {
    ws.on('message', raw => {
      try {
        const msg = JSON.parse(raw);
        if (msg.type === 'join') this.handleJoin(ws, msg.username);
        if (msg.type === 'move') this.handleMove(ws, msg.col);
        if (msg.type === 'reconnect') this.handleReconnect(ws, msg.username, msg.gameId);
      } catch (err) {
        console.error('Message parsing error:', err);
      }
    });

    ws.on('close', () => this.handleDisconnect(ws));
    ws.on('error', err => console.error('WebSocket error:', err));
  }

  handleJoin(ws, username) {
    ws.username = username;
    ws.isAlive = true;

    if (ws.timeout) clearTimeout(ws.timeout);

    const opponent = this.waiting.shift();
    if (opponent) {
      if (opponent.timeout) clearTimeout(opponent.timeout);
      this.startGame(opponent, ws);
    } else {
      this.waiting.push(ws);
      ws.timeout = setTimeout(() => this.startBotGame(ws), 10000);
    }
  }

  handleReconnect(ws, username, gameId) {
    const game = this.games.get(gameId);
    if (!game) return;

    const playerIndex = game.players.findIndex(p => p.username === username);
    if (playerIndex === -1) return;

    const disconnectedKey = `${gameId}_${username}`;
    if (this.disconnectedPlayers.has(disconnectedKey)) {
      clearTimeout(this.disconnectedPlayers.get(disconnectedKey));
      this.disconnectedPlayers.delete(disconnectedKey);
    }

    ws.username = username;
    ws.gameId = gameId;
    ws.isAlive = true;
    game.players[playerIndex] = ws;

    ws.send(JSON.stringify({ type: 'reconnected', you: playerIndex, board: game.board, turn: game.turn }));
  }

  handleDisconnect(ws) {
    if (ws.timeout) clearTimeout(ws.timeout);

    const waitingIndex = this.waiting.indexOf(ws);
    if (waitingIndex > -1) {
      this.waiting.splice(waitingIndex, 1);
      return;
    }

    const game = this.games.get(ws.gameId);
    if (!game || game.bot) return;

    const playerIndex = game.players.indexOf(ws);
    if (playerIndex === -1) return;

    const disconnectedKey = `${ws.gameId}_${ws.username}`;
    this.disconnectedPlayers.set(disconnectedKey, setTimeout(() => {
      const otherPlayer = game.players[1 - playerIndex];
      if (otherPlayer && otherPlayer.username !== 'BOT') this.endGame(game, otherPlayer.username);
      this.disconnectedPlayers.delete(disconnectedKey);
    }, 30000));

    const otherPlayer = game.players[1 - playerIndex];
    if (otherPlayer && otherPlayer.readyState === 1) {
      otherPlayer.send(JSON.stringify({ type: 'opponent_disconnected', message: 'Opponent disconnected. They have 30 seconds to reconnect.' }));
    }
  }

  startGame(p1, p2, bot = false) {
    const id = Date.now().toString();
    const board = createEmptyBoard();
    const game = { id, board, players: [p1, p2], turn: 0, bot, moves: [] };
    this.games.set(id, game);

    [p1, p2].forEach((p, i) => {
      if (p.username !== 'BOT') {
        p.gameId = id;
        p.send(JSON.stringify({ type: 'start', you: i, board: game.board, gameId: id }));
      }
    });

    if (bot && game.turn === 1) setTimeout(() => this.executeBotMove(game), 500);
  }

  startBotGame(p1) {
    const dummy = { username: 'BOT', send: () => {} };
    this.startGame(p1, dummy, true);
  }

  handleMove(ws, col) {
    const game = this.games.get(ws.gameId);
    if (!game) return;

    const playerIndex = game.players.indexOf(ws);
    if (playerIndex !== game.turn) return;

    const row = dropDisc(game.board, col, game.turn);
    if (row === -1) return;

    game.moves.push({ player: game.turn, col, row, timestamp: Date.now() });
    this.broadcast(game, { type: 'update', board: game.board, lastMove: { col, row, player: game.turn } });

    if (checkWin(game.board, game.turn)) return this.endGame(game, ws.username);
    if (isFull(game.board)) return this.endGame(game, null);

    game.turn = 1 - game.turn;
    if (game.bot && game.players[game.turn].username === 'BOT') setTimeout(() => this.executeBotMove(game), 800);
  }

  executeBotMove(game) {
    if (!this.games.has(game.id)) return;
    const botCol = botMove(game.board, 1, 0);
    const row = dropDisc(game.board, botCol, 1);
    if (row === -1) return;

    game.moves.push({ player: 1, col: botCol, row, timestamp: Date.now() });
    this.broadcast(game, { type: 'update', board: game.board, lastMove: { col: botCol, row, player: 1 } });

    if (checkWin(game.board, 1)) return this.endGame(game, 'BOT');
    if (isFull(game.board)) return this.endGame(game, null);

    game.turn = 0;
  }

  broadcast(game, data) {
    game.players.forEach(p => {
      if (!p || p.username === 'BOT') return;
      if (p.readyState === 1) p.send(JSON.stringify(data));
    });
  }

  async endGame(game, winner) {
    this.broadcast(game, { type: 'end', winner, board: game.board, moves: game.moves });

    try {
      await this.saveGameToDatabase(game, winner);
      if (winner && winner !== 'BOT') await this.updateLeaderboard(winner);
    } catch (err) {
      console.error('Database error in endGame:', err);
    }

    this.games.delete(game.id);
    game.players.forEach(p => { if (p && p.username !== 'BOT') p.gameId = null; });
  }

  async saveGameToDatabase(game, winner) {
    await pool.query(
      `INSERT INTO games(player1, player2, winner, moves, created_at) VALUES($1,$2,$3,$4,NOW())`,
      [game.players[0].username, game.players[1].username, winner, JSON.stringify(game.moves)]
    );
  }

  async updateLeaderboard(winner) {
  console.log('Updating leaderboard for', winner);
  try {
    const res = await pool.query(
      `INSERT INTO leaderboard(username, wins, games_played)
       VALUES($1, 1, 1)
       ON CONFLICT(username) 
       DO UPDATE SET wins = leaderboard.wins + 1, games_played = leaderboard.games_played + 1`,
      [winner]
    );
    console.log('Leaderboard updated', res.rowCount);
  } catch (err) {
    console.error('Leaderboard update failed:', err);
  }
}


  async getLeaderboard(limit = 10) {
  try {
    const { rows } = await pool.query(
      `SELECT username, wins, games_played,
       CASE WHEN games_played>0 THEN ROUND((wins::decimal / games_played)*100,1) ELSE 0 END AS win_rate
       FROM leaderboard
       ORDER BY wins DESC, win_rate DESC
       LIMIT $1`,
      [limit]
    );
    console.log('Leaderboard rows:', rows); // see what comes from DB
    return rows;
  } catch (err) {
    console.error('getLeaderboard error:', err);
    throw err; // triggers 500
  }
}


  async getGameHistory(username, limit = 10) {
    const { rows } = await pool.query(
      `SELECT player1, player2, winner, created_at
       FROM games
       WHERE player1=$1 OR player2=$1
       ORDER BY created_at DESC
       LIMIT $2`,
      [username, limit]
    );
    return rows;
  }

  getActiveGamesCount() { return this.games.size; }
  getWaitingPlayersCount() { return this.waiting.length; }
  getGameStats() {
    return { activeGames: this.getActiveGamesCount(), waitingPlayers: this.getWaitingPlayersCount(), totalPlayers: this.games.size * 2 + this.waiting.length };
  }

  setupHeartbeat(wss) {
    setInterval(() => {
      wss.clients.forEach(ws => {
        if (!ws.isAlive) ws.terminate();
        else ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    wss.on('connection', ws => {
      ws.isAlive = true;
      ws.on('pong', () => ws.isAlive = true);
    });
  }
}

export default GameManager;
