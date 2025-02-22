const express = require('express');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const app = express();

// Middleware
app.use(express.json());

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to get scoreboard
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

// Endpoint to post a new score
app.post('/api/scores', (req, res) => {
  const { canCount, turns, name } = req.body;
  if (!canCount || !turns || !name) {
    return res.status(400).json({ error: 'Invalid request body' });
  }
  if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 15) {
    return res.status(400).json({ error: 'Invalid name' });
  }

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

    // Ensure the scoreboard has an array for this canCount
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

// Start the server
app.listen(PORT, () => {
  console.log(`Tin Can Shuffle server running on http://localhost:${PORT}`);
});
