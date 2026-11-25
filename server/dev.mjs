import { spawn } from 'node:child_process';

const procs = [
  spawn('node', ['server/index.mjs'], { stdio: 'inherit', env: process.env }),
  spawn('npx', ['vite', '--host', '0.0.0.0', '--port', '5173'], {
    stdio: 'inherit',
    env: process.env,
  }),
];

function shutdown(code = 0) {
  for (const p of procs) {
    if (!p.killed) p.kill('SIGTERM');
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

for (const p of procs) {
  p.on('exit', (code) => {
    if (code && code !== 0) shutdown(code);
  });
}
