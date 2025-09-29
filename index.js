import express from 'express';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import GameManager from './game/manager.js';
import 'dotenv/config';


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const gameManager = new GameManager();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/leaderboard', async (req, res) => {
  try {
    const leaderboard = await gameManager.getLeaderboard();
    res.json(leaderboard);
  } catch (err) {
    console.error('Leaderboard API error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

app.get('/stats', (req, res) => {
  res.json(gameManager.getGameStats());
});

app.get('/history/:username', async (req, res) => {
  try {
    const history = await gameManager.getGameHistory(req.params.username);
    res.json(history);
  } catch (err) {
    console.error('Game history API error:', err);
    res.status(500).json({ error: 'Failed to fetch game history' });
  }
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
console.log(`Server running on port ${PORT}`);
});

const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
  gameManager.handleConnection(ws);
});

gameManager.setupHeartbeat(wss);