# Deploy Rheo at rheocracy.org with Render

Rheo is a Node web service, not a static GitHub Pages site. The browser UI is served by `server.mjs`, and AI requests go through `/api/analyze` so the OpenAI API key stays server-side.

## 1. Create the Render service

Use the repository Blueprint file `render.yaml` from branch `v0.3.1-evaluation-ui-repair`.

In Render:

1. Create a new Blueprint from `iwanbrioc/rheo-alignment-lab`.
2. Choose branch `v0.3.1-evaluation-ui-repair` if prompted.
3. Render will create the `rheo` Node web service.
4. When prompted for `OPENAI_API_KEY`, enter a newly created API key. Never commit the key to GitHub.
5. Confirm `RHEO_MODEL_PROVIDER=openai` and `OPENAI_MODEL=gpt-5.6`.
6. Wait for the first deploy to pass `/api/health`.
7. Open the temporary `*.onrender.com` address and confirm the Rheo UI loads and a test AI review works before changing DNS.

The Blueprint uses the free instance for the prototype. A free service can have cold-start/availability limitations; move to a paid instance before relying on Rheo for production availability.

## 2. Connect rheocracy.org

The Blueprint declares `rheocracy.org` as the custom domain. In Render, open the `rheo` service → Settings → Custom Domains and follow the DNS values Render shows.

For a typical DNS provider:

- Root/apex `rheocracy.org`: use the ALIAS/ANAME/CNAME-flattening target Render gives you. If your provider does not support those, Render currently documents an A record to `216.24.57.1`.
- `www.rheocracy.org`: CNAME to the service's `*.onrender.com` hostname.
- Remove conflicting old GitHub Pages records and redirects for `@` and `www`.
- Remove conflicting AAAA records while configuring Render, because Render currently routes custom domains over IPv4.
- Return to Render and click Verify.

Do not change MX/TXT records used for email or domain verification unless they specifically conflict with the web-host records.

## 3. Verify the live app

After DNS and TLS verification:

- `https://rheocracy.org/` should show **Tell Rheo what’s going on**.
- `https://rheocracy.org/api/health` should return JSON with `ok: true`, provider `openai`, and `modelConfigured: true`.
- Run one non-sensitive test case through **Ask Rheo to review this**.
- Confirm no API key appears in browser source, network request bodies, or downloaded case files.

## 4. Deployment behaviour

The service uses:

- `npm install` to build;
- `npm start` to run `server.mjs`;
- Render's `PORT` environment variable;
- `/api/health` for health checks;
- deploy-on-passing-checks from the configured Git branch.

The OpenAI secret is declared with `sync: false`, so its value is supplied only in Render and is not stored in `render.yaml`.

## 5. Before production use

The current branch remains a research prototype. Before treating the public deployment as production, consider moving off the free instance, adding basic abuse/rate limiting to `/api/analyze`, adding a privacy notice appropriate to actual server/API processing, and deciding whether public users should see the research-condition controls at all.
