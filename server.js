const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const app = express();

// Simple in-memory store for game tokens
// In production, you'd use Redis or another distributed cache
const gameTokens = {};

// Middleware
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Generate a new game token
app.post('/api/start-game', (req, res) => {
  const { canCount } = req.body;
  
  if (!canCount || canCount < 5 || canCount > 8) {
    return res.status(400).json({ error: 'Invalid can count' });
  }
  
  // Generate a random token for this game session
  const token = crypto.randomBytes(16).toString('hex');
  
  // Store token with game settings and timestamp
  gameTokens[token] = {
    canCount: parseInt(canCount, 10),
    startTime: Date.now(),
    solution: null // We don't need to know the actual solution
  };
  
  // Clean up old tokens (older than 1 hour)
  const oneHourAgo = Date.now() - 3600000;
  Object.keys(gameTokens).forEach(key => {
    if (gameTokens[key].startTime < oneHourAgo) {
      delete gameTokens[key];
    }
  });
  
  return res.json({ token });
});

// Get scoreboard
app.get('/api/scores', (req, res) => {
  const scoreboardPath = path.join(__dirname, 'scoreboard.json');
  fs.readFile(scoreboardPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading scoreboard file:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    try {
      const scoreboard = JSON.parse(data);
      res.json(scoreboard);
    } catch (parseErr) {
      console.error('Error parsing scoreboard file:', parseErr);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// Post a new score
app.post('/api/scores', (req, res) => {
  const { canCount, turns, name, token, gameTime } = req.body;
  
  // Validate basic parameters
  if (!canCount || !turns || !name || !token || !gameTime) {
    return res.status(400).json({ error: 'Invalid request body' });
  }
  if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 15) {
    return res.status(400).json({ error: 'Invalid name' });
  }
  
  // Verify the game token exists
  if (!gameTokens[token]) {
    return res.status(403).json({ error: 'Invalid game token' });
  }
  
  // Verify the game configuration matches
  const gameData = gameTokens[token];
  if (gameData.canCount !== parseInt(canCount, 10)) {
    return res.status(403).json({ error: 'Game configuration mismatch' });
  }
  
  // Verify the game duration is reasonable
  const elapsedTime = Date.now() - gameData.startTime;
  const reportedTime = parseInt(gameTime, 10);
  
  // Check if the game time is reasonable (minimum 3 seconds per turn)
  // This helps catch unrealistic times but doesn't reject legitimate fast players
  const minExpectedTime = Math.max(3000, turns * 3000); // Minimum 3 seconds per turn
  if (reportedTime < minExpectedTime || reportedTime > elapsedTime + 5000) {
    console.warn(`Suspicious score detected: ${name}, ${turns} turns, time reported: ${reportedTime}ms, actual elapsed: ${elapsedTime}ms`);
    // We could reject it here, but for casual games allowing it with a warning is often better
    // return res.status(403).json({ error: 'Suspicious game timing' });
  }
  
  // Delete the token after use to prevent replay attacks
  delete gameTokens[token];
  
  // Save the score
  const scoreboardPath = path.join(__dirname, 'scoreboard.json');
  fs.readFile(scoreboardPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading scoreboard file:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    let scoreboard;
    try {
      scoreboard = JSON.parse(data);
    } catch (parseErr) {
      console.error('Error parsing scoreboard file:', parseErr);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!scoreboard[canCount]) {
      scoreboard[canCount] = [];
    }
    scoreboard[canCount].push({ name: name.trim(), turns });

    fs.writeFile(scoreboardPath, JSON.stringify(scoreboard, null, 2), (writeErr) => {
      if (writeErr) {
        console.error('Error writing scoreboard file:', writeErr);
        return res.status(500).json({ error: 'Internal server error' });
      }
      return res.json({ message: 'Score saved successfully' });
    });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Clash of Cans server running on http://localhost:${PORT}`);
});
