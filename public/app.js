const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const resultsContainer = document.getElementById('results-container');
const jsonContainer = document.getElementById('json-container');
const toggleJsonBtn = document.getElementById('toggle-json');

let isJsonVisible = false;
let isSearching = false;

searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') performSearch();
});

toggleJsonBtn.addEventListener('click', () => {
    isJsonVisible = !isJsonVisible;
    jsonContainer.classList.toggle('hidden', !isJsonVisible);
    toggleJsonBtn.textContent = isJsonVisible ? 'Hide JSON' : 'Show JSON';
});

async function readJsonResponse(response) {
    const text = await response.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function setResultsMessage(message) {
    resultsContainer.replaceChildren();
    const p = document.createElement('p');
    p.className = 'empty-state';
    p.textContent = message;
    resultsContainer.appendChild(p);
}

function createResultCard({ imageUrl, fallbackIcon, name, subtitle, typeLabel }) {
    const card = document.createElement('div');
    card.className = 'result-card';

    if (imageUrl) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = name;
        img.loading = 'lazy';
        img.className = 'result-image';
        card.appendChild(img);
    } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'result-image result-image-placeholder';
        placeholder.setAttribute('aria-hidden', 'true');
        placeholder.textContent = fallbackIcon;
        card.appendChild(placeholder);
    }

    const info = document.createElement('div');
    info.className = 'result-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'result-name';
    nameEl.textContent = name;

    const artistEl = document.createElement('div');
    artistEl.className = 'result-artist';
    artistEl.textContent = subtitle;

    const typeEl = document.createElement('div');
    typeEl.className = 'result-type';
    typeEl.textContent = typeLabel;

    info.append(nameEl, artistEl, typeEl);
    card.appendChild(info);

    return card;
}

async function performSearch() {
    if (isSearching) return;

    const query = searchInput.value.trim();

    if (!query) {
        setResultsMessage('Please enter a search query');
        return;
    }

    isSearching = true;
    searchBtn.disabled = true;
    searchInput.disabled = true;
    searchBtn.textContent = 'Searching...';
    setResultsMessage('Loading...');

    try {
        const searchResponse = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
        const searchData = await readJsonResponse(searchResponse);

        if (!searchResponse.ok) {
            throw new Error(searchData?.error || 'Search failed');
        }

        displayResults(searchData);
        displayJSON(searchData);

    } catch (error) {
        console.error('Search error:', error);
        setResultsMessage(`Error: ${error.message}`);
    } finally {
        isSearching = false;
        searchBtn.disabled = false;
        searchInput.disabled = false;
        searchBtn.textContent = 'Search';
    }
}

function displayResults(data) {
    const tracks = data?.tracks?.items || [];
    const artists = data?.artists?.items || [];

    if (tracks.length === 0 && artists.length === 0) {
        setResultsMessage('No results found');
        return;
    }

    const fragment = document.createDocumentFragment();

    tracks.forEach(track => {
        const imageUrl = track.album?.images?.[0]?.url || '';
        const artistNames = (track.artists || []).map(a => a.name).join(', ');

        fragment.appendChild(createResultCard({
            imageUrl,
            fallbackIcon: '🎵',
            name: track.name || 'Untitled Track',
            subtitle: artistNames || 'Unknown Artist',
            typeLabel: '🎵 Track'
        }));
    });

    artists.forEach(artist => {
        const imageUrl = artist.images?.[0]?.url || '';
        const followers = artist.followers?.total?.toLocaleString() || '0';

        fragment.appendChild(createResultCard({
            imageUrl,
            fallbackIcon: '👤',
            name: artist.name || 'Unknown Artist',
            subtitle: `${followers} followers`,
            typeLabel: '👤 Artist'
        }));
    });

    resultsContainer.replaceChildren(fragment);
}

function displayJSON(data) {
    jsonContainer.textContent = JSON.stringify(data, null, 2);
}

const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

const initialGreeting = chatMessages.querySelector('.assistant-message .message-content')?.textContent?.trim();
let chatHistory = initialGreeting
    ? [{ role: 'assistant', content: initialGreeting }]
    : [];
let isSending = false;

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
    if (isSending) return;

    const message = chatInput.value.trim();

    if (!message) return;

    isSending = true;
    addMessageToChat('user', message);
    chatInput.value = '';
    sendBtn.disabled = true;
    chatInput.disabled = true;

    const typingBubble = addTypingIndicator();

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

        const data = await readJsonResponse(response);

        if (!response.ok) {
            throw new Error(data?.error || 'Chat request failed');
        }

        chatHistory = data.history || chatHistory;
        typingBubble.remove();
        addMessageToChat('assistant', data.message);

    } catch (error) {
        console.error('Chat error:', error);
        typingBubble.remove();
        addMessageToChat('assistant', `Sorry, I encountered an error: ${error.message}`);
    } finally {
        isSending = false;
        sendBtn.disabled = false;
        chatInput.disabled = false;
        chatInput.focus();
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
    return messageDiv;
}

function addTypingIndicator() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant-message typing-indicator';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = 'Melodia Inc. is typing...';

    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return messageDiv;
}

const uptimeValue = document.getElementById('uptime-value');
const uptimeStatus = document.getElementById('uptime-status');
const latencyValue = document.getElementById('latency-value');
const latencyStatus = document.getElementById('latency-status');
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

const healthyWebhookData = [245, 289, 312, 278, 295, 321, 298];
const incidentWebhookData = [245, 289, 312, 278, 295, 321, 74];

const ctx = document.getElementById('webhook-chart').getContext('2d');
const webhookChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: chartLabels,
        datasets: [{
            label: 'Webhook Events',
            data: [...healthyWebhookData],
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

function setKpiState(valueEl, statusEl, valueText, statusText, statusClass) {
    valueEl.textContent = valueText;
    statusEl.textContent = statusText;
    statusEl.className = `kpi-status ${statusClass}`;
}

function createEventRow({ timestamp, event, statusCode, isError, responseTime, rowClass }) {
    const tr = document.createElement('tr');
    if (rowClass) tr.className = rowClass;

    const tsCell = document.createElement('td');
    tsCell.textContent = timestamp;

    const eventCell = document.createElement('td');
    eventCell.textContent = event;

    const statusCell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `status-badge ${isError ? 'status-error' : 'status-success'}`;
    badge.textContent = statusCode;
    statusCell.appendChild(badge);

    const msCell = document.createElement('td');
    msCell.textContent = responseTime;

    tr.append(tsCell, eventCell, statusCell, msCell);
    return tr;
}

triggerIncidentBtn.addEventListener('click', () => {
    const dataset = webhookChart.data.datasets[0];

    if (incidentTriggered) {
        setKpiState(uptimeValue, uptimeStatus, '99.8%', 'Healthy', 'status-good');
        setKpiState(latencyValue, latencyStatus, '142ms', 'Optimal', 'status-good');
        setKpiState(errorRateValue, errorStatus, '0.3%', 'Healthy', 'status-good');

        dataset.data = [...healthyWebhookData];
        dataset.borderColor = '#1DB954';
        dataset.backgroundColor = 'rgba(29, 185, 84, 0.1)';
        dataset.pointBackgroundColor = '#1DB954';
        webhookChart.update();

        triggerIncidentBtn.textContent = 'Trigger Incident';
        triggerIncidentBtn.classList.remove('btn-secondary');
        triggerIncidentBtn.classList.add('btn-danger');

        const errorRow = document.querySelector('.error-row');
        if (errorRow) errorRow.remove();

        incidentTriggered = false;
    } else {
        setKpiState(uptimeValue, uptimeStatus, '96.4%', 'Degraded', 'status-warn');
        setKpiState(latencyValue, latencyStatus, '1,240ms', 'Elevated', 'status-warn');
        setKpiState(errorRateValue, errorStatus, '8.7%', 'Critical', 'status-bad');

        dataset.data = [...incidentWebhookData];
        dataset.borderColor = '#E22134';
        dataset.backgroundColor = 'rgba(226, 33, 52, 0.12)';
        dataset.pointBackgroundColor = '#E22134';
        webhookChart.update();

        triggerIncidentBtn.textContent = 'Reset Dashboard';
        triggerIncidentBtn.classList.remove('btn-danger');
        triggerIncidentBtn.classList.add('btn-secondary');

        const errorRow = createEventRow({
            timestamp: formatTs(0),
            event: 'webhook.delivery_failed',
            statusCode: '500',
            isError: true,
            responseTime: '—',
            rowClass: 'error-row'
        });
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
    eventLogBody.appendChild(createEventRow({
        timestamp: formatTs(minsAgo),
        event,
        statusCode: '200',
        isError: false,
        responseTime: ms
    }));
});
