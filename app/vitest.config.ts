import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'engine', root: 'packages/engine', environment: 'node' } },
      { test: { name: 'protocol', root: 'packages/protocol', environment: 'node' } },
      { test: { name: 'server', root: 'packages/server', environment: 'node' } },
      {
        plugins: [react()],
        test: { name: 'client', root: 'packages/client', environment: 'jsdom' },
      },
    ],
  },
});
