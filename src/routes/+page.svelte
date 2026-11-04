<script lang="ts">
	import Poster from '#lib/components/Poster.svelte';
	import Carousel from '#lib/components/Carousel.svelte';
	import { bs, dia, mes, diaSemana, hora, fechaLarga } from '#lib/format.ts';

	let { data } = $props();
	const m = $derived(data.main);
	const price = (usd: number | null) => (usd != null && data.rate ? bs(usd * data.rate.rate) : null);
	const year = (iso: string | null) => (iso ? new Date(iso).getFullYear() : '');
</script>

<svelte:head>
	<title>Karamantea Teatro · Cartelera</title>
	<meta name="description" content="Cartelera, funciones y venta de entradas de Karamantea Teatro, Caracas." />
</svelte:head>

{#if m}
	<section class="hero">
		<div class="masks" aria-hidden="true"></div>
		<div class="wrap hgrid">
			<div class="copy">
				<span class="eyebrow">Obra principal · En temporada</span>
				<h1 class="display">{m.title}</h1>
				<p class="tag">{m.tagline}</p>
				<div class="chips">
					<span class="chip">{m.genre}</span>
					<span class="chip">{m.duration_min} min</span>
					<span class="chip">{m.age_rating}</span>
				</div>
				<dl class="facts">
					<div><dt>Próxima función</dt><dd>{fechaLarga(m.next!)} · {hora(m.next!)}</dd></div>
					<div><dt>Sala</dt><dd>{m.venue}</dd></div>
					{#if price(m.minPrice)}<div><dt>Desde</dt><dd class="lime">{price(m.minPrice)}</dd></div>{/if}
				</dl>
				<div class="cta">
					<a class="btn btn-lime" href="/obra/{m.slug}#funciones">Comprar entradas</a>
					<a class="btn btn-ghost" href="/obra/{m.slug}">Ver detalle</a>
				</div>
			</div>
			<a class="hposter" href="/obra/{m.slug}" aria-label="Ver {m.title}">
				<Poster title={m.title} variant={m.variant} poster={m.poster} size="lg" />
			</a>
		</div>
	</section>
{:else}
	<section class="hero empty wrap">
		<span class="eyebrow">Próximamente</span>
		<h1 class="display">Muy pronto, nueva temporada</h1>
	</section>
{/if}

<div id="cartelera"></div>
{#if data.current.length}
	<Carousel label="En cartelera" eyebrow="Obras actuales">
		{#each data.current as s (s.id)}
			<a class="show" href="/obra/{s.slug}">
				<Poster title={s.title} variant={s.variant} poster={s.poster} />
				<div class="meta">
					<span class="when">Próxima: {diaSemana(s.next!)} {dia(s.next!)} {mes(s.next!)} · {s.upcoming} {s.upcoming === 1 ? 'función' : 'funciones'}</span>
					<span class="genre">{s.genre}</span>
				</div>
			</a>
		{/each}
	</Carousel>
{/if}

<div id="funciones"></div>
{#if data.upcomingPerfs.length}
	<div style="--item: 300px; --item-sm: 82%">
		<Carousel label="Funciones disponibles" eyebrow="Elige tu fecha">
			{#each data.upcomingPerfs as p (p.id)}
				<a class="perf card" href="/obra/{p.slug}?funcion={p.id}#funciones">
					<div class="date">
						<span class="dw">{diaSemana(p.starts_at)}</span>
						<span class="dd">{dia(p.starts_at)}</span>
						<span class="dm">{mes(p.starts_at)}</span>
					</div>
					<div class="pinfo">
						<span class="ptitle">{p.title}</span>
						<span class="pmeta">{hora(p.starts_at)} · {p.venue.split('·')[0]}</span>
						<span class="pfoot">
							{#if p.left <= 0}
								<span class="sold">Agotado</span>
							{:else}
								<span class="left" class:few={p.left <= 10}>{p.left} disponibles</span>
								{#if price(p.price_usd)}<b>{price(p.price_usd)}</b>{/if}
							{/if}
						</span>
					</div>
				</a>
			{/each}
		</Carousel>
	</div>
{/if}

<div id="historial"></div>
{#if data.past.length}
	<div style="--item: 200px; --item-sm: 55%">
		<Carousel label="Ya pasaron" eyebrow="Temporadas anteriores">
			{#each data.past as s (s.id)}
				<a class="show past" href="/obra/{s.slug}">
					<Poster title={s.title} variant={s.variant} poster={s.poster} past size="sm" />
					<div class="meta">
						<span class="when">Temporada {year(s.last)}</span>
						<span class="genre">{s.genre}</span>
					</div>
				</a>
			{/each}
		</Carousel>
	</div>
{/if}

<style>
	.hero {
		position: relative;
		overflow: hidden;
		padding: 64px 0 72px;
		border-bottom: 1px solid #ffffff0d;
	}
	.hero.empty {
		padding: 120px 0;
	}
	.masks {
		position: absolute;
		inset: 0;
		background: url('/masks.jpg') right -120px center / 900px no-repeat;
		opacity: 0.55;
		mask-image: linear-gradient(to left, #000 20%, transparent 85%);
		pointer-events: none;
	}
	.hgrid {
		position: relative;
		display: grid;
		grid-template-columns: 1.25fr 0.75fr;
		gap: 56px;
		align-items: center;
	}
	h1 {
		font-size: clamp(32px, 5.4vw, 64px);
		margin: 18px 0 14px;
		text-wrap: balance;
	}
	.tag {
		font-size: 19px;
		color: #cfcfcf;
		margin: 0 0 22px;
		max-width: 46ch;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.facts {
		display: flex;
		flex-wrap: wrap;
		gap: 14px 36px;
		margin: 30px 0 32px;
		padding: 20px 0;
		border-block: 1px solid var(--line);
	}
	.facts dt {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--mist);
	}
	.facts dd {
		margin: 4px 0 0;
		font-weight: 700;
		text-transform: capitalize;
	}
	.lime {
		color: var(--lime);
	}
	.cta {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}
	.hposter {
		position: relative;
		max-width: 380px;
		justify-self: end;
		width: 100%;
		transform: rotate(2deg);
		transition: transform 0.4s;
	}
	.hposter::before {
		content: '';
		position: absolute;
		inset: 14px -14px -14px 14px;
		border: 2px solid var(--lime);
		border-radius: 16px;
		z-index: -1;
	}
	.hposter:hover {
		transform: rotate(0);
	}

	.show {
		display: grid;
		gap: 12px;
	}
	.show :global(.poster) {
		transition:
			transform 0.3s,
			box-shadow 0.3s;
	}
	.show:hover :global(.poster) {
		transform: translateY(-4px);
		box-shadow:
			0 0 0 2px var(--lime),
			0 18px 40px #0008;
	}
	.meta {
		display: grid;
		gap: 2px;
		font-size: 13px;
	}
	.when {
		font-weight: 700;
		text-transform: capitalize;
	}
	.genre {
		color: var(--mist);
	}
	.past .when {
		color: var(--mist);
	}

	.perf {
		display: flex;
		gap: 16px;
		padding: 16px;
		transition: border-color 0.2s;
	}
	.perf:hover {
		border-color: var(--lime);
	}
	.date {
		display: grid;
		place-items: center;
		align-content: center;
		width: 72px;
		flex: none;
		border-radius: 12px;
		background: var(--ink);
		border: 1px solid var(--line);
		padding: 10px 0;
		text-transform: uppercase;
	}
	.dw,
	.dm {
		font-size: 10px;
		letter-spacing: 0.2em;
		color: var(--mist);
	}
	.dd {
		font-family: var(--display);
		font-size: 26px;
		color: var(--lime);
		line-height: 1.3;
	}
	.pinfo {
		display: grid;
		gap: 4px;
		align-content: center;
		min-width: 0;
	}
	.ptitle {
		font-weight: 800;
		line-height: 1.25;
	}
	.pmeta {
		font-size: 13px;
		color: var(--mist);
	}
	.pfoot {
		display: flex;
		gap: 10px;
		align-items: center;
		font-size: 13px;
		margin-top: 4px;
		flex-wrap: wrap;
	}
	.left {
		color: var(--mist);
	}
	.left.few {
		color: #ffb547;
	}
	.sold {
		color: var(--danger);
		font-weight: 700;
	}

	@media (max-width: 860px) {
		.hgrid {
			grid-template-columns: 1fr;
		}
		.hposter {
			order: -1;
			max-width: 240px;
			justify-self: start;
		}
		.masks {
			background-size: 600px;
			background-position: right -200px top;
		}
	}
</style>
