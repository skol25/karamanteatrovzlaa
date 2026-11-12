<script lang="ts">
	import { page } from '$app/state';
	import Poster from '#lib/components/Poster.svelte';
	import { dia, mes, diaSemana, hora, fechaLarga } from '#lib/format.ts';
	import { parseMap } from '#lib/seatmap.ts';

	let { data } = $props();
	const s = $derived(data.show);
	const upcoming = $derived(data.perfs.filter((p) => !p.past));
	const isPast = $derived(upcoming.length === 0);

	const initial = Number(page.url.searchParams.get('funcion'));
	let selectedId = $state<number | null>(null);
	$effect.pre(() => {
		if (selectedId == null) {
			const pre = upcoming.find((p) => p.id === initial && p.state === 'open') ?? upcoming.find((p) => p.state === 'open');
			selectedId = pre?.id ?? null;
		}
	});
	const selected = $derived(upcoming.find((p) => p.id === selectedId) ?? null);
	let qty = $state(2);
	const maxQty = $derived(selected ? Math.min(data.maxTickets, selected.left) : 1);
	$effect(() => {
		if (qty > maxQty) qty = Math.max(1, maxQty);
	});

	const rate = $derived(data.rate?.rate ?? null);
</script>

<svelte:head>
	<title>{s.title} · Karamantea Teatro</title>
	<meta name="description" content={s.tagline} />
</svelte:head>

<article class="wrap detail">
	<a href="/" class="back">← Cartelera</a>
	<div class="top">
		<div class="pwrap"><Poster title={s.title} variant={s.variant} poster={s.poster} past={isPast} size="lg" /></div>
		<div class="info">
			<span class="eyebrow">{isPast ? 'Evento realizado' : 'En cartelera'}</span>
			<h1 class="display">{s.title}</h1>
			<p class="tag">{s.tagline}</p>
			<div class="chips">
				{#if s.genre}<span class="chip">{s.genre}</span>{/if}
				{#if s.duration_min}<span class="chip">{s.duration_min} min</span>{/if}
				{#if s.age_rating}<span class="chip">{s.age_rating}</span>{/if}
			</div>
			<p class="syn">{s.synopsis}</p>
			<dl class="credits">
				{#if s.director}<div><dt>Escrita y dirigida por</dt><dd>{s.director.replace(/^Dirección:\s*/, '')}</dd></div>{/if}
				{#if s.cast_list}<div><dt>Elenco</dt><dd>{s.cast_list}</dd></div>{/if}
			</dl>
		</div>
	</div>

	<section id="funciones" class="funcs">
		{#if isPast}
			<span class="eyebrow">Nuestra trayectoria</span>
			<h2 class="display">Funciones realizadas</h2>
			<ul class="pastlist">
				{#each data.perfs as p (p.id)}
					<li>{new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(p.starts_at))} — {p.venue}</li>
				{/each}
			</ul>
			<p class="muted">Por ahora no hay nuevas funciones de esta obra. Revisa los <a class="lnk" href="/#funciones">próximos eventos</a>.</p>
		{:else}
			<span class="eyebrow">Paso 1 de 3</span>
			<h2 class="display">Elige tu función</h2>
			<div class="fgrid">
				<div class="list" role="radiogroup" aria-label="Funciones">
					{#each upcoming as p (p.id)}
						<button
							class="perf"
							class:on={p.id === selectedId}
							role="radio"
							aria-checked={p.id === selectedId}
							disabled={p.state !== 'open'}
							onclick={() => (selectedId = p.id)}
						>
							<span class="date">
								<span class="dw">{diaSemana(p.starts_at)}</span>
								<span class="dd">{dia(p.starts_at)}</span>
								<span class="dm">{mes(p.starts_at)}</span>
							</span>
							<span class="pi">
								<b>{hora(p.starts_at)}</b>
								<span>{p.venue}</span>
								<small class:few={p.state === 'open' && p.left <= 10} class:off={p.state !== 'open'}>{p.state === 'soldout' ? 'Agotado' : p.state === 'closed' ? 'Ventas cerradas' : `${p.left} de ${p.capacity} puestos disponibles`}</small>
							</span>
						</button>
					{/each}
				</div>

				{#if selected}
					<aside class="box card">
						<h3>{fechaLarga(selected.starts_at)}</h3>
						<p class="when">{hora(selected.starts_at)}{s.duration_min ? ` · Duración ${s.duration_min} min` : ''}</p>
						<div class="loc">
							<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
							<div>
								<b>{selected.venue}</b>
								<span>{selected.address}</span>
								{#if selected.maps_url}<a class="lnk" href={selected.maps_url} target="_blank" rel="noopener">Ver en el mapa ↗</a>{/if}
							</div>
						</div>

						{#if selected.layout}
							{@const zs = parseMap(selected.layout)?.zones ?? []}
							<div class="zones">
								<span>Mesas de {zs.map((z) => z.name).join(', ')}</span>
								<small>Puedes elegir puestos sueltos o la mesa completa.</small>
							</div>
						{:else}
						<div class="qty">
							<span>Entradas</span>
							<div class="stepper">
								<button onclick={() => (qty = Math.max(1, qty - 1))} disabled={qty <= 1} aria-label="Menos">−</button>
								<output aria-live="polite">{qty}</output>
								<button onclick={() => (qty = Math.min(maxQty, qty + 1))} disabled={qty >= maxQty} aria-label="Más">+</button>
							</div>
						</div>
						{/if}

						<div class="sum">
							<small>El monto en bolívares se calcula cuando apartas tus asientos, con la tasa BCV del momento. Esa cotización es válida por tiempo limitado.</small>
						</div>

						{#if rate}
							<a class="btn btn-lime full" href="/funcion/{selected.id}?n={qty}">{selected.layout ? 'Elegir puestos' : 'Elegir asientos'}</a>
						{:else}
							<p class="warn">Aún no está disponible la tasa BCV de hoy. La venta se habilitará en unos minutos.</p>
						{/if}
					</aside>
				{:else}
					<aside class="box card"><p class="muted">{upcoming.every((p) => p.state === 'soldout') ? '¡Todas las funciones están agotadas!' : 'Las ventas de estas funciones están cerradas por ahora.'}</p></aside>
				{/if}
			</div>
		{/if}
	</section>
</article>

<style>
	.detail {
		position: relative;
		padding-top: 28px;
	}
	.pwrap {
		padding: 12px;
		border: 1px solid var(--line);
		background: var(--ink-2);
		align-self: start;
	}
	.pwrap :global(.poster) {
		border-radius: 0;
	}
	.back {
		font-size: 14px;
		color: var(--mist);
		font-weight: 600;
	}
	.back:hover {
		color: var(--accent);
	}
	.top {
		display: grid;
		grid-template-columns: 340px 1fr;
		gap: 56px;
		margin-top: 24px;
		align-items: start;
	}
	h1 {
		font-size: clamp(28px, 4vw, 48px);
		margin: 14px 0 10px;
	}
	.tag {
		font-size: 18px;
		color: var(--text-2);
		margin: 0 0 18px;
	}
	.chips {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.syn {
		font-size: 17px;
		line-height: 1.75;
		color: var(--text-2);
		max-width: 62ch;
		margin: 26px 0;
	}
	.credits {
		display: grid;
		gap: 14px;
		margin: 0;
		padding-top: 22px;
		border-top: 1px solid var(--line);
	}
	.credits dt {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--mist);
	}
	.credits dd {
		margin: 3px 0 0;
		font-weight: 600;
	}
	.funcs {
		margin-top: 72px;
		scroll-margin-top: 90px;
	}
	h2 {
		font-size: clamp(20px, 3vw, 30px);
		margin: 8px 0 26px;
	}
	.fgrid {
		display: grid;
		grid-template-columns: 1fr 380px;
		gap: 28px;
		align-items: start;
	}
	.list {
		display: grid;
		gap: 12px;
	}
	.perf {
		display: flex;
		gap: 16px;
		align-items: center;
		text-align: left;
		width: 100%;
		padding: 14px;
		background: var(--ink-2);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		cursor: pointer;
		transition: 0.2s;
	}
	.perf:hover:not(:disabled) {
		border-color: #555;
	}
	.perf.on {
		border-color: var(--accent);
		background: linear-gradient(90deg, var(--lime-soft), var(--ink-2) 60%);
	}
	.perf:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.date {
		display: grid;
		place-items: center;
		width: 64px;
		flex: none;
		padding: 8px 0;
		border-radius: 12px;
		background: var(--ink);
		border: 1px solid var(--line);
		text-transform: uppercase;
	}
	.on .date {
		background: var(--lime);
		border-color: var(--accent);
		color: var(--on-accent);
	}
	.dw,
	.dm {
		font-size: 10px;
		letter-spacing: 0.2em;
		opacity: 0.75;
	}
	.dd {
		font-family: var(--display);
		font-size: 22px;
		line-height: 1.3;
	}
	.pi {
		display: grid;
		gap: 2px;
		flex: 1;
		min-width: 0;
	}
	.pi span {
		font-size: 14px;
		color: var(--text-2);
	}
	.pi small {
		font-size: 12px;
		color: var(--mist);
	}
	.pi small.off {
		color: var(--danger);
		font-weight: 700;
	}
	.pi small.few {
		color: var(--warn);
	}
	.box {
		padding: 24px;
		position: sticky;
		top: 92px;
		display: grid;
		gap: 18px;
	}
	.box h3 {
		margin: 0;
		font-size: 20px;
		text-transform: capitalize;
	}
	.when {
		margin: -12px 0 0;
		color: var(--mist);
		font-size: 14px;
	}
	.loc {
		display: flex;
		gap: 12px;
		color: var(--accent);
	}
	.loc div {
		display: grid;
		gap: 2px;
		font-size: 14px;
		color: var(--paper);
	}
	.loc span {
		color: var(--mist);
	}
	.lnk {
		color: var(--accent);
		font-weight: 700;
		font-size: 13px;
	}
	.zones {
		display: grid;
		gap: 4px;
		padding: 14px 0;
		border-block: 1px solid var(--line);
		font-weight: 700;
	}
	.zones small {
		font-weight: 400;
		color: var(--mist);
		font-size: 13px;
	}
	.qty {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 14px 0;
		border-block: 1px solid var(--line);
		font-weight: 700;
	}
	.stepper {
		display: flex;
		align-items: center;
		gap: 4px;
		background: var(--ink);
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 4px;
	}
	.stepper button {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 0;
		background: var(--ink-3);
		font-size: 20px;
		cursor: pointer;
	}
	.stepper button:hover:not(:disabled) {
		background: var(--lime);
		color: var(--on-accent);
	}
	.stepper button:disabled {
		opacity: 0.3;
	}
	.stepper output {
		min-width: 34px;
		text-align: center;
		font-family: var(--display);
	}
	.sum {
		display: grid;
		gap: 8px;
		font-size: 14px;
	}
	.sum small {
		color: var(--mist);
		font-size: 12px;
	}
	.full {
		width: 100%;
	}
	.warn {
		color: var(--warn);
		font-size: 14px;
		margin: 0;
	}
	.muted {
		color: var(--mist);
	}
	.pastlist {
		color: var(--text-2);
		text-transform: capitalize;
		line-height: 2;
	}
	@media (max-width: 960px) {
		.top,
		.fgrid {
			grid-template-columns: 1fr;
		}
		.pwrap {
			max-width: 260px;
		}
		.box {
			position: static;
		}
	}
	@media (max-width: 520px) {
		.perf {
			flex-wrap: wrap;
		}
	}
</style>
