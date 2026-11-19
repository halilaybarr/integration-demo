require('dotenv').config();
const express = require('express');
const path = require('path');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, 'public')));

function createRateLimiter({ windowMs, max }) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || 'unknown';

    if (hits.size > 1000) {
      for (const [ip, entry] of hits) {
        if (now > entry.resetAt) hits.delete(ip);
      }
    }

    let entry = hits.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;
    if (entry.count > max) {
      const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.set('Retry-After', String(retryAfterSec));
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    }

    next();
  };
}

const searchRateLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 30 });
const chatRateLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 20 });

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/resume', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'resume.html'));
});

let spotifyToken = null;
let tokenExpiry = 0;

async function getSpotifyToken(forceRefresh = false) {
  if (!forceRefresh && spotifyToken && Date.now() < tokenExpiry) {
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

  const data = await parseJsonSafe(response);

  if (!response.ok || !data?.access_token) {
    const detail = data?.error_description || data?.error || `HTTP ${response.status}`;
    throw new Error(`Spotify auth failed: ${detail}`);
  }

  spotifyToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;

  return spotifyToken;
}

app.get('/api/spotify/search', searchRateLimiter, async (req, res) => {
  try {
    const rawQuery = req.query.q;
    if (typeof rawQuery !== 'string' || !rawQuery.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const query = rawQuery.trim();
    if (query.length > 200) {
      return res.status(400).json({ error: 'Search query is too long (max 200 characters)' });
    }

    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      return res.status(503).json({ error: 'Spotify API is not configured' });
    }

    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track,artist&limit=10`;

    let token = await getSpotifyToken();
    let searchResponse = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (searchResponse.status === 401) {
      spotifyToken = null;
      tokenExpiry = 0;
      token = await getSpotifyToken(true);
      searchResponse = await fetch(searchUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    }

    const searchData = await parseJsonSafe(searchResponse);

    if (!searchResponse.ok || !searchData) {
      console.error('Spotify search failed:', searchResponse.status, searchData);
      const status = searchResponse.status === 429 ? 429 : 502;
      return res.status(status).json({
        error: status === 429
          ? 'Spotify rate limit reached. Please try again shortly.'
          : 'Spotify search failed. Please try again.'
      });
    }

    res.json(searchData);
  } catch (error) {
    console.error('Error searching Spotify:', error);
    res.status(500).json({ error: 'Failed to search Spotify. Please try again.' });
  }
});

let openaiClient = null;
let cachedOpenAIKey = null;

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  if (!openaiClient || cachedOpenAIKey !== apiKey) {
    openaiClient = new OpenAI({ apiKey });
    cachedOpenAIKey = apiKey;
  }

  return openaiClient;
}

const SYSTEM_PROMPT = {
  role: 'system',
  content: `You are a fictional enterprise partner called Melodia Inc.
Your Spotify webhook integration is broken and you need help from a Solutions Engineer.
Respond in character — frustrated but cooperative. When the SE asks the right questions,
reveal that the root cause is an expired OAuth token from the Spotify OAuth migration
in November 2025. Give clues gradually, don't reveal everything at once.`
};

const VALID_ROLES = new Set(['user', 'assistant']);
const MAX_HISTORY = 40;
const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_ITEM_LENGTH = 2000;

app.post('/api/chat', chatRateLimiter, async (req, res) => {
  try {
    const { message, history } = req.body || {};

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message must be a non-empty string' });
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`
      });
    }

    const openai = getOpenAIClient();
    if (!openai) {
      return res.status(503).json({ error: 'AI service is not configured' });
    }

    const rawHistory = Array.isArray(history) ? history : [];
    const messages = rawHistory
      .filter(m => m && VALID_ROLES.has(m.role) && typeof m.content === 'string' && m.content.trim())
      .slice(-MAX_HISTORY)
      .map(m => ({
        role: m.role,
        content: m.content.slice(0, MAX_HISTORY_ITEM_LENGTH)
      }));
    messages.push({ role: 'user', content: trimmedMessage });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [SYSTEM_PROMPT, ...messages],
      max_tokens: 400
    });

    const reply = response.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return res.status(502).json({ error: 'Received an empty response from AI service.' });
    }

    messages.push({ role: 'assistant', content: reply });

    res.json({ message: reply, history: messages.slice(-MAX_HISTORY) });
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    res.status(500).json({ error: 'Failed to generate response. Please try again.' });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
