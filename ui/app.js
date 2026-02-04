/**
 * Moltiverse Frontend Application
 */

// =============================================================================
// STATE
// =============================================================================

const state = {
  targets: [],
  selectedTarget: null,
  conversation: [],
  ws: null,
  connected: false
};

// =============================================================================
// API CLIENT
// =============================================================================

const API_BASE = '/api';

const api = {
  async get(path) {
    const res = await fetch(`${API_BASE}${path}`);
    return res.json();
  },

  async post(path, data) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async delete(path) {
    const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE' });
    return res.status === 204 ? {} : res.json();
  }
};

// =============================================================================
// WEBSOCKET
// =============================================================================

function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  state.ws = new WebSocket(`${protocol}//${window.location.host}`);

  state.ws.onopen = () => {
    console.log('WebSocket connected');
    state.connected = true;
  };

  state.ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleWebSocketMessage(data);
  };

  state.ws.onclose = () => {
    console.log('WebSocket disconnected');
    state.connected = false;
    // Reconnect after 3 seconds
    setTimeout(connectWebSocket, 3000);
  };

  state.ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

function handleWebSocketMessage(data) {
  switch (data.type) {
    case 'connected':
      console.log('Connected with client ID:', data.clientId);
      break;

    case 'subscribed':
      console.log('Subscribed to target:', data.targetId);
      if (data.currentState) {
        updateBeliefDisplay(data.currentState);
      }
      break;

    case 'belief_update':
      if (data.targetId === state.selectedTarget?.id) {
        updateBeliefDisplay({
          ...data.beliefs,
          composite: data.composite,
          stage: data.stage
        });
      }
      refreshTargetList();
      break;

    case 'agent_message':
      if (data.targetId === state.selectedTarget?.id) {
        addMessage('agent', data.content, data.agentName);
        updateAgentStatus(data.agentId, true);
        setTimeout(() => updateAgentStatus(data.agentId, false), 2000);
      }
      break;

    case 'user_message':
      // Already handled locally
      break;

    case 'stage_change':
      if (data.targetId === state.selectedTarget?.id) {
        updateStageDisplay(data.to);
        showNotification(`Stage changed: ${data.from} → ${data.to}`);
      }
      break;

    case 'conversion':
      showNotification(`🎉 Conversion: ${data.targetId}!`);
      refreshTargetList();
      break;

    default:
      console.log('Unknown WebSocket message:', data);
  }
}

function subscribeToTarget(targetId) {
  if (state.ws && state.connected) {
    state.ws.send(JSON.stringify({
      type: 'subscribe',
      targetId
    }));
  }
}

// =============================================================================
// UI UPDATES
// =============================================================================

function updateBeliefDisplay(beliefs) {
  const dimensions = ['belief', 'trust', 'emotional', 'social', 'technical', 'financial'];

  for (const dim of dimensions) {
    const value = beliefs[dim] || 0;
    const fill = document.getElementById(`belief-${dim}`);
    const valueEl = document.getElementById(`value-${dim}`);

    if (fill) fill.style.width = `${value}%`;
    if (valueEl) valueEl.textContent = Math.round(value);
  }

  // Update status
  document.getElementById('status-composite').textContent =
    beliefs.composite?.toFixed(1) || '0';
  document.getElementById('status-stage').textContent =
    beliefs.stage || '-';
}

function updateStageDisplay(stage) {
  const stageEl = document.getElementById('target-stage');
  if (stageEl) {
    stageEl.textContent = stage;
    stageEl.className = `target-stage stage-${stage.toLowerCase()}`;
  }
}

function updateAgentStatus(agentId, active) {
  const agentEl = document.querySelector(`[data-agent="${agentId}"] .agent-status`);
  if (agentEl) {
    agentEl.classList.toggle('active', active);
  }
}

function addMessage(role, content, agentName = null) {
  const messagesEl = document.getElementById('messages');
  const emptyState = messagesEl.querySelector('.empty-state');
  if (emptyState) emptyState.remove();

  const messageEl = document.createElement('div');
  messageEl.className = `message ${role}`;

  const header = document.createElement('div');
  header.className = 'message-header';
  header.textContent = role === 'user' ? 'You' : agentName || 'Agent';

  const contentEl = document.createElement('div');
  contentEl.className = 'message-content';
  contentEl.textContent = content;

  messageEl.appendChild(header);
  messageEl.appendChild(contentEl);
  messagesEl.appendChild(messageEl);

  // Scroll to bottom
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function clearMessages() {
  const messagesEl = document.getElementById('messages');
  messagesEl.innerHTML = '<div class="empty-state"><p>Start a conversation...</p></div>';
}

function showNotification(message) {
  // Simple console notification for now
  console.log('Notification:', message);
}

// =============================================================================
// TARGET MANAGEMENT
// =============================================================================

async function loadTargets() {
  try {
    const data = await api.get('/targets');
    state.targets = data.targets || [];
    renderTargetList();
    updateHeaderStats();
  } catch (err) {
    console.error('Failed to load targets:', err);
  }
}

function renderTargetList() {
  const listEl = document.getElementById('target-list');
  listEl.innerHTML = '';

  if (state.targets.length === 0) {
    listEl.innerHTML = '<p style="padding: 16px; color: var(--text-muted);">No targets yet</p>';
    return;
  }

  for (const target of state.targets) {
    const el = document.createElement('div');
    el.className = `target-item ${state.selectedTarget?.id === target.id ? 'active' : ''}`;
    el.innerHTML = `
      <div class="target-avatar">${target.id.charAt(0).toUpperCase()}</div>
      <div class="target-info">
        <strong>${target.id}</strong>
        <span>${target.stage}</span>
      </div>
      <div class="target-score">${target.composite?.toFixed(0) || 0}</div>
    `;
    el.onclick = () => selectTarget(target);
    listEl.appendChild(el);
  }
}

async function selectTarget(target) {
  state.selectedTarget = target;
  state.conversation = [];

  // Update UI
  renderTargetList();
  clearMessages();

  document.getElementById('conversation-header').querySelector('h2').textContent = target.id;
  updateStageDisplay(target.stage);

  // Enable input
  document.getElementById('input-message').disabled = false;
  document.getElementById('btn-send').disabled = false;

  // Subscribe to WebSocket updates
  subscribeToTarget(target.id);

  // Load target details
  try {
    const details = await api.get(`/targets/${target.id}`);
    updateBeliefDisplay(details.beliefState);

    // Load recommendation
    const rec = await api.get(`/targets/${target.id}/recommend`);
    document.getElementById('rec-agent').textContent = rec.agent?.recommended || '-';
    document.getElementById('rec-strategy').textContent = rec.strategy?.name || '-';
    document.getElementById('status-probability').textContent = rec.conversionProbability || '0%';
    document.getElementById('status-archetype').textContent = rec.archetype?.name || '-';

    // Load conversation history
    try {
      const convData = await api.get(`/interactions/conversations/${target.id}`);
      if (convData.messages) {
        for (const msg of convData.messages) {
          addMessage(msg.role, msg.content, msg.agentName);
        }
      }
    } catch (e) {
      // No existing conversation
    }
  } catch (err) {
    console.error('Failed to load target details:', err);
  }
}

async function refreshTargetList() {
  await loadTargets();
}

async function updateHeaderStats() {
  try {
    const summary = await api.get('/analytics/summary');
    document.getElementById('stat-targets').textContent = summary.targets || 0;
    document.getElementById('stat-conversions').textContent = summary.conversions || 0;
    document.getElementById('stat-active').textContent = summary.activeConversations || 0;
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

// =============================================================================
// CONVERSATION
// =============================================================================

async function sendMessage() {
  const input = document.getElementById('input-message');
  const message = input.value.trim();

  if (!message || !state.selectedTarget) return;

  // Clear input
  input.value = '';

  // Add user message to UI immediately
  addMessage('user', message);

  // Send to server
  try {
    const response = await api.post('/interactions/converse', {
      targetId: state.selectedTarget.id,
      message
    });

    // Add agent response
    addMessage('agent', response.content, response.agentName);
    updateAgentStatus(response.agentId, true);
    setTimeout(() => updateAgentStatus(response.agentId, false), 2000);

    // Update beliefs if available
    if (response.analysis) {
      updateBeliefDisplay({
        ...response.analysis.dimensions || state.selectedTarget.beliefState,
        composite: response.analysis.composite,
        stage: response.analysis.stage
      });
    }

    // Refresh target list to show updated scores
    refreshTargetList();

  } catch (err) {
    console.error('Failed to send message:', err);
    addMessage('agent', 'Sorry, there was an error processing your message.', 'System');
  }
}

// =============================================================================
// MODAL
// =============================================================================

function openAddTargetModal() {
  document.getElementById('modal-add-target').classList.add('open');
}

function closeAddTargetModal() {
  document.getElementById('modal-add-target').classList.remove('open');
  // Reset form
  document.getElementById('new-target-id').value = '';
  document.querySelectorAll('.belief-inputs input').forEach(input => {
    input.value = '10';
  });
}

async function addTarget() {
  const id = document.getElementById('new-target-id').value.trim();

  if (!id) {
    alert('Please enter a target ID');
    return;
  }

  const initialBeliefs = {
    belief: parseInt(document.getElementById('init-belief').value) || 10,
    trust: parseInt(document.getElementById('init-trust').value) || 10,
    emotional: parseInt(document.getElementById('init-emotional').value) || 10,
    social: parseInt(document.getElementById('init-social').value) || 10,
    technical: parseInt(document.getElementById('init-technical').value) || 10,
    financial: parseInt(document.getElementById('init-financial').value) || 10
  };

  try {
    await api.post('/targets', { id, initialBeliefs });
    closeAddTargetModal();
    await loadTargets();
    showNotification(`Target "${id}" added`);
  } catch (err) {
    console.error('Failed to add target:', err);
    alert('Failed to add target: ' + (err.error || err.message));
  }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

function init() {
  // Connect WebSocket
  connectWebSocket();

  // Load initial data
  loadTargets();

  // Setup event listeners
  document.getElementById('btn-add-target').onclick = openAddTargetModal;
  document.getElementById('btn-close-modal').onclick = closeAddTargetModal;
  document.getElementById('btn-cancel-add').onclick = closeAddTargetModal;
  document.getElementById('btn-confirm-add').onclick = addTarget;

  document.getElementById('btn-send').onclick = sendMessage;
  document.getElementById('input-message').onkeypress = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  // Close modal on backdrop click
  document.getElementById('modal-add-target').onclick = (e) => {
    if (e.target.id === 'modal-add-target') closeAddTargetModal();
  };

  // Refresh stats periodically
  setInterval(updateHeaderStats, 30000);
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
