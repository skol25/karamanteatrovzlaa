<script lang="ts">
	import { page } from '$app/state';
	import Poster from '#lib/components/Poster.svelte';
	import { bs, usd, dia, mes, diaSemana, hora, fechaLarga } from '#lib/format.ts';

	let { data } = $props();
	const s = $derived(data.show);
	const upcoming = $derived(data.perfs.filter((p) => !p.past));
	const isPast = $derived(upcoming.length === 0);

	const initial = Number(page.url.searchParams.get('funcion'));
	let selectedId = $state<number | null>(null);
	$effect.pre(() => {
		if (selectedId == null) {
			const pre = upcoming.find((p) => p.id === initial && p.left > 0) ?? upcoming.find((p) => p.left > 0);
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
	const unitBs = $derived(selected && rate ? selected.price_usd * rate : null);
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
			<span class="eyebrow">{isPast ? 'Temporada finalizada' : 'En cartelera'}</span>
			<h1 class="display">{s.title}</h1>
			<p class="tag">{s.tagline}</p>
			<div class="chips">
				<span class="chip">{s.genre}</span>
				<span class="chip">{s.duration_min} min</span>
				<span class="chip">{s.age_rating}</span>
			</div>
			<p class="syn">{s.synopsis}</p>
			<dl class="credits">
				{#if s.director}<div><dt>Dirección</dt><dd>{s.director.replace(/^Dirección:\s*/, '')}</dd></div>{/if}
				{#if s.cast_list}<div><dt>Elenco</dt><dd>{s.cast_list}</dd></div>{/if}
			</dl>
		</div>
	</div>

	<section id="funciones" class="funcs">
		{#if isPast}
			<span class="eyebrow">Historial</span>
			<h2 class="display">Funciones realizadas</h2>
			<ul class="pastlist">
				{#each data.perfs as p (p.id)}
					<li>{fechaLarga(p.starts_at)} · {hora(p.starts_at)} — {p.venue}</li>
				{/each}
			</ul>
			<p class="muted">Esta obra ya no tiene funciones disponibles. Revisa la <a class="lnk" href="/#cartelera">cartelera actual</a>.</p>
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
							disabled={p.left <= 0}
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
								<small class:few={p.left > 0 && p.left <= 10}>{p.left <= 0 ? 'Agotado' : `${p.left} de ${p.capacity} asientos disponibles`}</small>
							</span>
							<span class="pp">{rate ? bs(p.price_usd * rate) : usd(p.price_usd)}</span>
						</button>
					{/each}
				</div>

				{#if selected}
					<aside class="box card">
						<h3>{fechaLarga(selected.starts_at)}</h3>
						<p class="when">{hora(selected.starts_at)} · Duración {s.duration_min} min</p>
						<div class="loc">
							<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
							<div>
								<b>{selected.venue}</b>
								<span>{selected.address}</span>
								{#if selected.maps_url}<a class="lnk" href={selected.maps_url} target="_blank" rel="noopener">Ver en el mapa ↗</a>{/if}
							</div>
						</div>

						<div class="qty">
							<span>Entradas</span>
							<div class="stepper">
								<button onclick={() => (qty = Math.max(1, qty - 1))} disabled={qty <= 1} aria-label="Menos">−</button>
								<output aria-live="polite">{qty}</output>
								<button onclick={() => (qty = Math.min(maxQty, qty + 1))} disabled={qty >= maxQty} aria-label="Más">+</button>
							</div>
						</div>

						<div class="sum">
							<div><span>Precio por entrada</span><span>{unitBs != null ? bs(unitBs) : '—'}</span></div>
							<div class="total"><span>Total estimado</span><b>{unitBs != null ? bs(unitBs * qty) : '—'}</b></div>
							<small>Ref. {usd(selected.price_usd * qty)} · Tasa BCV del día. El monto final se fija al reservar los asientos.</small>
						</div>

						{#if rate}
							<a class="btn btn-lime full" href="/funcion/{selected.id}?n={qty}">Elegir asientos</a>
						{:else}
							<p class="warn">Aún no está disponible la tasa BCV de hoy. La venta se habilitará en unos minutos.</p>
						{/if}
					</aside>
				{:else}
					<aside class="box card"><p class="muted">Todas las funciones están agotadas.</p></aside>
				{/if}
			</div>
		{/if}
	</section>
</article>

<style>
	.detail {
		padding-top: 28px;
	}
	.back {
		font-size: 14px;
		color: var(--mist);
		font-weight: 600;
	}
	.back:hover {
		color: var(--lime);
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
		color: #cfcfcf;
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
		color: #dedede;
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
		border-color: var(--lime);
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
		border-color: var(--lime);
		color: var(--ink);
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
		color: #cfcfcf;
	}
	.pi small {
		font-size: 12px;
		color: var(--mist);
	}
	.pi small.few {
		color: #ffb547;
	}
	.pp {
		font-weight: 800;
		white-space: nowrap;
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
		color: var(--lime);
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
		color: var(--lime);
		font-weight: 700;
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
		color: var(--ink);
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
	.sum div {
		display: flex;
		justify-content: space-between;
		gap: 10px;
	}
	.sum .total {
		font-size: 17px;
	}
	.sum .total b {
		color: var(--lime);
	}
	.sum small {
		color: var(--mist);
		font-size: 12px;
	}
	.full {
		width: 100%;
	}
	.warn {
		color: #ffb547;
		font-size: 14px;
		margin: 0;
	}
	.muted {
		color: var(--mist);
	}
	.pastlist {
		color: #cfcfcf;
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
		.pp {
			width: 100%;
			text-align: right;
		}
	}
</style>
