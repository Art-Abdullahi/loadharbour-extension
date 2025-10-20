Dispatcher Co-Pilot (MV3 • TypeScript • Preact + Vite)

A ToS-compliant, user-initiated Chrome/Edge extension that adds a slide-out Dispatcher Actions drawer on DAT pages to speed up dispatcher workflows—without automated scraping/exporting.

⚖️ Compliance first: The extension only acts on the currently visible, user-clicked posting. No pagination, no background crawling, no headless automation, no credential storage.

Features (all require an explicit user action)

Parse visible fields from the clicked row/card (equipment, lane, miles, weight, rate, pickup/delivery times, broker).

Compute RPM & deadhead using user settings.

Open mailto: (with a template) and tel: (broker call). No auto-sending.

Copy normalized text/JSON to clipboard.

Send one record to your TMS webhook (HTTPS) on click; show a toast.

Minimal drawer UI (Shadow DOM), keyboard-friendly, AA contrast, non-disruptive overlay.

Tech Stack

Manifest V3 (Chrome/Edge)

TypeScript + Vite (fast build)

Preact (tiny) for the drawer/Options UI, rendered inside Shadow DOM

Web Crypto (AES-GCM) for encrypting the TMS token in storage

zod (optional) for runtime validation

Vitest (unit) + Playwright (e2e against HTML fixtures)

ESLint + Prettier for code quality

Folder Structure
src/
  bg/          # background service worker (router, clipboard, mailto/tel, single-record TMS webhook)
  content/     # DOM parsers, row icon injection, slide-out drawer UI (Shadow DOM)
  options/     # Options page (settings, templates, tokens)
  lib/         # crypto, templating, rpm/deadhead math, host allowlist helpers
  types/       # shared types/messages
public/
  manifest.json
tests/
  unit/        # Vitest unit tests
.github/workflows/
  ci.yml       # CI: typecheck → unit → build
vite.config.ts
tsconfig.json
package.json
.eslintrc.json
.prettierrc

Getting Started
1) Install
npm i

2) Build (or dev)
npm run build     # produce dist/
# or
npm run dev       # vite dev server (for Options page); still load dist/ in Chrome

3) Load in Chrome/Edge

Open chrome://extensions (or edge://extensions)

Enable Developer mode

Click Load unpacked → select the dist/ folder

In the extension’s Site access, grant your DAT host(s) (e.g., https://power.dat.com/*)

Usage

Navigate to a DAT results or posting page (on an allowed host).

Click the row action (📞 or ✉️) injected by the extension, or press the shortcut to open the drawer.

From the drawer: Compute, Copy, Email, Call, or Send to TMS (single record).

Keyboard shortcuts

Ctrl/⌘ + Shift + L – open/close the drawer

Inside drawer: E Email, T Call, C Copy, S Send to TMS (buttons still require confirm click if you implement that pattern)

Options / Settings

Identity

Login email (for signature/template context)

Email used for sending (mailto prefill only)

Company: Name, MC, phone

Templates

Email subject/body with mustache-style vars:

{{origin_city}}, {{origin_state}}, {{destination_city}}, {{destination_state}}, {{total_mileage}}, {{rate}}, {{date}}, {{company}}, {{mc}}, {{phone}}

Operations

RPM target(s), deadhead radius (mi), truck/home location (optional)

Integrations

TMS webhook URL (HTTPS) + token (encrypted at rest via AES-GCM)

Security

Allowed hostnames (domain allowlist)

Telemetry (off by default)

Note: The extension never stores or uses DAT credentials. Settings are local to the browser profile.

Security & Privacy

Principle of least privilege (MV3 permissions): storage, clipboardWrite, activeTab, scripting, (optional) notifications.

No background scraping; content script only reads visible DOM after a user click.

Token protection: TMS token is encrypted with Web Crypto (AES-GCM) and a per-session key.

PII minimization: No data is transmitted unless the user clicks Send to TMS; telemetry is opt-in and PII-free.

CSP: Options page uses MV3 defaults; no remote scripts/styles; no eval.

Compliance Guardrails (Hard Rules)

❌ Do not automate searches, paginate, or export multiple postings.

❌ Do not make hidden requests to fetch DAT data.

❌ Do not store DAT credentials or weaken site security.

✅ Only act on the clicked posting’s visible fields.

✅ Every action requires an explicit user gesture (click/shortcut + confirm).

Scripts
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest unit tests
npm run e2e         # playwright (if you add fixtures)
npm run build       # build to dist/
npm run dev         # vite dev (Options page)

Testing

Unit (Vitest): DOM parsers (with HTML stubs), template engine, RPM math (edge cases).

E2E (Playwright, optional):

Domain gating (works only on allowed hosts)

Drawer opens from user gesture

Single-record TMS webhook succeeds/fails with clear toasts

Clipboard copy content checks

No background network when idle

Release / Packaging

Build: npm run build → dist/

Zip dist/ for store upload or enterprise distribution

Keep a CHANGELOG and a one-click rollback plan (disable or revert to previous version)

Troubleshooting

Drawer doesn’t open: Ensure the host is in Site access and the page is a supported DAT view.

Buttons disabled: Add TMS URL/token in Options; confirm HTTPS.

No phone/email on posting: Those actions stay disabled—extension won’t infer or fetch hidden data.

Clipboard blocked: Ensure you clicked the action (user gesture is required by browsers).

Contributing

Fork & branch

npm i

Write tests (vitest) for parsers/templating before changes

npm run build and test on a sample page

PR with a short ToS impact note

License

MIT — see LICENSE (or add one).
