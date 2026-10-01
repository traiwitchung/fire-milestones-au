# FIRE Milestones · Australia

Offline-first PWA for tracking Financial Independence / Retire Early milestones (Coast FIRE, Barista FIRE, Full FIRE) tuned for Australian super rules, plus a **Money** page (budget + net worth) and a **Home loan** calculator, both of which feed the FIRE plan. Pure static HTML/CSS/JS — React via CDN, no build step, no backend. Data stays on your device.

## Deploy to GitHub Pages

From inside this folder:

    git add .
    git commit -m "update"
    git push

GitHub Pages auto-deploys on push to `main`. The site serves at `https://USERNAME.github.io/REPO-NAME/`.

## Install on iPhone

1. Open the URL in **Safari** (Chrome/Firefox on iOS can't install PWAs — only Safari).
2. Tap the **Share** button → **Add to Home Screen**.
3. Tap the 🔥 icon on your home screen — the app opens full-screen, no browser chrome.

First load needs the internet so the service worker can cache all assets; after that it runs fully offline.

## Backup your data

All FIRE inputs and Money data (budget, accounts, check-ins) live only on this device in `localStorage`. If you lose the phone or clear Safari data, it's gone.

- Tap the floating **⤓ Backup** button (bottom-right) to download a JSON of everything.
- Tap **⤒ Restore** to load a backup file.

Do this regularly.

## Updating the app

After editing any asset, bump the cache version in [`sw.js`](sw.js):

    const CACHE = 'fire-au-v1';   // → 'fire-au-v2', etc.

Without this bump, installed devices keep serving the old cached build.

## Files

- `index.html` — the Milestones app (entry point)
- `money.html` — Money page: monthly budget (any frequency → /month), surplus allocation, net-worth check-ins + history chart, emergency-fund ladder, and a "Send to FIRE Milestones" panel that writes super/outside balances, monthly saving and retirement spending into the Milestones inputs
- `loan.html` — Home loan calculator: day-by-day simulation (interest accrues daily on loan − offset, charged monthly), offset account, recurring/one-off extra transactions, comparison vs no offset. Can fill itself from the Money page and send the repayment + payoff age to FIRE Milestones, which then adds the repayments to spending until that age
- `manifest.json` — PWA manifest
- `sw.js` — service worker with versioned cache
- `icon-180/192/512.png` — flame app icons

## Stack

Pure static. React 18 + Recharts + SheetJS + Babel standalone all via unpkg/CDN (cached by SW after first load). Google Fonts for DM Sans, JetBrains Mono, Playfair Display.
