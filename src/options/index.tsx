import { h, render } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { createDefaultSettings } from '../lib/schema';
import {
  clearToken,
  exportSettings,
  getSettings,
  importSettings,
  rotateToken,
  saveSettings,
} from '../lib/storage';
import type { Settings } from '../types/shared';

const styles = `
:root {
  color-scheme: light dark;
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0f172a;
  color: #e2e8f0;
}
body {
  margin: 0;
  min-height: 100vh;
  background: linear-gradient(160deg, #0f172a 0%, #1e293b 100%);
}
main {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 24px 64px;
}
h1 {
  font-size: 2rem;
  margin-bottom: 24px;
}
nav {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}
nav button {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 999px;
  padding: 8px 20px;
  color: inherit;
  cursor: pointer;
}
nav button.active {
  background: #38bdf8;
  color: #0f172a;
}
section {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.45);
}
fieldset {
  border: none;
  padding: 0;
  margin: 0 0 24px 0;
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}
label {
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
  gap: 6px;
}
input, textarea {
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  padding: 10px;
  background: rgba(15, 23, 42, 0.6);
  color: inherit;
  font-size: 0.95rem;
}
textarea {
  min-height: 160px;
  resize: vertical;
}
button.primary {
  background: #38bdf8;
  color: #0f172a;
  border: none;
  border-radius: 10px;
  padding: 10px 18px;
  font-weight: 600;
  cursor: pointer;
}
button.secondary {
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 10px;
  padding: 10px 18px;
  color: inherit;
  cursor: pointer;
}
.flex {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.status {
  margin-top: 12px;
  font-size: 0.85rem;
  color: #22c55e;
}
`; 

type TabKey = 'account' | 'email' | 'integrations';

type StatusMessage = { text: string; tone: 'success' | 'error' | 'info' } | null;

function App() {
  const [settings, setSettings] = useState<Settings>(createDefaultSettings());
  const [activeTab, setActiveTab] = useState<TabKey>('account');
  const [status, setStatus] = useState<StatusMessage>(null);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    void getSettings().then((loaded) => {
      setSettings(loaded);
    });
  }, []);

  const allowedHostsText = useMemo(() => settings.allowedHosts.join('\n'), [settings.allowedHosts]);

  const updateField = (path: string[], value: string) => {
    setSettings((prev) => {
      const next = structuredClone(prev);
      let target: any = next;
      for (let i = 0; i < path.length - 1; i += 1) {
        const key = path[i];
        target = target[key];
      }
      target[path[path.length - 1]] = value;
      return next;
    });
  };

  const handleDeadheadChange = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) return;
    setSettings((prev) => ({
      ...prev,
      operations: { ...prev.operations, deadheadRadius: parsed },
    }));
  };

  const handleAllowedHostsChange = (value: string) => {
    const hosts = value
      .split(/\n|,/)
      .map((host) => host.trim())
      .filter(Boolean);
    setSettings((prev) => ({ ...prev, allowedHosts: hosts }));
  };

  const handleSave = async () => {
    await saveSettings(settings);
    setStatus({ text: 'Settings saved', tone: 'success' });
  };

  const handleRotateToken = async () => {
    const token = window.prompt('Enter new TMS token');
    if (!token) return;
    await rotateToken(token.trim());
    const fresh = await getSettings();
    setSettings(fresh);
    setStatus({ text: 'Token rotated', tone: 'success' });
  };

  const handleClearToken = async () => {
    await clearToken();
    const fresh = await getSettings();
    setSettings(fresh);
    setStatus({ text: 'Token cleared', tone: 'info' });
  };

  const handleExport = async () => {
    const data = await exportSettings();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'dispatcher-settings.json';
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus({ text: 'Settings exported', tone: 'success' });
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const imported = await importSettings(json);
      setSettings(imported);
      setStatus({ text: 'Settings imported', tone: 'success' });
      setImportError(null);
    } catch (error) {
      console.error(error);
      setImportError('Import failed. Ensure the file is a valid export.');
    }
  };

  const telemetryToggle = async (enabled: boolean) => {
    setSettings((prev) => ({ ...prev, telemetryEnabled: enabled }));
  };

  useEffect(() => {
    if (!status) return;
    const timeout = window.setTimeout(() => setStatus(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [status]);

  return (
    <>
      <style>{styles}</style>
      <main>
        <h1>Dispatcher Co-Pilot Settings</h1>
        <nav>
          <button
            type="button"
            class={activeTab === 'account' ? 'active' : ''}
            onClick={() => setActiveTab('account')}
          >
            Account
          </button>
          <button
            type="button"
            class={activeTab === 'email' ? 'active' : ''}
            onClick={() => setActiveTab('email')}
          >
            Email Template
          </button>
          <button
            type="button"
            class={activeTab === 'integrations' ? 'active' : ''}
            onClick={() => setActiveTab('integrations')}
          >
            Integrations
          </button>
        </nav>

        {activeTab === 'account' && (
          <section>
            <fieldset>
              <label>
                Company name
                <input
                  value={settings.company.name}
                  onInput={(event) => updateField(['company', 'name'], (event.target as HTMLInputElement).value)}
                />
              </label>
              <label>
                MC number
                <input
                  value={settings.company.mc}
                  onInput={(event) => updateField(['company', 'mc'], (event.target as HTMLInputElement).value)}
                />
              </label>
              <label>
                Company phone
                <input
                  value={settings.company.phone}
                  onInput={(event) => updateField(['company', 'phone'], (event.target as HTMLInputElement).value)}
                />
              </label>
              <label>
                Login email
                <input
                  type="email"
                  value={settings.identity.loginEmail}
                  onInput={(event) => updateField(['identity', 'loginEmail'], (event.target as HTMLInputElement).value)}
                />
              </label>
              <label>
                Sender email (mailto CC)
                <input
                  type="email"
                  value={settings.identity.senderEmail}
                  onInput={(event) => updateField(['identity', 'senderEmail'], (event.target as HTMLInputElement).value)}
                />
              </label>
              <label>
                Deadhead radius (mi)
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={settings.operations.deadheadRadius}
                  onInput={(event) => handleDeadheadChange((event.target as HTMLInputElement).value)}
                />
              </label>
            </fieldset>

            <label>
              Allowed hostnames (one per line)
              <textarea value={allowedHostsText} onInput={(event) => handleAllowedHostsChange((event.target as HTMLTextAreaElement).value)} />
            </label>

            <label style="margin-top: 16px; display:flex; align-items:center; gap:8px;">
              <input
                type="checkbox"
                checked={settings.telemetryEnabled}
                onChange={(event) => telemetryToggle((event.target as HTMLInputElement).checked)}
              />
              Enable anonymous telemetry (action metadata only)
            </label>

            <div class="flex" style="margin-top: 24px;">
              <button type="button" class="primary" onClick={handleSave}>
                Save settings
              </button>
              <button type="button" class="secondary" onClick={handleExport}>
                Export settings
              </button>
              <label class="secondary" style="display: inline-flex; align-items: center; gap: 8px; cursor: pointer;">
                Import settings
                <input
                  type="file"
                  accept="application/json"
                  style="display: none;"
                  onChange={(event) => {
                    const file = (event.target as HTMLInputElement).files?.[0];
                    if (file) void handleImport(file);
                  }}
                />
              </label>
            </div>
            {importError ? <div class="status" style="color:#f87171;">{importError}</div> : null}
          </section>
        )}

        {activeTab === 'email' && (
          <section>
            <fieldset>
              <label>
                Email subject template
                <input
                  value={settings.emailTemplate.subject}
                  onInput={(event) => updateField(['emailTemplate', 'subject'], (event.target as HTMLInputElement).value)}
                />
              </label>
            </fieldset>
            <label>
              Email body template
              <textarea
                value={settings.emailTemplate.body}
                onInput={(event) => updateField(['emailTemplate', 'body'], (event.target as HTMLTextAreaElement).value)}
              />
            </label>
            <p style="margin-top:16px;font-size:0.85rem;color:#94a3b8;">
              Available variables: {{'{{origin_city}}'}}, {{'{{origin_state}}'}}, {{'{{destination_city}}'}}, {{'{{destination_state}}'}}, {{'{{total_mileage}}'}}, {{'{{rate}}'}}, {{'{{date}}'}}, {{'{{company}}'}}, {{'{{mc}}'}}, {{'{{phone}}'}}
            </p>
            <div class="flex" style="margin-top: 24px;">
              <button type="button" class="primary" onClick={handleSave}>
                Save template
              </button>
            </div>
          </section>
        )}

        {activeTab === 'integrations' && (
          <section>
            <fieldset>
              <label>
                TMS webhook URL
                <input
                  type="url"
                  value={settings.tms.url}
                  onInput={(event) => updateField(['tms', 'url'], (event.target as HTMLInputElement).value)}
                />
              </label>
            </fieldset>
            <div class="flex">
              <button type="button" class="secondary" onClick={handleRotateToken}>
                Rotate token
              </button>
              <button type="button" class="secondary" onClick={handleClearToken}>
                Clear token
              </button>
            </div>
            <p style="margin-top:16px;font-size:0.85rem;color:#94a3b8;">
              {settings.tms.token ? 'Encrypted token is stored. Rotate to update or clear to remove.' : 'No token stored.'}
            </p>
            <div class="flex" style="margin-top: 24px;">
              <button type="button" class="primary" onClick={handleSave}>
                Save changes
              </button>
            </div>
          </section>
        )}

        {status ? (
          <div
            class="status"
            style={{ color: status.tone === 'error' ? '#f87171' : status.tone === 'info' ? '#38bdf8' : '#22c55e' }}
          >
            {status.text}
          </div>
        ) : null}
      </main>
    </>
  );
}

render(<App />, document.getElementById('app')!);
