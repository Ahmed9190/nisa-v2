import { createApp } from './app.mjs';
import { createSqliteStore } from './sqlite-store.mjs';

const PORT = Number(process.env.PORT || 8080);
const store = createSqliteStore();
const app = createApp({ store, serveStatic: true });

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Nisa backend listening on http://127.0.0.1:${PORT}`);
});
