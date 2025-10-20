import { createDefaultSettings } from '../lib/schema';
import { getSettings, SETTINGS_KEY } from '../lib/storage';
import { createDrawer, DrawerController } from './ui';
import { closestRow, parsePosting } from './parser';
import type { BgMsg, Settings, UiMsg, VisiblePosting } from '../types/shared';

const ICON_STYLE = `
.dcp-row-actions {
  display: flex;
  gap: 4px;
  margin-left: auto;
}
.dcp-row-action-btn {
  background: transparent;
  border: none;
  font-size: 18px;
  cursor: pointer;
  line-height: 1;
  padding: 0 4px;
}
.dcp-row-action-btn:focus {
  outline: 2px solid #38bdf8;
  outline-offset: 2px;
}
`;

type TelemetryAction = 'compute' | 'copy' | 'email' | 'call' | 'send_tms' | 'toggle_drawer';

let settings: Settings = createDefaultSettings();
let drawer: DrawerController;
let currentPosting: VisiblePosting | null = null;
let pickerActive = false;
let styleInjected = false;

async function sendMessage<T>(message: BgMsg): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(err);
        return;
      }
      resolve(response as T);
    });
  });
}

async function sendTelemetry(action: TelemetryAction, durationMs: number, success: boolean) {
  if (!settings.telemetryEnabled) return;
  const event = {
    action,
    durationMs,
    success,
    timestamp: Date.now(),
  } as const;
  try {
    await sendMessage<void>({ type: 'TELEMETRY', event });
  } catch (err) {
    console.warn('Telemetry failed', err);
  }
}

function injectStyles() {
  if (styleInjected) return;
  const style = document.createElement('style');
  style.textContent = ICON_STYLE;
  document.head.appendChild(style);
  styleInjected = true;
}

function enhanceRow(row: Element) {
  if ((row as HTMLElement).dataset.dcpEnhanced === 'true') return;
  (row as HTMLElement).dataset.dcpEnhanced = 'true';
  const actionHost = document.createElement('div');
  actionHost.className = 'dcp-row-actions';
  const callBtn = document.createElement('button');
  callBtn.type = 'button';
  callBtn.className = 'dcp-row-action-btn';
  callBtn.textContent = '📞';
  callBtn.title = 'Open Dispatcher Co-Pilot';
  const emailBtn = document.createElement('button');
  emailBtn.type = 'button';
  emailBtn.className = 'dcp-row-action-btn';
  emailBtn.textContent = '✉️';
  emailBtn.title = 'Open Dispatcher Co-Pilot';

  const openFromRow = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    openRow(row);
  };

  callBtn.addEventListener('click', openFromRow);
  emailBtn.addEventListener('click', openFromRow);

  const targetContainer = row.querySelector('[data-testid="actions"], .actions, header, .grid, .row');
  if (targetContainer) {
    targetContainer.appendChild(actionHost);
  } else {
    row.appendChild(actionHost);
  }
  actionHost.appendChild(callBtn);
  actionHost.appendChild(emailBtn);
}

function scanRows() {
  const rows = document.querySelectorAll('[role="row"], .result-row, [data-testid="posting-row"], article, li');
  rows.forEach((row) => enhanceRow(row));
}

function observeRows() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches('[role="row"], .result-row, [data-testid="posting-row"], article, li')) {
          enhanceRow(node);
        }
        node.querySelectorAll?.('[role="row"], .result-row, [data-testid="posting-row"], article, li').forEach((child) => {
          enhanceRow(child);
        });
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function getSelectedRow(): Element | null {
  const selected = document.querySelector(
    '[role="row"].is-selected, [role="row"][aria-selected="true"], .result-row.is-selected, .result-row[aria-selected="true"]'
  );
  if (selected) return selected;
  return null;
}

function enterPicker() {
  if (pickerActive) return;
  pickerActive = true;
  drawer.showToast('info', 'Pick a posting to open Dispatcher Co-Pilot');
  const listener = (event: MouseEvent) => {
    const target = event.target as Element | null;
    const row = closestRow(target ?? null);
    if (row) {
      event.preventDefault();
      event.stopPropagation();
      exitPicker();
      openRow(row);
    }
  };
  const exitPicker = () => {
    pickerActive = false;
    document.removeEventListener('click', listener, true);
  };
  document.addEventListener('click', listener, true);
  setTimeout(() => {
    if (pickerActive) {
      exitPicker();
    }
  }, 15000);
}

function openRow(row: Element) {
  const posting = parsePosting(row);
  currentPosting = posting;
  drawer.open(posting);
}

async function handleToggle() {
  if (drawer.isOpen()) {
    drawer.close();
    void sendTelemetry('toggle_drawer', 0, true);
    return;
  }
  if (currentPosting) {
    drawer.open(currentPosting);
    void sendTelemetry('toggle_drawer', 0, true);
    return;
  }
  const selected = getSelectedRow();
  if (selected) {
    openRow(selected);
    void sendTelemetry('toggle_drawer', 0, true);
    return;
  }
  enterPicker();
}

function registerStorageListener() {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (!changes[SETTINGS_KEY]) return;
    const next = changes[SETTINGS_KEY].newValue as Settings;
    settings = next;
    drawer.updateSettings(settings);
  });
}

function registerMessageListener() {
  chrome.runtime.onMessage.addListener((message: UiMsg) => {
    switch (message.type) {
      case 'TOGGLE_DRAWER':
        void handleToggle();
        break;
      case 'TOAST':
        drawer.showToast(message.variant, message.message);
        break;
      case 'HOST_BLOCKED':
        drawer.showToast('error', 'Dispatcher Co-Pilot is disabled on this site');
        break;
      case 'SETTINGS_UPDATED':
        settings = message.settings;
        drawer.updateSettings(settings);
        break;
      case 'RPM_RESULT':
        drawer.setRpmResult(message.rpm, message.deadhead);
        break;
      default:
    }
  });
}

function setupDrawerCallbacks() {
  drawer.setCallbacks({
    onCompute: async (posting) => {
      const start = performance.now();
      try {
        await sendMessage<void>({ type: 'COMPUTE_RPM', posting, settings });
        await sendTelemetry('compute', performance.now() - start, true);
      } catch (error) {
        drawer.showToast('error', 'Failed to compute RPM');
        await sendTelemetry('compute', performance.now() - start, false);
      }
    },
    onCopy: async (posting, asJson) => {
      const start = performance.now();
      try {
        await sendMessage<void>({ type: 'COPY_POSTING', posting, asJson });
        drawer.showToast('success', asJson ? 'JSON copied to clipboard' : 'Posting copied to clipboard');
        await sendTelemetry('copy', performance.now() - start, true);
      } catch (error) {
        drawer.showToast('error', 'Clipboard copy failed');
        await sendTelemetry('copy', performance.now() - start, false);
      }
    },
    onEmail: async (posting) => {
      const start = performance.now();
      try {
        await sendMessage<void>({ type: 'OPEN_MAILTO', posting, settings });
        await sendTelemetry('email', performance.now() - start, true);
      } catch (error) {
        drawer.showToast('error', 'Unable to open email client');
        await sendTelemetry('email', performance.now() - start, false);
      }
    },
    onCall: async (posting) => {
      const start = performance.now();
      try {
        await sendMessage<void>({ type: 'OPEN_TEL', posting });
        await sendTelemetry('call', performance.now() - start, true);
      } catch (error) {
        drawer.showToast('error', 'Unable to start call');
        await sendTelemetry('call', performance.now() - start, false);
      }
    },
    onSendTms: async (posting, notes) => {
      const start = performance.now();
      try {
        await sendMessage<void>({ type: 'SEND_TMS', posting: { ...posting, notes }, settings, notes });
        await sendTelemetry('send_tms', performance.now() - start, true);
      } catch (error) {
        drawer.showToast('error', 'Failed to send to TMS');
        await sendTelemetry('send_tms', performance.now() - start, false);
      }
    },
  });
}

async function init() {
  injectStyles();
  drawer = createDrawer();
  setupDrawerCallbacks();
  settings = await getSettings();
  drawer.updateSettings(settings);
  registerStorageListener();
  registerMessageListener();
  scanRows();
  observeRows();
  try {
    const allowed = await sendMessage<boolean>({ type: 'CHECK_HOST', url: window.location.href });
    if (!allowed) {
      drawer.showToast('error', 'Dispatcher Co-Pilot is unavailable on this host');
    }
  } catch (err) {
    console.warn('Host check failed', err);
  }
}

init().catch((error) => {
  console.error('Failed to initialise Dispatcher Co-Pilot', error);
});
