import serverless from 'serverless-http';
import { createApp } from '../../server/app.mjs';
import { createMemoryStore } from '../../server/memory-store.mjs';

const store = createMemoryStore();
const app = createApp({ store, serveStatic: false });

export const handler = serverless(app);
