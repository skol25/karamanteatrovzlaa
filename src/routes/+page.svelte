<script lang="ts">
	import Poster from '#lib/components/Poster.svelte';
	import Carousel from '#lib/components/Carousel.svelte';
	import { bs, dia, mes, diaSemana, hora, fechaLarga } from '#lib/format.ts';

	let { data } = $props();
	const m = $derived(data.main);
	const price = (usd: number | null) => (usd != null && data.rate ? bs(usd * data.rate.rate) : null);
	const year = (iso: string | null) => (iso ? new Date(iso).getFullYear() : '');
	const posterUrl = (p: string | null) => (p ? (p.startsWith('/') ? p : '/archivo/' + p) : null);
	const others = $derived(data.current.filter((s) => s.id !== m?.id));
	const pct = (left: number, cap: number) => Math.round(((cap - left) / cap) * 100);
</script>

<svelte:head>
	<title>Karamantea Teatro · Cartelera y entradas</title>
	<meta name="description" content="Cartelera, funciones y venta de entradas de Karamantea Group Producciones." />
</svelte:head>

{#if m}
	<section class="hero">
		{#if posterUrl(m.poster)}
			<div class="backdrop" style="background-image:url('{posterUrl(m.poster)}')" aria-hidden="true"></div>
		{:else}
			<div class="backdrop masks" aria-hidden="true"></div>
		{/if}
		<div class="wrap hgrid">
			<div class="copy">
				<span class="eyebrow">Karamantea Group Producciones presenta</span>
				<h1 class="display">{m.title}</h1>
				{#if m.tagline}<p class="tag">{m.tagline}</p>{/if}
				<p class="credits">
					{#if m.director}<span>Escrita y dirigida por <b>{m.director.replace(/^Dirección:\s*/, '')}</b></span>{/if}
					{#if m.cast_list}<span>Con <b>{m.cast_list}</b></span>{/if}
				</p>

				<ul class="facts">
					<li>
						<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
						<div><span>Próxima función</span><b>{fechaLarga(m.next!)}</b></div>
					</li>
					<li>
						<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
						<div><span>Hora</span><b>{hora(m.next!)}</b></div>
					</li>
					<li>
						<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
						<div><span>Lugar</span><b>{m.venue}</b></div>
					</li>
				</ul>

				<div class="cta">
					<a class="btn btn-lime" href="/obra/{m.slug}#funciones">Comprar entradas</a>
					{#if price(m.minPrice)}<span class="from">Desde <b>{price(m.minPrice)}</b></span>{/if}
				</div>
			</div>
			<a class="hposter" href="/obra/{m.slug}" aria-label="Ver {m.title}">
				<Poster title={m.title} variant={m.variant} poster={m.poster} size="lg" />
			</a>
		</div>
	</section>
{:else}
	<section class="hero empty">
		<div class="backdrop masks" aria-hidden="true"></div>
		<div class="wrap">
			<span class="eyebrow">Próximamente</span>
			<h1 class="display">Muy pronto, nueva temporada</h1>
			<p class="tag">Síguenos en Instagram para enterarte primero.</p>
		</div>
	</section>
{/if}

<section class="perks" aria-label="Cómo comprar">
	<div class="wrap pgrid">
		<div>
			<span class="ic"><svg viewBox="0 0 24 24"><path d="M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3M4 11h16v5H4zM6 16v3M18 16v3" /></svg></span>
			<b>Asientos numerados</b>
			<p>Elige tu lugar exacto en el plano de la sala.</p>
		</div>
		<div>
			<span class="ic"><svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></svg></span>
			<b>Pago en bolívares</b>
			<p>Pago Móvil o transferencia a la tasa oficial BCV del día.</p>
		</div>
		<div>
			<span class="ic"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg></span>
			<b>Entradas en tu correo</b>
			<p>Te llegan apenas verificamos tu comprobante.</p>
		</div>
	</div>
</section>

<div id="funciones" class="anchor"></div>
{#if data.upcomingPerfs.length}
	<div style="--item: 320px; --item-sm: 86%">
		<Carousel label="Funciones disponibles" eyebrow="Elige tu fecha">
			{#each data.upcomingPerfs as p (p.id)}
				<a class="perf" href="/obra/{p.slug}?funcion={p.id}#funciones">
					<div class="ptop">
						<div class="date">
							<span class="dd">{dia(p.starts_at)}</span>
							<span class="dm">{mes(p.starts_at)}</span>
						</div>
						<div class="pinfo">
							<span class="dw">{diaSemana(p.starts_at)} · {hora(p.starts_at)}</span>
							<span class="ptitle">{p.title}</span>
							<span class="pmeta">{p.venue}</span>
						</div>
					</div>
					<div class="avail">
						<div class="bar"><i style="width:{pct(p.left, p.capacity)}%"></i></div>
						<span class:few={p.left > 0 && p.left <= 10} class:sold={p.left <= 0}>
							{p.left <= 0 ? 'Agotado' : p.left <= 10 ? `¡Quedan ${p.left}!` : `${p.left} disponibles`}
						</span>
					</div>
					<div class="pfoot">
						<span class="pp">{price(p.price_usd) ?? ''}</span>
						<span class="go">{p.left <= 0 ? 'Ver' : 'Comprar'} →</span>
					</div>
				</a>
			{/each}
		</Carousel>
	</div>
{/if}

<div id="cartelera" class="anchor"></div>
{#if others.length}
	<Carousel label="También en cartelera" eyebrow="Obras actuales">
		{#each others as s (s.id)}
			<a class="show" href="/obra/{s.slug}">
				<Poster title={s.title} variant={s.variant} poster={s.poster} />
				<div class="meta">
					<span class="when">{diaSemana(s.next!)} {dia(s.next!)} {mes(s.next!)} · {s.upcoming} {s.upcoming === 1 ? 'función' : 'funciones'}</span>
					<span class="genre">{s.venue}</span>
				</div>
			</a>
		{/each}
	</Carousel>
{/if}

<div id="historial" class="anchor"></div>
{#if data.past.length}
	<div style="--item: 190px; --item-sm: 48%">
		<Carousel label="Ya pasaron" eyebrow="Temporadas anteriores">
			{#each data.past as s (s.id)}
				<a class="show past" href="/obra/{s.slug}">
					<Poster title={s.title} variant={s.variant} poster={s.poster} past size="sm" />
					<div class="meta">
						<span class="when">{s.title}</span>
						<span class="genre">Temporada {year(s.last)}</span>
					</div>
				</a>
			{/each}
		</Carousel>
	</div>
{/if}

<style>
	.anchor {
		scroll-margin-top: 80px;
	}
	.hero {
		position: relative;
		overflow: hidden;
		isolation: isolate;
		padding: 72px 0 80px;
	}
	.hero.empty {
		padding: 140px 0;
	}
	.backdrop {
		position: absolute;
		inset: -40px;
		z-index: -1;
		background-size: cover;
		background-position: center;
		filter: blur(40px) saturate(1.2);
		opacity: 0.35;
		transform: scale(1.1);
	}
	.backdrop.masks {
		filter: none;
		opacity: 0.5;
		inset: 0;
		transform: none;
		background: url('/masks.jpg') right -120px center / 900px no-repeat;
		mask-image: linear-gradient(to left, #000 20%, transparent 85%);
	}
	.hero::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		background:
			linear-gradient(90deg, var(--ink) 15%, color-mix(in srgb, var(--ink) 55%, transparent) 60%, color-mix(in srgb, var(--ink) 30%, transparent)),
			linear-gradient(0deg, var(--ink) 0%, transparent 35%);
	}
	.hgrid {
		display: grid;
		grid-template-columns: 1fr 360px;
		gap: 72px;
		align-items: center;
	}
	h1 {
		font-size: clamp(34px, 5vw, 60px);
		margin: 18px 0 14px;
		max-width: 16ch;
		text-wrap: balance;
	}
	.tag {
		font-size: 20px;
		color: #d8d8d8;
		margin: 0 0 14px;
		max-width: 44ch;
	}
	.credits {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 18px;
		margin: 0;
		color: var(--mist);
		font-size: 15px;
	}
	.credits b {
		color: var(--paper);
		font-weight: 600;
	}
	.facts {
		list-style: none;
		margin: 32px 0 34px;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 14px 34px;
	}
	.facts li {
		display: flex;
		gap: 12px;
		align-items: center;
	}
	.facts svg,
	.ic svg {
		width: 20px;
		height: 20px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.7;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.facts svg {
		color: var(--lime);
		flex: none;
	}
	.facts div {
		display: grid;
		line-height: 1.3;
	}
	.facts span {
		font-size: 12px;
		color: var(--mist);
	}
	.facts b {
		font-weight: 700;
		text-transform: capitalize;
	}
	.cta {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 22px;
	}
	.cta .btn {
		padding: 16px 32px;
	}
	.from {
		color: var(--mist);
		font-size: 14px;
	}
	.from b {
		color: var(--paper);
		font-size: 18px;
		margin-left: 4px;
	}
	.hposter {
		width: 100%;
		border-radius: 16px;
		box-shadow:
			0 30px 80px -20px #000,
			0 0 0 1px #ffffff14;
		transition: transform 0.4s;
	}
	.hposter:hover {
		transform: translateY(-4px);
	}
	.hposter :global(.poster) {
		border-radius: 16px;
	}

	.perks {
		border-block: 1px solid var(--line);
		background: var(--ink-2);
	}
	.pgrid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
	}
	.pgrid > div {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 2px 14px;
		padding: 26px 24px;
	}
	.pgrid > div + div {
		border-left: 1px solid var(--line);
	}
	.ic {
		grid-row: span 2;
		width: 42px;
		height: 42px;
		border-radius: 12px;
		display: grid;
		place-items: center;
		background: var(--lime-soft);
		color: var(--lime);
	}
	.pgrid b {
		font-size: 15px;
	}
	.pgrid p {
		margin: 0;
		font-size: 13px;
		color: var(--mist);
	}

	.perf {
		display: grid;
		gap: 18px;
		padding: 20px;
		border-radius: var(--radius);
		background: var(--ink-2);
		border: 1px solid var(--line);
		transition:
			border-color 0.2s,
			transform 0.2s;
	}
	.perf:hover {
		border-color: var(--lime);
		transform: translateY(-2px);
	}
	.ptop {
		display: flex;
		gap: 16px;
		align-items: center;
	}
	.date {
		display: grid;
		place-items: center;
		align-content: center;
		width: 62px;
		height: 66px;
		flex: none;
		border-radius: 12px;
		background: var(--lime);
		color: var(--ink);
		text-transform: uppercase;
		line-height: 1;
	}
	.dd {
		font-size: 26px;
		font-weight: 800;
	}
	.dm {
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.15em;
		margin-top: 4px;
	}
	.pinfo {
		display: grid;
		gap: 3px;
		min-width: 0;
	}
	.dw {
		font-size: 12px;
		color: var(--lime);
		font-weight: 700;
		text-transform: capitalize;
	}
	.ptitle {
		font-weight: 800;
		line-height: 1.25;
	}
	.pmeta {
		font-size: 13px;
		color: var(--mist);
	}
	.avail {
		display: grid;
		gap: 6px;
		font-size: 12px;
		color: var(--mist);
	}
	.bar {
		height: 4px;
		border-radius: 4px;
		background: var(--ink-3);
		overflow: hidden;
	}
	.bar i {
		display: block;
		height: 100%;
		background: var(--stone);
	}
	.few {
		color: #ffb547;
		font-weight: 700;
	}
	.sold {
		color: var(--danger);
		font-weight: 700;
	}
	.pfoot {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 14px;
		border-top: 1px solid var(--line);
	}
	.pp {
		font-weight: 800;
		font-size: 17px;
	}
	.go {
		font-size: 14px;
		font-weight: 700;
		color: var(--lime);
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
		box-shadow: 0 18px 40px #0008;
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
		text-transform: none;
	}

	@media (max-width: 900px) {
		.hero {
			padding: 32px 0 48px;
		}
		.hgrid {
			grid-template-columns: 1fr;
			gap: 32px;
		}
		.hposter {
			order: -1;
			max-width: 260px;
		}
		.pgrid {
			grid-template-columns: 1fr;
		}
		.pgrid > div {
			padding: 18px 0;
		}
		.pgrid > div + div {
			border-left: 0;
			border-top: 1px solid var(--line);
		}
	}
</style>
