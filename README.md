# Family Networth · Australia

Offline-first PWA for personal money planning, tuned for Australian super and tax rules. One link, five tabs:

- **Overview** — net worth, cash flow, emergency fund, home loan and FIRE at a glance, plus a to-do list (check-in due, FIRE out of sync, backup overdue) with one-tap fixes
- **Budget** — monthly budget (weekly / fortnightly / yearly amounts converted to per month) and where the surplus goes
- **Net worth** — monthly balance check-ins, net-worth history, emergency-fund ladder, and "Send to FIRE"
- **Home loan** — day-by-day loan simulation with offset and extra repayments; sends its payoff age to FIRE
- **FIRE** — Coast / Barista / Full FIRE milestones with AU super rules, bridge years and the mortgage included

Pure static HTML/JS — React via CDN, no build step, no backend. Data stays on your device.

## Deploy to GitHub Pages

From inside this folder:

    git add .
    git commit -m "update"
    git push

GitHub Pages auto-deploys on push to `main`. The site serves at `https://USERNAME.github.io/REPO-NAME/`.

## Install on iPhone

1. Open the URL in **Safari** (Chrome/Firefox on iOS can't install PWAs — only Safari).
2. Tap the **Share** button → **Add to Home Screen**.
3. Tap the icon on your home screen — the app opens full-screen, no browser chrome.

First load needs the internet so the service worker can cache all assets; after that it runs fully offline.

## Backup your data

All FIRE inputs and Money data (budget, accounts, check-ins) live only on this device in `localStorage`. If you lose the phone or clear Safari data, it's gone.

- Tap **⤓ Backup** (top-right) to download a JSON of everything. The Overview reminds you when it's been 30+ days.
- Tap **⤒ Restore** to load a backup file.

Do this regularly.

## Updating the app

After editing any asset, bump the cache version in [`sw.js`](sw.js):

    const CACHE = 'fire-au-v1';   // → 'fire-au-v2', etc.

Without this bump, installed devices keep serving the old cached build.

## Files

- `index.html` — app shell: header, tabs (bottom bar on phones), hash routing (`#overview`, `#budget`, `#networth`, `#loan`, `#fire`; `#networth/checkin` opens the check-in form), backup/restore, service-worker registration
- `overview.jsx` — Overview tab
- `money.jsx` — Budget and Net worth tabs; also exports the shared UI kit (`window.UI`)
- `loan.jsx` — Home loan tab and loan engine
- `fire.jsx` — FIRE tab and FIRE engine
- `money.html` — redirect for the old Money link
- `manifest.json`, `sw.js`, `icon-180/192/512.png` — PWA bits

Each `.jsx` file is wrapped in its own scope and shares only what it puts on `window`. Tabs remount when you switch, so each one re-reads the latest saved data. Storage keys: `fire-calc-au-inputs` + `fire-milestones-au-inputs` (FIRE), `fire-money-au` (budget, accounts, check-ins), `fire-loan-au` (home loan), `fire-meta` (last backup).

## Stack

Pure static. React 18 + Recharts + SheetJS + Babel standalone all via unpkg/CDN; the `.jsx` tabs are compiled in the browser (cached by SW after first load). Google Fonts for DM Sans, JetBrains Mono, Playfair Display.
