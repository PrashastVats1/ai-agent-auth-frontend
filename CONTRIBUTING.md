# Contributing

Thanks for helping. Issues and pull requests are welcome.

## Set up

```bash
npm install
cp .env.example .env    # then fill it in; see the README
npm run dev
```

The dashboard needs the [backend](https://github.com/PrashastVats1/ai-agent-auth-backend) running and a MonoCloud application to sign in with.

## Before you open a PR

Run `npm run build`. It type-checks with `tsc` and then builds with Vite, and it's what CI runs.

## Rules the code depends on

- **All API calls go through `apiFetch()`** in `src/api.ts`. Never attach the access token anywhere else.
- **Poll every 4 seconds, not faster.** The backend's database is on a free tier with a small connection limit.
- Every environment variable belongs in `.env.example`, and none of them may be a secret: Vite bakes them into the public bundle.

To report a security problem, please don't open an issue. See [SECURITY.md](SECURITY.md).
