import { h, render } from 'preact';
import { useEffect, useMemo } from 'preact/hooks';
import { createDefaultSettings } from '../lib/schema';
import type { Settings, VisiblePosting } from '../types/shared';

export type DrawerCallbacks = {
  onCompute: (posting: VisiblePosting) => void;
  onCopy: (posting: VisiblePosting, asJson: boolean) => void;
  onEmail: (posting: VisiblePosting) => void;
  onCall: (posting: VisiblePosting) => void;
  onSendTms: (posting: VisiblePosting, notes: string) => void;
};

export type DrawerController = {
  open: (posting: VisiblePosting) => void;
  close: () => void;
  toggle: (posting?: VisiblePosting) => void;
  updateSettings: (settings: Settings) => void;
  showToast: (variant: 'info' | 'success' | 'error', message: string) => void;
  setRpmResult: (rpm: number, deadhead: number) => void;
  isOpen: () => boolean;
  setCallbacks: (callbacks: DrawerCallbacks) => void;
  getNotes: () => string;
  setNotes: (notes: string) => void;
  getCopyJson: () => boolean;
};

type Toast = { id: number; variant: 'info' | 'success' | 'error'; message: string };

type DrawerState = {
  open: boolean;
  posting: VisiblePosting | null;
  settings: Settings;
  notes: string;
  copyJson: boolean;
  toasts: Toast[];
  rpmResult: { rpm: number; deadhead: number } | null;
};

const defaultState: DrawerState = {
  open: false,
  posting: null,
  settings: createDefaultSettings(),
  notes: '',
  copyJson: false,
  toasts: [],
  rpmResult: null,
};

const styles = `
:host {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: 360px;
  z-index: 2147483646;
  display: block;
  pointer-events: none;
  overflow: visible;
}
:host(.open) {
  pointer-events: auto;
}
.dcp-panel {
  width: 360px;
  max-width: 90vw;
  height: 100%;
  background: #0f172a;
  color: #f8fafc;
  box-shadow: -4px 0 16px rgba(15, 23, 42, 0.4);
  transform: translateX(100%);
  transition: transform 0.18s ease-in-out;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
}
.dcp-panel.open {
  transform: translateX(0);
}
.dcp-header {
  padding: 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.4);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.dcp-title {
  font-size: 1.1rem;
  font-weight: 600;
}
.dcp-actions {
  display: flex;
  gap: 8px;
}
button.dcp-btn {
  background: #1e293b;
  color: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 0.85rem;
}
button.dcp-btn:focus {
  outline: 2px solid #38bdf8;
  outline-offset: 2px;
}
button.dcp-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.dcp-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.dcp-section h3 {
  margin: 0 0 8px 0;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.dcp-preview {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.3);
  padding: 12px;
  border-radius: 8px;
  line-height: 1.4;
}
.dcp-badge {
  display: inline-flex;
  align-items: center;
  background: #22c55e;
  color: #0f172a;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: 8px;
}
.dcp-toast-container {
  position: absolute;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dcp-toast {
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  box-shadow: 0 6px 24px rgba(15, 23, 42, 0.4);
}
.dcp-toast.info {
  background: #2563eb;
  color: #f8fafc;
}
.dcp-toast.success {
  background: #22c55e;
  color: #052e16;
}
.dcp-toast.error {
  background: #ef4444;
  color: #fee2e2;
}
.dcp-notes {
  width: 100%;
  min-height: 96px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(15, 23, 42, 0.3);
  color: #f8fafc;
  padding: 8px;
  font-size: 0.9rem;
}
.dcp-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.dcp-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
}
`; 

type DrawerProps = {
  state: DrawerState;
  setState: (next: DrawerState | ((prev: DrawerState) => DrawerState)) => void;
  root: ShadowRoot;
  onClose: () => void;
  callbacks: DrawerCallbacks;
};

function DrawerApp({ state, setState, root, onClose, callbacks }: DrawerProps) {
  const { open, posting, settings, notes, copyJson, toasts, rpmResult } = state;
  const { onCompute, onCopy, onEmail, onCall, onSendTms } = callbacks;

  useEffect(() => {
    if (!open) return;
    const focusable = root.querySelectorAll<HTMLElement>(
      'button, [href], textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (first) first.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key === 'Tab' && focusable.length > 1) {
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          (last ?? first)?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          (first ?? last)?.focus();
        }
      }
      if (!posting) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      switch (event.key.toLowerCase()) {
        case 'e':
          event.preventDefault();
          onEmail(posting);
          break;
        case 't':
          if (posting.broker.phone) {
            event.preventDefault();
            onCall(posting);
          }
          break;
        case 'c':
          event.preventDefault();
          onCopy(posting, copyJson);
          break;
        case 's':
          event.preventDefault();
          onSendTms(posting, notes);
          break;
        default:
      }
    };
    root.addEventListener('keydown', handleKeyDown);
    return () => {
      root.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, root, onClose, posting, copyJson, notes, onEmail, onCall, onCopy, onSendTms]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => {
      setState((prev) => ({
        ...prev,
        toasts: prev.toasts.filter((toast) => Date.now() - toast.id < 4000),
      }));
    }, 500);
    return () => window.clearInterval(timer);
  }, [open, setState]);

  const preview = useMemo(() => {
    if (!posting) return '';
    const parts: string[] = [];
    parts.push(`${posting.origin.city}, ${posting.origin.state} → ${posting.destination.city}, ${posting.destination.state}`);
    if (posting.equipment) parts.push(`Equipment: ${posting.equipment}`);
    if (posting.totalMileage != null) parts.push(`Miles: ${posting.totalMileage}`);
    if (posting.rate != null) parts.push(`Rate: $${posting.rate}`);
    parts.push(`Broker: ${posting.broker.name}`);
    if (posting.broker.phone) parts.push(`Phone: ${posting.broker.phone}`);
    if (posting.broker.email) parts.push(`Email: ${posting.broker.email}`);
    return parts.join('\n');
  }, [posting]);

  return (
    <div class={`dcp-panel${open ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label="Dispatcher Co-Pilot">
      <style>{styles}</style>
      <div class="dcp-header">
        <div class="dcp-title">Dispatcher Co-Pilot</div>
        <div class="dcp-actions">
          <button
            type="button"
            class="dcp-btn"
            onClick={() => posting && onCall(posting)}
            disabled={!posting?.broker.phone}
            aria-label="Call broker"
          >
            📞 Call
          </button>
          <button
            type="button"
            class="dcp-btn"
            onClick={() => posting && onEmail(posting)}
            disabled={!posting?.broker.email}
            aria-label="Email broker"
          >
            ✉️ Email
          </button>
          <button type="button" class="dcp-btn" onClick={onClose} aria-label="Close drawer">
            ✕
          </button>
        </div>
      </div>
      <div class="dcp-body">
        {posting ? (
          <>
            <section class="dcp-section">
              <h3>
                Posting Preview
                {rpmResult ? <span class="dcp-badge">RPM {rpmResult.rpm.toFixed(2)}</span> : null}
              </h3>
              <pre class="dcp-preview">{preview}</pre>
              {rpmResult ? <div class="dcp-preview">Deadhead: {rpmResult.deadhead.toFixed(0)} mi</div> : null}
            </section>
            <section class="dcp-section">
              <h3>Actions</h3>
              <div class="dcp-actions" style="flex-wrap: wrap;">
                <button type="button" class="dcp-btn" onClick={() => onCompute(posting)}>
                  Compute RPM
                </button>
                <button type="button" class="dcp-btn" onClick={() => onCopy(posting, copyJson)}>
                  Copy
                </button>
                <button type="button" class="dcp-btn" onClick={() => onSendTms(posting, notes)} disabled={!settings.tms.url}>
                  Send to TMS
                </button>
              </div>
              <label class="dcp-toggle">
                <input
                  type="checkbox"
                  checked={copyJson}
                  onChange={(event) =>
                    setState((prev) => ({ ...prev, copyJson: (event.target as HTMLInputElement).checked }))
                  }
                />
                Copy JSON
              </label>
            </section>
            <section class="dcp-section">
              <h3>Notes</h3>
              <textarea
                class="dcp-notes"
                value={notes}
                onInput={(event) =>
                  setState((prev) => ({ ...prev, notes: (event.target as HTMLTextAreaElement).value }))
                }
              />
            </section>
          </>
        ) : (
          <p>Select a posting to begin.</p>
        )}
      </div>
      <div class="dcp-toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} class={`dcp-toast ${toast.variant}`}> {toast.message} </div>
        ))}
      </div>
    </div>
  );
}

export function createDrawer(): DrawerController {
  const host = document.createElement('div');
  host.setAttribute('id', 'dcp-root');
  const shadow = host.attachShadow({ mode: 'closed' });
  const container = document.createElement('div');
  shadow.appendChild(container);
  (document.body ?? document.documentElement).appendChild(host);

  let state = defaultState;
  let updateState: DrawerProps['setState'] = (next) => {
    state = typeof next === 'function' ? (next as (prev: DrawerState) => DrawerState)(state) : next;
    renderApp();
  };

  let callbacks: DrawerCallbacks = {
    onCompute: () => undefined,
    onCopy: () => undefined,
    onEmail: () => undefined,
    onCall: () => undefined,
    onSendTms: () => undefined,
  };

  const renderApp = () => {
    if (state.open) {
      host.classList.add('open');
    } else {
      host.classList.remove('open');
    }
    render(
      <DrawerApp
        state={state}
        setState={(next) => {
          state = typeof next === 'function' ? (next as (prev: DrawerState) => DrawerState)(state) : next;
          renderApp();
        }}
        root={shadow}
        onClose={() => {
          state = { ...state, open: false };
          renderApp();
        }}
        callbacks={callbacks}
      />,
      container
    );
  };

  const api: DrawerController = {
    open(posting) {
      state = {
        ...state,
        open: true,
        posting,
        notes: posting.notes ?? '',
        rpmResult: null,
      };
      renderApp();
    },
    close() {
      state = { ...state, open: false };
      renderApp();
    },
    toggle(posting) {
      if (state.open) {
        api.close();
      } else if (posting) {
        api.open(posting);
      } else {
        state = { ...state, open: !state.open };
        renderApp();
      }
    },
    updateSettings(settings) {
      state = { ...state, settings };
      renderApp();
    },
    showToast(variant, message) {
      const toast: Toast = { id: Date.now(), variant, message };
      const filtered = state.toasts.filter((existing) => Date.now() - existing.id < 3500);
      state = { ...state, toasts: [...filtered, toast] };
      renderApp();
    },
    setRpmResult(rpm, deadhead) {
      state = { ...state, rpmResult: { rpm, deadhead } };
      renderApp();
    },
    isOpen() {
      return state.open;
    },
    setCallbacks(nextCallbacks) {
      callbacks = nextCallbacks;
      renderApp();
    },
    getNotes() {
      return state.notes;
    },
    setNotes(notes) {
      state = { ...state, notes };
      renderApp();
    },
    getCopyJson() {
      return state.copyJson;
    },
  };

  renderApp();

  return api;
}
