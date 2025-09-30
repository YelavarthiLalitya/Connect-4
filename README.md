Connect 4 Multiplayer Game
A real-time multiplayer Connect 4 game built with Node.js, Express, and WebSockets. Players can join matches against other users or a bot if no opponent is available after a short wait. The game includes features like a leaderboard, game history, disconnection handling with reconnection support, and persistent storage using PostgreSQL.
Features

Multiplayer Mode: Real-time player vs. player matches via WebSockets.
Bot Opponent: If no human opponent is found within 10 seconds, play against a simple AI bot.
Reconnection: Players can reconnect to ongoing games within 30 seconds of disconnection.
Leaderboard: Tracks wins, games played, and win rates for players.
Game History: View recent games for a specific username.
Stats Endpoint: Provides current active games and waiting players.
Persistent Storage: Games and leaderboards saved to PostgreSQL database.

Technologies Used

Backend: Node.js, Express.js
Real-time Communication: WebSocket (ws library)
Database: PostgreSQL (using pg library; compatible with Neon or any PostgreSQL provider)
Environment Management: dotenv
Game Logic: Custom board and bot AI implementations in JavaScript

Prerequisites

Node.js (v16.0.0 or higher)
A PostgreSQL database (e.g., via Neon, Heroku Postgres, or local PostgreSQL installation)
Git (for cloning the repository)

Setup Instructions

Clone the Repository:
textgit clone https://github.com/your-username/connect4-game.git
cd connect4-game

Install Dependencies:
textnpm install

Set Up Environment Variables:

Create a .env file in the root directory.
Add your PostgreSQL connection string:
textDATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

If using Neon (as in the example), sign up at Neon.tech, create a database, and copy the connection string.
For local PostgreSQL, use something like postgresql://postgres:password@localhost:5432/connect4db.
Note: The app requires SSL for Neon; adjust based on your provider.

Database Initialization:
The app automatically initializes the required tables (games and leaderboard) on startup via db.js. No manual schema creation is needed.

Running the App
Development Mode (with auto-restart using nodemon):
textnpm run dev

Production Mode:
textnpm start

The server will run on port 3000 by default (or the port specified in PORT environment variable). Access the game at http://localhost:3000/ in your browser.
Usage

Playing the Game:
Open the app in a browser and enter a username to join.
If another player is waiting, you'll be matched immediately.
If not, after 10 seconds, you'll play against a bot.
Make moves by clicking columns; the game updates in real-time.
If disconnected, reconnect within 30 seconds using the same username and game ID (provided on start).


API Endpoints:
/leaderboard: GET - Returns top players (JSON array).
/stats: GET - Returns current game stats (active games, waiting players).
/history/:username: GET - Returns recent game history for a username.


Client-Side:
The frontend is served from the /public directory (including index.html and any associated JS/CSS).
Client logic handles WebSocket connections, board rendering, and user input.



Troubleshooting
Database Connection Issues: Ensure your DATABASE_URL is correct and the database is accessible. Check console logs for errors.
WebSocket Errors: Verify the server is running and accessible. Firewalls may block port 3000.
Bot Games: Leaderboard is not updated for bot wins/losses.
If tables aren't created, check PostgreSQL permissions and connection.
