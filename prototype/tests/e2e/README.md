# Browser tests

Drive the real UI in an installed Chromium browser (Edge or Chrome) with `puppeteer-core`.

```
cd prototype/tests/e2e
npm install
npm run journey      # full customer -> staff -> customer -> admin journey (117 checks)
npm run responsive   # every route at 390 / 820 / 1440 px: no horizontal overflow, no console errors
```

Environment variables: `BROWSER_PATH` (default: Edge at `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`; set it to Chrome or a Linux/macOS binary if needed) and `SHOTS_DIR` (where screenshots go; default: your temp folder).

The tests clear this site's localStorage first, so they never touch other sites. Run the faster business-rule tests with `node --test ../logic.test.js`.
