# Nisa Modest Wear — Storefront, Admin Panel & Backend

Full-stack storefront replication with an out-of-the-box Admin Panel (`/admin`), public data collector, local SQLite backend, and Netlify Functions support.

## Local Development

```bash
npm install
npm run dev
```

* Storefront: `http://localhost:5173/`
* Admin Panel: `http://localhost:5173/admin` (default credentials: `admin@nisamodestwear.local` / `nisa-admin-2026`)
* Express API: `http://localhost:8080/api/health`

To re-collect fresh public data and images from the live site:

```bash
npm run collect
```

## Deploying to Netlify

This project is pre-configured via `netlify.toml`, `public/_redirects`, and `netlify/functions/api.mjs`:

1. **Git Deploy (Recommended):** Push this folder to GitHub/GitLab/Bitbucket and import it in Netlify. Build command (`npm run build`), publish directory (`dist`), and functions directory (`netlify/functions`) are detected automatically from `netlify.toml`.
2. **Netlify CLI Deploy:**
   ```bash
   npx netlify-cli login
   npx netlify-cli deploy --build --prod
   ```

> **Note on Netlify serverless persistence:** Locally (`npm run dev` / `npm start`), data is stored persistently in SQLite (`server/data/nisa.db`). On Netlify Functions, the API uses `server/memory-store.mjs` seeded from `server/data/collected-snapshot.json` and writes mutations to `/tmp/nisa-netlify-store.json` (which persists across warm function invocations and resets on cold starts). For durable cloud database writes across cold starts, swap `createMemoryStore()` in `netlify/functions/api.mjs` for an external database such as Turso/LibSQL or Neon Postgres.
