const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const resultsContainer = document.getElementById('results-container');
const jsonContainer = document.getElementById('json-container');
const toggleJsonBtn = document.getElementById('toggle-json');

let isJsonVisible = false;
let lastSearchResults = null;

searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
});

toggleJsonBtn.addEventListener('click', () => {
    isJsonVisible = !isJsonVisible;
    jsonContainer.classList.toggle('hidden', !isJsonVisible);
    toggleJsonBtn.textContent = isJsonVisible ? 'Hide JSON' : 'Show JSON';
});

async function performSearch() {
    const query = searchInput.value.trim();
    
    if (!query) {
        resultsContainer.innerHTML = '<p class="empty-state">Please enter a search query</p>';
        return;
    }

    searchBtn.disabled = true;
    searchBtn.textContent = 'Searching...';
    resultsContainer.innerHTML = '<p class="empty-state">Loading...</p>';

    try {
        const tokenResponse = await fetch('/api/spotify-token');
        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            throw new Error(tokenData.error || 'Failed to get Spotify token');
        }

        const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track,artist&limit=10`;
        const searchResponse = await fetch(searchUrl, {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`
            }
        });

        const searchData = await searchResponse.json();

        if (!searchResponse.ok) {
            throw new Error(searchData.error?.message || 'Search failed');
        }

        lastSearchResults = searchData;
        displayResults(searchData);
        displayJSON(searchData);

    } catch (error) {
        console.error('Search error:', error);
        resultsContainer.innerHTML = `<p class="empty-state">Error: ${error.message}</p>`;
    } finally {
        searchBtn.disabled = false;
        searchBtn.textContent = 'Search';
    }
}

function displayResults(data) {
    const tracks = data.tracks?.items || [];
    const artists = data.artists?.items || [];
    
    if (tracks.length === 0 && artists.length === 0) {
        resultsContainer.innerHTML = '<p class="empty-state">No results found</p>';
        return;
    }

    let html = '';

    tracks.forEach(track => {
        const imageUrl = track.album.images[0]?.url || '';
        const artistNames = track.artists.map(a => a.name).join(', ');
        
        html += `
            <div class="result-card">
                <img src="${imageUrl}" alt="${track.name}" class="result-image">
                <div class="result-info">
                    <div class="result-name">${track.name}</div>
                    <div class="result-artist">${artistNames}</div>
                    <div class="result-type">🎵 Track</div>
                </div>
            </div>
        `;
    });

    artists.forEach(artist => {
        const imageUrl = artist.images[0]?.url || '';
        
        html += `
            <div class="result-card">
                <img src="${imageUrl}" alt="${artist.name}" class="result-image">
                <div class="result-info">
                    <div class="result-name">${artist.name}</div>
                    <div class="result-artist">${artist.followers?.total?.toLocaleString() || 0} followers</div>
                    <div class="result-type">👤 Artist</div>
                </div>
            </div>
        `;
    });

    resultsContainer.innerHTML = html;
}

function displayJSON(data) {
    jsonContainer.textContent = JSON.stringify(data, null, 2);
}

const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

let chatHistory = [];

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
    const message = chatInput.value.trim();
    
    if (!message) return;

    addMessageToChat('user', message);
    chatInput.value = '';
    sendBtn.disabled = true;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                history: chatHistory
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Chat request failed');
        }

        chatHistory = data.history || chatHistory;
        addMessageToChat('assistant', data.message);

    } catch (error) {
        console.error('Chat error:', error);
        addMessageToChat('assistant', `Sorry, I encountered an error: ${error.message}`);
    } finally {
        sendBtn.disabled = false;
    }
}

function addMessageToChat(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

const uptimeValue = document.getElementById('uptime-value');
const latencyValue = document.getElementById('latency-value');
const errorRateValue = document.getElementById('error-rate-value');
const errorStatus = document.getElementById('error-status');
const triggerIncidentBtn = document.getElementById('trigger-incident-btn');
const eventLogBody = document.getElementById('event-log-body');

let incidentTriggered = false;

const today = new Date();
const chartLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
});

const mockWebhookData = {
    labels: chartLabels,
    data: [245, 289, 312, 278, 295, 321, 298]
};

const ctx = document.getElementById('webhook-chart').getContext('2d');
const webhookChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: mockWebhookData.labels,
        datasets: [{
            label: 'Webhook Events',
            data: mockWebhookData.data,
            borderColor: '#1DB954',
            backgroundColor: 'rgba(29, 185, 84, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#1DB954',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: '#333'
                },
                ticks: {
                    color: '#B3B3B3'
                }
            },
            x: {
                grid: {
                    color: '#333'
                },
                ticks: {
                    color: '#B3B3B3'
                }
            }
        }
    }
});

triggerIncidentBtn.addEventListener('click', () => {
    if (incidentTriggered) {
        errorRateValue.textContent = '0.3%';
        errorStatus.textContent = 'Healthy';
        errorStatus.classList.remove('status-bad');
        errorStatus.classList.add('status-good');
        triggerIncidentBtn.textContent = 'Trigger Incident';
        triggerIncidentBtn.classList.remove('btn-secondary');
        triggerIncidentBtn.classList.add('btn-danger');
        
        const errorRow = document.querySelector('.error-row');
        if (errorRow) errorRow.remove();
        
        incidentTriggered = false;
    } else {
        errorRateValue.textContent = '8.7%';
        errorStatus.textContent = 'Critical';
        errorStatus.classList.remove('status-good');
        errorStatus.classList.add('status-bad');
        triggerIncidentBtn.textContent = 'Reset Dashboard';
        triggerIncidentBtn.classList.remove('btn-danger');
        triggerIncidentBtn.classList.add('btn-secondary');
        
        const errorRow = document.createElement('tr');
        errorRow.className = 'error-row';
        errorRow.innerHTML = `
            <td>${formatTs(0)}</td>
            <td>webhook.delivery_failed</td>
            <td><span class="status-badge status-error">500</span></td>
            <td>—</td>
        `;
        eventLogBody.insertBefore(errorRow, eventLogBody.firstChild);
        
        incidentTriggered = true;
    }
});

function formatTs(minutesAgo) {
    const d = new Date(Date.now() - minutesAgo * 60000);
    return d.toISOString().replace('T', ' ').slice(0, 19);
}

const seedEvents = [
    { event: 'playlist.updated', ms: '138ms', minsAgo: 4 },
    { event: 'track.saved',      ms: '145ms', minsAgo: 9 },
    { event: 'user.followed',    ms: '152ms', minsAgo: 16 },
];

seedEvents.forEach(({ event, ms, minsAgo }) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${formatTs(minsAgo)}</td>
        <td>${event}</td>
        <td><span class="status-badge status-success">200</span></td>
        <td>${ms}</td>
    `;
    eventLogBody.appendChild(tr);
});

window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.3s';
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});
