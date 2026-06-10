# SE Playground

**Halil Aybar** — *APIs, customers, and the chaos in between.*

🚀 **[Live Demo](https://integration-demo.vercel.app)** · [Resume](https://integration-demo.vercel.app/resume)

Search for an artist, then head to the SE Simulator and try to debug a broken webhook. It's a real API and a real AI — not a mockup.

---

## What's in it

| Section | What it does |
|---------|-------------|
| 🔍 **Live API Explorer** | Real Spotify API search — results as cards + raw JSON toggle |
| 🤖 **SE Scenario Simulator** | AI roleplay: debug a broken webhook with a fictional enterprise customer |
| 📊 **Integration Health Dashboard** | Mock monitoring — KPIs, charts, event log, incident simulation |

---

## ✨ Features

### 🔍 Live API Explorer
Hits the real Spotify API. Search any artist or track, get results as cards, toggle the raw JSON if you want to see what's actually coming back.

### 🤖 SE Scenario Simulator
You're the SE. Chat with "Melodia Inc." — a fictional customer whose Spotify webhooks stopped working. The AI plays the customer and drops clues as you ask the right questions. See if you can find the root cause.

### 📊 Integration Health Dashboard
Uptime, latency, error rate, a Chart.js webhook timeline, and a live event log. Hit **Trigger Incident** to simulate a 500 spike and watch the dashboard react.

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript
- **Backend:** Node.js + Express (proxy server to protect API credentials)
- **APIs:** Spotify Web API (Client Credentials flow), OpenAI GPT-4o-mini
- **Visualizations:** Chart.js
- **Auth:** OAuth 2.0 Client Credentials, server-side secret management
- **Deployed:** Vercel

---

## 🚀 Running Locally

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
```bash
cp .env.example .env
```

Open `.env` and fill in your credentials:

```env
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
OPENAI_API_KEY=your_openai_api_key
PORT=3000
```

**Get credentials:**
- Spotify: [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
- OpenAI: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### 3. Start the server
```bash
npm start
```

Open `http://localhost:3000`

---

## 📁 Project Structure

```
se-playground/
├── server.js           # Express proxy — keeps API secrets off the frontend
├── public/
│   ├── index.html      # Single-page layout
│   ├── styles.css      # Spotify-inspired dark UI
│   ├── app.js          # Frontend logic — API calls, chat loop, dashboard
│   └── resume.html     # Resume page
├── .env.example        # Credential template
├── vercel.json         # Vercel deployment config
└── package.json
```

---

## 👨‍💻 About

**Halil Aybar** — Full-stack engineer and current Operations Manager at Starbucks (7 years, still there). Looking for SE / Forward Deployed Engineer roles.

- Built and shipped full-stack apps in React + Node.js
- Currently managing a 15+ person team doing $38K/week — still writing code on the side
- Equally comfortable in a technical deep-dive and a customer call

[linkedin.com/in/halilaybarr](https://linkedin.com/in/halilaybarr) · halilaybar0@gmail.com


