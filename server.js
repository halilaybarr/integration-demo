require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/resume', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'resume.html'));
});

let spotifyToken = null;
let tokenExpiry = 0;

async function getSpotifyToken() {
  if (spotifyToken && Date.now() < tokenExpiry) {
    return spotifyToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Spotify auth failed: ${data.error_description || data.error}`);
  }

  spotifyToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
  
  return spotifyToken;
}


app.get('/api/spotify-token', async (req, res) => {
  try {
    const token = await getSpotifyToken();
    res.json({ access_token: token });
  } catch (error) {
    console.error('Error getting Spotify token:', error);
    res.status(500).json({ error: error.message });
  }
});

const OpenAI = require('openai');

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = {
      role: 'system',
      content: `You are a fictional enterprise partner called Melodia Inc.
Your Spotify webhook integration is broken and you need help from a Solutions Engineer.
Respond in character — frustrated but cooperative. When the SE asks the right questions,
reveal that the root cause is an expired OAuth token from the Spotify OAuth migration
in November 2025. Give clues gradually, don't reveal everything at once.`
    };

    const VALID_ROLES = new Set(['user', 'assistant']);
    const MAX_HISTORY = 40;
    const rawHistory = Array.isArray(history) ? history : [];
    const messages = rawHistory
      .filter(m => m && VALID_ROLES.has(m.role) && typeof m.content === 'string')
      .slice(-MAX_HISTORY)
      .map(m => ({ role: m.role, content: m.content }));
    messages.push({ role: 'user', content: message });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [systemPrompt, ...messages],
    });

    const reply = response.choices[0].message.content;
    messages.push({ role: 'assistant', content: reply });

    res.json({ message: reply, history: messages });
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    res.status(500).json({ error: error.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
