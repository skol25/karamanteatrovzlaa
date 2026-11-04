import nodeAdapter from '@sveltejs/adapter-node';
import vercelAdapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// En Vercel se usa su adaptador; en cualquier otro lado (Namecheap/cPanel, VPS) un servidor Node normal.
const onVercel = !!process.env.VERCEL;

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: onVercel ? vercelAdapter({ runtime: 'nodejs22.x', regions: ['iad1'] }) : nodeAdapter()
		})
	]
});
