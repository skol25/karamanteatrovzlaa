<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	let { children, data } = $props();
	let open = $state(false);
	const isAdmin = $derived(page.url.pathname.startsWith('/admin'));
</script>

<svelte:head><title>Karamantea Teatro</title></svelte:head>

{#if data.demo}
	<div class="demo"><span class="dot"></span>Versión de demostración · los datos se reinician · Panel: <a href="/admin">/admin</a> · clave <b>demo1234</b></div>
{/if}

<header class="top">
	<div class="wrap bar">
		<nav class:open>
			{#if !isAdmin}
				<a href="/#funciones" onclick={() => (open = false)}>Cartelera</a>
				<a href="/#trayectoria" onclick={() => (open = false)}>Trayectoria</a>
				<a class="only-m" href="https://wa.me/584249392784" target="_blank" rel="noopener" onclick={() => (open = false)}>Contacto</a>
			{:else}
				<a href="/">Ver sitio</a>
			{/if}
		</nav>
		<a href="/" class="brand" aria-label="Karamantea Teatro, inicio">
			<img src="/logo.png" alt="" width="40" height="40" />
			<span class="name">Karamantea</span>
		</a>
		<a class="contact" href="https://wa.me/584249392784" target="_blank" rel="noopener">Contacto</a>
		<button class="burger" onclick={() => (open = !open)} aria-label="Menú" aria-expanded={open}>
			<span></span><span></span>
		</button>
	</div>
</header>

<main>{@render children()}</main>

<footer class="foot">
	<div class="wrap fgrid">
		<div class="fbrand">
			<img src="/logo.png" alt="Karamantea Teatro" width="88" height="88" />
			<p>Karamantea Group Producciones.<br />Dos rostros, una misma escena.</p>
		</div>
		<div>
			<span class="eyebrow">Síguenos</span>
			<a class="ig" href="https://instagram.com/karamanteatrovzla" target="_blank" rel="noopener">
				<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
				@karamanteatrovzla
			</a>
			<a class="ig" href="https://wa.me/584249392784" target="_blank" rel="noopener">
				<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg>
				Taquilla: 0424 939 27 84
			</a>
		</div>
		<div class="legal">
			<span class="eyebrow">Pagos</span>
			<p>Todos los montos se cobran en bolívares a la tasa oficial BCV del día. Las cotizaciones vencen a los 20 minutos o cuando cambia la tasa.</p>
			<p class="rif">Karamantea Teatro · RIF J-40722213-9</p>
		</div>
	</div>
</footer>

<style>
	main {
		position: relative;
		isolation: isolate;
	}
	.demo {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		background: var(--ink-3);
		border-bottom: 1px solid var(--line);
		color: var(--mist);
		text-align: center;
		font-size: 12px;
		padding: 7px 16px;
	}
	.demo b,
	.demo a {
		color: var(--paper);
	}
	.demo a {
		text-decoration: underline;
	}
	.top {
		position: sticky;
		top: 0;
		z-index: 50;
		background: color-mix(in srgb, var(--ink) 82%, transparent);
		backdrop-filter: blur(14px);
		border-bottom: 1px solid var(--line);
	}
	.bar {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 28px;
		height: 76px;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 12px;
		justify-self: center;
	}
	.name {
		font-family: var(--display);
		font-size: 24px;
		letter-spacing: 0.01em;
	}
	nav {
		display: flex;
		gap: 30px;
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--mist);
	}
	nav a:hover,
	.contact:hover {
		color: var(--paper);
	}
	.only-m {
		display: none;
	}
	.contact {
		justify-self: end;
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		border: 1px solid var(--paper);
		padding: 10px 18px;
		border-radius: 2px;
	}
	.contact:hover {
		background: var(--paper);
		color: var(--ink);
	}
	.dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--lime);
		box-shadow: 0 0 0 4px var(--lime-soft);
	}
	.burger {
		display: none;
		background: none;
		border: 0;
		width: 40px;
		height: 40px;
		cursor: pointer;
		flex-direction: column;
		justify-content: center;
		gap: 7px;
		padding: 8px;
	}
	.burger span {
		height: 2px;
		background: var(--paper);
		border-radius: 2px;
	}
	.burger span:last-child {
		width: 60%;
		background: var(--lime);
		align-self: flex-end;
	}
	.foot {
		margin-top: 100px;
		border-top: 1px solid var(--line);
		background: var(--ink-2);
		padding: 56px 0 40px;
	}
	.fgrid {
		display: grid;
		grid-template-columns: 1.2fr 1fr 1.4fr;
		gap: 40px;
	}
	.fbrand {
		display: flex;
		gap: 18px;
		align-items: center;
	}
	.fbrand p {
		margin: 0;
		color: var(--mist);
		font-size: 14px;
	}
	.ig {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 14px;
		font-weight: 700;
	}
	.ig:hover {
		color: var(--accent);
	}
	.legal p {
		color: var(--mist);
		font-size: 13px;
		margin: 12px 0 0;
	}
	.legal .rif {
		color: var(--stone);
	}
	@media (max-width: 860px) {
		.bar {
			display: flex;
			gap: 12px;
		}
		.contact {
			display: none;
		}
		.only-m {
			display: block;
		}
		.brand {
			margin-right: auto;
		}
		.burger {
			display: flex;
		}
		nav {
			display: none;
			position: absolute;
			top: 72px;
			left: 0;
			right: 0;
			flex-direction: column;
			gap: 0;
			background: var(--ink);
			border-bottom: 1px solid var(--line);
			margin: 0;
		}
		nav.open {
			display: flex;
		}
		nav a {
			padding: 16px;
			border-top: 1px solid var(--line);
		}
		.fgrid {
			grid-template-columns: 1fr;
		}
	}
</style>
