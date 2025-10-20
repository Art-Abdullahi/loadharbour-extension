import { computeRpm, formatPostingText } from '../lib/math';
import { isAllowed } from '../lib/host';
import { getSettings, decryptToken } from '../lib/storage';
import { buildMailto } from '../lib/templating';
import type { BgMsg, Settings, UiMsg, VisiblePosting } from '../types/shared';

async function sendToTab(tabId: number, message: UiMsg): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    console.warn('Failed to send message to tab', error);
  }
}

async function ensureAllowed(tabUrl: string | undefined, settings: Settings, tabId?: number): Promise<boolean> {
  if (!tabUrl) {
    if (tabId != null) {
      await sendToTab(tabId, { type: 'TOAST', variant: 'error', message: 'Missing tab URL for action' });
    }
    return false;
  }
  const allowed = isAllowed(tabUrl, settings.allowedHosts);
  if (!allowed && tabId != null) {
    await sendToTab(tabId, { type: 'HOST_BLOCKED' });
  }
  return allowed;
}

async function handleCompute(posting: VisiblePosting, tabId: number, settings: Settings) {
  const deadhead = settings.operations.deadheadRadius ?? 0;
  const rpm = computeRpm(posting, deadhead);
  if (rpm == null) {
    await sendToTab(tabId, { type: 'TOAST', variant: 'error', message: 'Rate and miles required for RPM' });
    return;
  }
  await sendToTab(tabId, { type: 'TOAST', variant: 'success', message: `RPM ${rpm.toFixed(2)}` });
  await sendToTab(tabId, { type: 'RPM_RESULT', rpm, deadhead });
}

async function handleCopy(posting: VisiblePosting, tabId: number, asJson: boolean) {
  const text = asJson ? JSON.stringify(posting, null, 2) : formatPostingText(posting);
  await navigator.clipboard.writeText(text);
  await sendToTab(tabId, {
    type: 'TOAST',
    variant: 'success',
    message: asJson ? 'Posting JSON copied' : 'Posting copied',
  });
}

async function handleMailto(posting: VisiblePosting, settings: Settings) {
  if (!posting.broker.email) throw new Error('Missing broker email');
  const url = buildMailto(posting, settings);
  await chrome.tabs.create({ url });
}

async function handleTel(posting: VisiblePosting) {
  if (!posting.broker.phone) throw new Error('Missing broker phone');
  const url = `tel:${encodeURIComponent(posting.broker.phone)}`;
  await chrome.tabs.create({ url });
}

async function handleSendTms(posting: VisiblePosting, settings: Settings, notes: string | undefined, tabId: number) {
  if (!settings.tms.url) {
    await sendToTab(tabId, { type: 'TOAST', variant: 'error', message: 'Add a TMS webhook URL in Options' });
    return;
  }
  const url = settings.tms.url;
  if (!url.startsWith('https://')) {
    await sendToTab(tabId, { type: 'TOAST', variant: 'error', message: 'TMS webhook must use HTTPS' });
    return;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const headers = new Headers({ 'Content-Type': 'application/json' });
  const token = await decryptToken(settings.tms.token ?? null);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const payload = {
    source: 'DAT',
    record: posting,
    company: { ...settings.company, senderEmail: settings.identity.senderEmail },
    ...(notes ? { notes } : {}),
  };
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    await sendToTab(tabId, { type: 'TOAST', variant: 'success', message: 'Posted to TMS' });
  } catch (error) {
    await sendToTab(tabId, { type: 'TOAST', variant: 'error', message: 'TMS webhook failed' });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

chrome.runtime.onMessage.addListener((message: BgMsg, sender, sendResponse) => {
  (async () => {
    const tabId = sender.tab?.id;
    const tabUrl = sender.tab?.url;
    switch (message.type) {
      case 'CHECK_HOST': {
        const current = await getSettings();
        const allowed = isAllowed(message.url, current.allowedHosts);
        sendResponse(allowed);
        return;
      }
      case 'COMPUTE_RPM': {
        if (tabId == null) throw new Error('Missing tab for compute');
        const current = await getSettings();
        if (!(await ensureAllowed(tabUrl, current, tabId))) {
          sendResponse(undefined);
          return;
        }
        await handleCompute(message.posting, tabId, current);
        sendResponse(undefined);
        return;
      }
      case 'COPY_POSTING': {
        if (tabId == null) throw new Error('Missing tab for copy');
        const current = await getSettings();
        if (!(await ensureAllowed(tabUrl, current, tabId))) {
          sendResponse(undefined);
          return;
        }
        await handleCopy(message.posting, tabId, message.asJson);
        sendResponse(undefined);
        return;
      }
      case 'OPEN_MAILTO': {
        const current = await getSettings();
        if (!(await ensureAllowed(tabUrl, current, tabId ?? undefined))) {
          sendResponse(undefined);
          return;
        }
        await handleMailto(message.posting, current);
        sendResponse(undefined);
        return;
      }
      case 'OPEN_TEL': {
        const current = await getSettings();
        if (!(await ensureAllowed(tabUrl, current, tabId ?? undefined))) {
          sendResponse(undefined);
          return;
        }
        await handleTel(message.posting);
        sendResponse(undefined);
        return;
      }
      case 'SEND_TMS': {
        if (tabId == null) throw new Error('Missing tab for TMS');
        const current = await getSettings();
        if (!(await ensureAllowed(tabUrl, current, tabId))) {
          sendResponse(undefined);
          return;
        }
        await handleSendTms(message.posting, current, message.notes, tabId);
        sendResponse(undefined);
        return;
      }
      case 'TELEMETRY': {
        const current = await getSettings();
        if (current.telemetryEnabled) {
          console.info('[Dispatcher Co-Pilot]', message.event);
        }
        sendResponse(undefined);
        return;
      }
      default:
        sendResponse(undefined);
        return;
    }
  })().catch((error) => {
    console.error('Background error', error);
    sendResponse(undefined);
  });
  return true;
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-panel') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  await sendToTab(tab.id, { type: 'TOGGLE_DRAWER' });
});
