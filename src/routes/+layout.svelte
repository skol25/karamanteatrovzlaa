<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { rateFmt } from '#lib/format.ts';
	let { children, data } = $props();
	let open = $state(false);
	const isAdmin = $derived(page.url.pathname.startsWith('/admin'));
</script>

<svelte:head><title>Karamantea Teatro</title></svelte:head>

{#if data.demo}
	<div class="demo">Versión de demostración · los datos se reinician · panel: <a href="/admin">/admin</a> (clave <b>demo1234</b>)</div>
{/if}

<header class="top">
	<div class="wrap bar">
		<a href="/" class="brand" aria-label="Karamantea Teatro, inicio">
			<img src="/logo.png" alt="" width="44" height="44" />
			<span class="name"><span class="display">Karamantea</span><small>Teatro</small></span>
		</a>
		<nav class:open>
			{#if !isAdmin}
				<a href="/#cartelera" onclick={() => (open = false)}>Cartelera</a>
				<a href="/#funciones" onclick={() => (open = false)}>Funciones</a>
				<a href="/#historial" onclick={() => (open = false)}>Ya pasaron</a>
			{:else}
				<a href="/">Ver sitio</a>
			{/if}
		</nav>
		<div class="rate" title="Tasa oficial del Banco Central de Venezuela">
			{#if data.rate}
				<span class="dot"></span>BCV <b>{rateFmt(data.rate.rate)}</b>
			{:else}
				<span class="dot off"></span>Tasa BCV pendiente
			{/if}
		</div>
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
	.demo {
		background: var(--lime);
		color: var(--ink);
		text-align: center;
		font-size: 12px;
		font-weight: 700;
		padding: 7px 16px;
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
		border-bottom: 1px solid #ffffff0d;
	}
	.bar {
		display: flex;
		align-items: center;
		gap: 28px;
		height: 72px;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.name {
		display: grid;
		line-height: 1.1;
	}
	.name .display {
		font-size: 14px;
		letter-spacing: 0.22em;
	}
	.name small {
		font-size: 10px;
		letter-spacing: 0.5em;
		color: var(--lime);
		text-transform: uppercase;
		font-weight: 700;
	}
	nav {
		display: flex;
		gap: 26px;
		margin-left: auto;
		font-size: 14px;
		font-weight: 600;
		color: var(--mist);
	}
	nav a:hover {
		color: var(--lime);
	}
	.rate {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: var(--mist);
		border: 1px solid var(--line);
		padding: 7px 13px;
		border-radius: 999px;
		white-space: nowrap;
	}
	.rate b {
		color: var(--paper);
	}
	.dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--lime);
		box-shadow: 0 0 0 4px var(--lime-soft);
	}
	.dot.off {
		background: var(--danger);
		box-shadow: none;
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
		color: var(--lime);
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
			gap: 12px;
		}
		.rate {
			margin-left: auto;
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
		.name {
			display: none;
		}
	}
	@media (max-width: 380px) {
		.rate {
			font-size: 11px;
			padding: 6px 10px;
		}
	}
</style>
