# Connect 4 Multiplayer Game

A real-time multiplayer Connect 4 game built with **Node.js**, **Express**, and **WebSockets**.  
Players can join matches against other users or a bot if no opponent is available after a short wait.  

The game includes:
- Leaderboard
- Game history
- Disconnection handling with reconnection support
- Persistent storage using PostgreSQL

---

##  Features

-  **Multiplayer Mode**: Real-time player vs. player matches via WebSockets  
-  **Bot Opponent**: If no human opponent is found within 10 seconds, play against a simple AI bot  
-  **Reconnection**: Players can reconnect to ongoing games within 30 seconds of disconnection  
-  **Leaderboard**: Tracks wins, games played, and win rates for players  
-  **Game History**: View recent games for a specific username  
-  **Stats Endpoint**: Provides current active games and waiting players  
-  **Persistent Storage**: Games and leaderboards saved to PostgreSQL database  

---

##  Technologies Used

- **Backend**: Node.js, Express.js  
- **Real-time Communication**: WebSocket (`ws` library)  
- **Database**: PostgreSQL (`pg` library, works with Neon or any PostgreSQL provider)  
- **Environment Management**: dotenv  
- **Game Logic**: Custom board and bot AI in JavaScript  

---

##  Prerequisites

- [Node.js](https://nodejs.org/) (v16.0.0 or higher)  
- A PostgreSQL database (e.g., [Neon](https://neon.tech/), Heroku Postgres, or local PostgreSQL)  
- [Git](https://git-scm.com/)  

---

##  Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/connect4-game.git
cd connect4-game
````

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory and add your PostgreSQL connection string:

```bash
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
```

* If using **Neon**, sign up at [Neon.tech](https://neon.tech/), create a database, and copy the connection string.
* For local PostgreSQL:

  ```bash
  postgresql://postgres:password@localhost:5432/connect4db
  ```

 Note: The app requires **SSL for Neon**. Adjust based on your provider.

### 4. Database Initialization

The app **automatically initializes** the required tables (`games` and `leaderboard`) on startup via `db.js`.
No manual schema creation needed ✅

---

##  Running the App

### Development Mode (with auto-restart using nodemon):

```bash
npm run dev
```

### Production Mode:

```bash
npm start
```

The server will run on **port 3000** by default (or the port specified in `PORT` environment variable).
Access the game at:
 [http://localhost:3000/](http://localhost:3000/)

---

##  Usage

### Playing the Game

1. Open the app in your browser and enter a username to join.
2. If another player is waiting, you'll be matched immediately.
3. If not, after 10 seconds, you'll play against a bot.
4. Make moves by clicking columns — the game updates in real-time.
5. If disconnected, reconnect within 30 seconds using the same username and game ID.

---

##  API Endpoints

* `GET /leaderboard` → Returns top players (JSON array)
* `GET /stats` → Returns current game stats (active games, waiting players)
* `GET /history/:username` → Returns recent game history for a username

---

##  Client-Side

* The frontend is served from the `/public` directory (including `index.html`, JS, and CSS).
* Client logic handles:

  * WebSocket connections
  * Board rendering
  * User input

---

##  Troubleshooting

* **Database Connection Issues** → Ensure your `DATABASE_URL` is correct and database is accessible
* **WebSocket Errors** → Verify the server is running and accessible; check firewall settings
* **Bot Games** → Leaderboard does **not** update for bot wins/losses
* **Tables not created?** → Check PostgreSQL permissions and connection

