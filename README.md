# AI Agent Auth — Dashboard

The web dashboard for an AI-agent identity and delegation system. React + Vite + Tailwind, signing users in through MonoCloud.

## The problem

When an AI agent acts on behalf of a user, the agent's identity disappears. Your API logs say *"Alice deleted the orders table"* — not *"Agent X did it on Alice's behalf, at 14:32, after Alice approved it."* There is no consent step, no audit trail that separates user actions from agent actions, and the agent silently inherits everything the user is allowed to do.

The [backend](https://github.com/PrashastVats1/ai-agent-auth-backend) issues agents their own short-lived, scoped tokens, gates destructive actions behind user consent, and enforces per-agent policy. **This dashboard is where the human side happens**: you register agents, set what each one may do, approve or deny its consent requests, and read the audit trail. Read the backend README first for the full picture and the architecture.

## What the dashboard does

| Section | What you do |
|---|---|
| **Agents** | Register an agent by name and its MonoCloud M2M client ID; delete agents. |
| **Policies** | Per agent: allowed endpoints, allowed methods, allowed days, and an IST time window. **An agent with no policy is blocked.** |
| **Pending consent** | Approve or deny requests an agent has made for destructive scopes (`delete:`, `write:`, `admin:`). Refreshes every **4 seconds**. |
| **Audit log** | Every allowed and rejected agent call, plus consent requests, approvals, denials, expiries and token issuances, with the agent's name, the endpoint and the consent status. Refreshes every **4 seconds**. |

Policy field formats: comma-separated lists for endpoints, methods and days (e.g. `/api/orders/*`, `GET, POST`, `monday, tuesday`); time pickers for the window. Leave a field empty for no restriction on it. Endpoints can end with `*` to match a prefix. Times are IST, and a window like 22:00–06:00 crosses midnight. If the backend rejects a policy, the reason is shown above the form.

## How sign-in works

1. **Sign in** redirects to MonoCloud (Authorization Code flow with PKCE, via [`oidc-client-ts`](https://github.com/authts/oidc-client-ts)).
2. MonoCloud sends the user back to `/callback`, which completes the login and calls `POST /api/users/sync` once, creating the user's row in the database on first login.
3. Every API call goes through `apiFetch()` in `src/api.ts`, which attaches the user's MonoCloud access token. Don't attach tokens anywhere else.

MonoCloud's React SDK isn't released yet, which is why this uses `oidc-client-ts` directly.

## Local setup

**Prerequisites:** Node.js 20+, the [backend](https://github.com/PrashastVats1/ai-agent-auth-backend) running (see its README for the Neon and MonoCloud setup), and a MonoCloud application for the dashboard.

In MonoCloud, create an application using **Authorization Code flow with PKCE**, and allow:

- redirect URI `http://localhost:5173/callback` (plus your Vercel URL after deploying)
- your app's origin as a post-logout redirect (sign-out returns to `window.location.origin`)

Then:

```bash
git clone https://github.com/PrashastVats1/ai-agent-auth-frontend.git
cd ai-agent-auth-frontend
npm install
cp .env.example .env      # then fill it in
npm run dev
```

The app is at <http://localhost:5173>.

| Variable | Description |
|---|---|
| `VITE_MONOCLOUD_ISSUER_URL` | Your MonoCloud tenant URL. Same value as the backend's `MONOCLOUD_ISSUER_URL`. |
| `VITE_MONOCLOUD_CLIENT_ID` | Client ID of the dashboard's Authorization Code application |
| `VITE_API_URL` | Backend URL, `http://localhost:8000` locally |
| `VITE_MONOCLOUD_REDIRECT_URI` | `http://localhost:5173/callback` locally |

Vite bakes these into the bundle at build time. They are visible to anyone using the site, so never put secrets in them. None of these values is a secret.

## Deploy to Vercel (free tier)

1. Import this repo into Vercel. Framework preset: **Vite**.
2. Add the four environment variables above. Use your backend's public URL for `VITE_API_URL` and `https://<your-vercel-domain>/callback` for `VITE_MONOCLOUD_REDIRECT_URI`.
3. In MonoCloud, add that Vercel redirect URI and post-logout origin to the dashboard application.
4. Add your Vercel URL to `CORS_ALLOWED_ORIGINS` in the **backend's** environment (on Render, in its dashboard), otherwise the browser blocks every API call (CORS).

`vercel.json` already rewrites all routes to `index.html`, so `/callback` works after a redirect.

> **The first load can be slow.** If the backend is on Render's free tier, it sleeps after 15 minutes idle and takes 30–50 seconds to wake. The dashboard will look empty until it does. This is expected, not a bug.

## Project layout

```
src/
  auth.ts            oidc-client-ts UserManager config
  api.ts             apiFetch(): the only place the bearer token is attached
  hooks/useAuth.ts   user state, login/logout, first-login user sync
  hooks/usePoll.ts   interval hook (used for the 4-second polling)
  pages/Callback.tsx completes the OIDC redirect
  pages/Dashboard.tsx the four dashboard sections
```

Scripts: `npm run dev`, `npm run build` (type-checks, then builds), `npm run preview`.

## Known limitations

- Endpoint, method and day lists are plain comma-separated text; validation happens in the backend and its message is shown on save.
- The audit log has no filtering or pagination controls; it shows the latest 50 entries.
- No automated tests yet. CI type-checks and builds on every push and pull request.

Issues and pull requests are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md). To report a vulnerability, see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
