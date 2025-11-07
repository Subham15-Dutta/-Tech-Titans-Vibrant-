import { initSpeech, speak, startListening, getUserInput, showFallbackInput } from './modules/speech-handler.js';
import { classifyIntent, extractLocation, extractPeopleCount, addCustomIntent } from './modules/nlu-engine.js';
import { IncidentLogger } from './modules/incident-logger.js';
import { initMap, addIncidentMarker, geocodeLocation, locateUser } from './modules/map-handler.js';
import { createDialogManager } from './modules/dialog-manager.js';

// App state
const incidentLogger = new IncidentLogger();
let mapInstance = null;

// UI elements
const chatEl = document.getElementById('chat');
const stateIndicator = document.getElementById('stateIndicator');
const incidentFeed = document.getElementById('incidentFeed');
const startCallBtn = document.getElementById('startCallBtn');
const listenBtn = document.getElementById('listenBtn');
const resetBtn = document.getElementById('resetBtn');
const sendTextBtn = document.getElementById('sendTextBtn');
const textInput = document.getElementById('textInput');
const mapMount = document.getElementById('mapEl');
const shortcutsOverlay = document.getElementById('shortcutsOverlay');
const useLocationBtn = document.getElementById('useLocationBtn');
const submitNowBtn = document.getElementById('submitNowBtn');
const mapLocateBtn = document.getElementById('mapLocateBtn');
const currentLocLabel = document.getElementById('currentLocLabel');
const trainPhrase = document.getElementById('trainPhrase');
const trainType = document.getElementById('trainType');
const trainBtn = document.getElementById('trainBtn');
const qaMedical = document.getElementById('qaMedical');
const qaBreakdown = document.getElementById('qaBreakdown');
const qaTheft = document.getElementById('qaTheft');

// Cursor effect
const cursor = document.querySelector('.custom-cursor');
const trail = document.querySelector('.cursor-trail');
window.addEventListener('mousemove', (e) => {
  cursor.style.transform = `translate(${e.clientX - 10}px, ${e.clientY - 10}px)`;
  trail.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 4}px)`;
});
document.querySelectorAll('button, a, input, select').forEach(el => {
  el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
  el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
});

// Chat rendering
function displayUserMessage(text) {
  const div = document.createElement('div');
  div.className = 'user-message';
  div.textContent = text;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}
function displayAIMessage(text) {
  const div = document.createElement('div');
  div.className = 'ai-message';
  div.textContent = text;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function clearChat() {
  chatEl.innerHTML = '';
}

// Stats and feed
function refreshStats() {
  const total = incidentLogger.incidents.length;
  document.getElementById('statTotal').textContent = total;
  const active = incidentLogger.incidents.filter(i => i.status !== 'Resolved').length;
  document.getElementById('statActive').textContent = active;
  document.getElementById('statAvg').textContent = total ? '~12m' : '—';
}
function pushFeed(incident) {
  const row = document.createElement('div');
  row.className = 'feed-item';
  row.innerHTML = `<span>${incident.incident_id} • ${incident.type}</span><span>${incident.location}</span>`;
  incidentFeed.prepend(row);
}

// Dashboard table
const tableBody = document.querySelector('#incidentTable tbody');
function renderTable() {
  const type = document.getElementById('filterType').value;
  const status = document.getElementById('filterStatus').value;
  const q = document.getElementById('searchBox').value.toLowerCase().trim();
  tableBody.innerHTML = '';
  const filtered = incidentLogger.incidents.filter(i => {
    if (type && i.type !== type) return false;
    if (status && i.status !== status) return false;
    if (q) {
      const hay = `${i.incident_id || ''} ${i.location || ''} ${i.type || ''} ${i.sub_service || ''} ${i.caller_id || ''} ${i.status || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  for (const i of filtered) {
    const tr = document.createElement('tr');
    const badgeClass = `status-${i.status.toLowerCase().replace(' ', '\\ ')}`;
    tr.innerHTML = `
      <td>${i.incident_id}</td>
      <td>${i.type}</td>
      <td>${i.sub_service || 'N/A'}</td>
      <td>${i.location}</td>
      <td>${i.people_count}</td>
      <td>${new Date(i.timestamp).toLocaleString()}</td>
      <td><span class="status-badge ${badgeClass}">${i.status}</span></td>
      <td>
        <button data-id="${i.incident_id}" data-action="details" class="btn-secondary">Details</button>
        <button data-id="${i.incident_id}" data-action="assign" class="btn-secondary">Assign</button>
        <button data-id="${i.incident_id}" data-action="progress" class="btn-secondary">In Progress</button>
        <button data-id="${i.incident_id}" data-action="resolve" class="btn-secondary">Resolve</button>
      </td>`;
    tableBody.appendChild(tr);
  }
}
document.getElementById('filterType').addEventListener('change', renderTable);
document.getElementById('filterStatus').addEventListener('change', renderTable);
document.getElementById('searchBox').addEventListener('input', renderTable);
document.querySelector('.incident-table').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.getAttribute('data-id');
  const action = btn.getAttribute('data-action');
  if (action === 'details') {
    const i = incidentLogger.incidents.find(x => x.incident_id === id);
    if (!i) return;
    alert(`Incident ${i.incident_id}\nType: ${i.type}${i.sub_service ? ` (${i.sub_service})` : ''}\nCaller: ${i.caller_id}\nLocation: ${i.location}\nPeople: ${i.people_count}\nStatus: ${i.status}\nCoords: ${i.coordinates ? `${i.coordinates.lat}, ${i.coordinates.lng}` : '—'}`);
    return;
  }
  const status = action === 'assign' ? 'Assigned' : action === 'progress' ? 'In Progress' : 'Resolved';
  incidentLogger.updateStatus(id, status);
  renderTable();
  refreshStats();
});

// Map init (lazy)
let mapReady = false;
function ensureMap() {
  if (!mapReady) {
    mapInstance = initMap('mapEl');
    mapReady = true;
  }
}

// Dialog manager
const dialog = createDialogManager({
  speak: (t) => speak(t, displayAIMessage),
  displayAIMessage,
  displayUserMessage,
  classifyIntent,
  extractLocation,
  extractPeopleCount,
  geocodeLocation,
  onStateChange: (s) => { stateIndicator.textContent = s; },
  onIncident: (incident) => {
    pushFeed(incident);
    refreshStats();
    renderTable();
    if (incident.coordinates) {
      ensureMap();
      addIncidentMarker(mapInstance, incident);
    }
  },
  incidentLogger
});

// Event bindings
startCallBtn.addEventListener('click', () => { clearChat(); dialog.start(); });
listenBtn.addEventListener('click', () => startListening(displayUserMessage, dialog.onTranscript));
resetBtn.addEventListener('click', () => dialog.reset());
sendTextBtn.addEventListener('click', () => {
  const v = textInput.value.trim();
  if (!v) return;
  displayUserMessage(v);
  dialog.onTranscript(v, true);
  textInput.value='';
});
textInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendTextBtn.click(); });

// Shortcuts
const shortcuts = {
  '1': () => dialog.quickType('medical'),
  '2': () => dialog.quickType('breakdown'),
  '3': () => dialog.quickType('theft'),
  's': () => startListening(displayUserMessage, dialog.onTranscript),
  'r': () => dialog.reset(),
  'e': () => incidentLogger.exportAll(),
  '?': () => shortcutsOverlay.classList.toggle('hidden')
};
document.addEventListener('keydown', (e) => {
  const t = e.target;
  const isEditable = (t && (t.matches?.('input, textarea, select') || t.isContentEditable));
  if (isEditable) {
    if (e.key === 'Enter') { sendTextBtn.click(); }
    return;
  }
  if (e.code === 'Space') { e.preventDefault(); startListening(displayUserMessage, dialog.onTranscript); return; }
  if (shortcuts[e.key]) { e.preventDefault(); shortcuts[e.key](); }
});
document.getElementById('exportAllBtn').addEventListener('click', () => incidentLogger.exportAll());

// Geolocation wiring
let currentCoords = null;
function updateLocLabel() { currentLocLabel.textContent = `Location: ${currentCoords ? `${currentCoords.lat.toFixed(4)}, ${currentCoords.lng.toFixed(4)}` : '—'}`; }
useLocationBtn.addEventListener('click', () => {
  ensureMap();
  locateUser(mapInstance, async (coords) => { currentCoords = coords; updateLocLabel(); await dialog.setLocationFromGeo(coords); }, (msg) => displayAIMessage(`Location error: ${msg}`));
});
mapLocateBtn.addEventListener('click', () => {
  ensureMap();
  locateUser(mapInstance, (coords) => { currentCoords = coords; updateLocLabel(); }, (msg) => displayAIMessage(`Location error: ${msg}`));
});

// NLU training wiring
trainBtn?.addEventListener('click', () => {
  const phrase = trainPhrase.value.trim();
  const type = trainType.value;
  if (!phrase) return;
  addCustomIntent(phrase, type);
  displayAIMessage(`Trained: "${phrase}" → ${type}`);
  trainPhrase.value = '';
});

// Quick actions
function ensureStartedThen(text) {
  const feed = () => dialog.onTranscript(text, true);
  if (!dialog.state || dialog.state === 'GREET' || dialog.state === 'COMPLETE') {
    clearChat();
    dialog.start().then(() => setTimeout(feed, 150));
  } else {
    feed();
  }
}

qaMedical?.addEventListener('click', () => ensureStartedThen('medical'));
qaBreakdown?.addEventListener('click', () => ensureStartedThen('breakdown'));
qaTheft?.addEventListener('click', () => ensureStartedThen('theft'));
document.querySelectorAll('.highway-shortcuts [data-hwy]')?.forEach(btn => {
  btn.addEventListener('click', () => {
    const h = btn.getAttribute('data-hwy');
    // Phrase to trigger location extractor reliably
    ensureStartedThen(`on ${h}`);
  });
});

// Submit now
submitNowBtn?.addEventListener('click', () => dialog.submitNow());

// Initialize speech and preload
initSpeech(displayAIMessage, displayUserMessage, showFallbackInput);
refreshStats();
renderTable();
textInput?.focus();

// Theme toggle
const themeToggle = document.getElementById('themeToggle');
const THEME_KEY = 'roadresq_theme';
function applyTheme(t){ document.documentElement.setAttribute('data-theme', t); localStorage.setItem(THEME_KEY, t); }
const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
applyTheme(savedTheme);
themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
});


