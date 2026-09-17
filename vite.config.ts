import { defineConfig } from 'vite';

// Served from https://<user>.github.io/evalbench/ by the Pages deploy workflow,
// so asset URLs need the repo name as a base path in production.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/evalbench/' : '/',
});
