<script lang="ts">
	import Poster from '#lib/components/Poster.svelte';
	import VideoReel from '#lib/components/VideoReel.svelte';
	import { dia, mes, diaSemana, hora, fechaLarga } from '#lib/format.ts';

	let { data } = $props();
	const yearOf = (iso: string | null) => (iso ? new Date(iso).getFullYear() : '');
	const cityOf = (venue: string) => (venue.split('·').at(-1) ?? venue).trim();

	/** Divide el título para poner en cursiva la parte central, como en un programa de mano */
	function splitTitle(t: string) {
		const words = t.split(' ');
		if (words.length < 4) return { a: t, b: '', c: '' };
		const a = words.slice(0, 1).join(' ');
		const b = words.slice(1, Math.ceil(words.length / 2) + 1).join(' ');
		const c = words.slice(Math.ceil(words.length / 2) + 1).join(' ');
		return { a, b, c };
	}

	// ---- Banner rotativo (si hay más de una obra en cartelera)
	let current = $state(0);
	let paused = $state(false);
	const total = $derived(data.slides.length);
	const go = (i: number) => (current = (i + total) % total);
	$effect(() => {
		if (total < 2 || paused) return;
		const t = setInterval(() => go(current + 1), 7000);
		return () => clearInterval(t);
	});

	// ---- Filtro por ciudad
	const cities = $derived([...new Set(data.upcomingPerfs.map((p) => p.city))]);
	let city = $state('Todas');
	const events = $derived(data.upcomingPerfs.filter((p) => city === 'Todas' || p.city === city));

	let track: HTMLDivElement | undefined = $state();
	const scrollTrack = (dir: number) => track?.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: 'smooth' });
</script>

<svelte:head>
	<title>Karamantea Teatro · Cartelera y entradas</title>
	<meta name="description" content="Cartelera, funciones y venta de entradas de Karamantea Group Producciones." />
</svelte:head>

<!-- ============ ESTRENO ============ -->
{#if total}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<section class="hero wrap" aria-label="Obras en cartelera" onmouseenter={() => (paused = true)} onmouseleave={() => (paused = false)}>
		{#each data.slides as m, i (m.id)}
			{@const t = splitTitle(m.title)}
			<article class="slide" class:on={i === current} aria-hidden={i !== current}>
				<div class="copy">
					<p class="kicker">{i === 0 ? 'Estreno' : 'En cartelera'} · {cityOf(m.venue)} · {fechaLarga(m.next!)}</p>
					<h1 class="display">
						{t.a}
						{#if t.b}<em>{t.b}</em>{/if}
						{t.c}
					</h1>
					<p class="lede">
						{#if m.cast_list}{m.cast_list}{/if}{#if m.director}{m.cast_list ? ', bajo la dirección de ' : 'Dirección: '}{m.director}{/if}.
						{m.upcoming > 1 ? `${m.upcoming} funciones` : 'Una sola función'} en {m.venue.split('·')[0].trim()}, a las {hora(m.next!).replace(/\.$/, '')}.
					</p>
					<div class="cta">
						<a class="btn btn-lime" href="/obra/{m.slug}#funciones" tabindex={i === current ? 0 : -1}>Comprar entradas</a>
					</div>
				</div>
				<a class="frame" href="/obra/{m.slug}" aria-label="Ver {m.title}" tabindex={i === current ? 0 : -1}>
					<Poster title={m.title} variant={m.variant} poster={m.poster} size="lg" />
				</a>
			</article>
		{/each}
		{#if total > 1}
			<div class="dots">
				<button onclick={() => go(current - 1)} aria-label="Anterior" class="arr">←</button>
				{#each data.slides as s, i (s.id)}
					<button class="dot" class:on={i === current} onclick={() => go(i)} aria-label="Ir a {s.title}"></button>
				{/each}
				<button onclick={() => go(current + 1)} aria-label="Siguiente" class="arr">→</button>
			</div>
		{/if}
	</section>
{:else}
	<section class="hero wrap empty">
		<p class="kicker">Próximamente</p>
		<h1 class="display">Muy pronto, <em>nueva temporada</em></h1>
		<p class="lede">Escríbenos por WhatsApp para enterarte primero.</p>
	</section>
{/if}

<!-- ============ VIDEOS ============ -->
{#if data.videos.length}
	<VideoReel videos={data.videos} />
{/if}

<!-- ============ PROGRAMA ============ -->
<section id="funciones" class="wrap program">
	<header class="phead">
		<h2 class="display">Próximas funciones</h2>
		{#if cities.length > 1}
			<div class="filters" role="tablist" aria-label="Filtrar por ciudad">
				{#each ['Todas', ...cities] as c (c)}
					<button role="tab" aria-selected={city === c} class:on={city === c} onclick={() => (city = c)}>{c}</button>
				{/each}
			</div>
		{:else}
			<span class="tag">Programa de temporada</span>
		{/if}
	</header>

	{#each events as p (p.id)}
		<a class="row" href="/obra/{p.slug}?funcion={p.id}#funciones">
			<span class="date"><b>{dia(p.starts_at)}</b> <small>{mes(p.starts_at)}</small></span>
			<span class="title">{p.title}</span>
			<span class="where">{p.venue} · <span class="cap">{diaSemana(p.starts_at)}</span> {hora(p.starts_at)}</span>
			<span class="price">
				{#if p.left <= 0}<span class="sold">Agotado</span>
				{:else if p.left <= 20}<span class="few">Últimas {p.left}</span>
				{:else}<span class="avail">Disponible</span>{/if}
			</span>
			<span class="go">{p.left <= 0 ? 'Detalle' : 'Entradas'} →</span>
		</a>
	{:else}
		<p class="none">Pronto anunciaremos nuevas funciones. <a href="https://wa.me/584249392784" target="_blank" rel="noopener">Escríbenos por WhatsApp</a> y te avisamos.</p>
	{/each}

	<a class="row ally" href="https://wa.me/584249392784" target="_blank" rel="noopener">
		<span class="date"><b>+</b></span>
		<span class="title">¿Llevamos una obra a tu ciudad o patrocinas un evento?</span>
		<span class="where">Hoteles, restaurantes y salas de todo el país</span>
		<span class="price"></span>
		<span class="go">Escríbenos →</span>
	</a>
</section>

<!-- ============ CÓMO COMPRAR ============ -->
<section class="wrap steps" aria-label="Cómo comprar">
	<div>
		<span class="n display">I</span>
		<b>Elige tu asiento</b>
		<p>Asientos numerados en el plano de la sala.</p>
	</div>
	<div>
		<span class="n display">II</span>
		<b>Paga en bolívares</b>
		<p>Pago Móvil a la tasa oficial BCV del día.</p>
	</div>
	<div>
		<span class="n display">III</span>
		<b>Recibe tus entradas</b>
		<p>Llegan a tu correo al verificar el pago.</p>
	</div>
</section>

<!-- ============ TRAYECTORIA ============ -->
{#if data.past.length}
	<section id="trayectoria" class="wrap story">
		<header class="phead">
			<h2 class="display">Nuestra trayectoria</h2>
			<div class="snav">
				<button onclick={() => scrollTrack(-1)} aria-label="Anterior">←</button>
				<button onclick={() => scrollTrack(1)} aria-label="Siguiente">→</button>
			</div>
		</header>
		<div class="sgrid">
			<div class="sintro">
				<p>Karamantea Group lleva el teatro a hoteles, restaurantes y salas de todo el país. Estas son algunas de las obras que ya hemos presentado.</p>
				<dl class="stats">
					<div><dd class="display">{data.stats.shows}</dd><dt>Obras</dt></div>
					<div><dd class="display">{data.stats.performances}</dd><dt>Funciones</dt></div>
					<div><dd class="display">{data.stats.cities}</dd><dt>Ciudades</dt></div>
				</dl>
			</div>
			<div class="strack" bind:this={track}>
				{#each data.past as s (s.id)}
					<a class="pcard" href="/obra/{s.slug}">
						<span class="pframe"><Poster title={s.title} variant={s.variant} poster={s.poster} size="sm" /></span>
						<b>{s.title}</b>
						<span class="pc">{s.cities.join(' · ')}</span>
						<span class="pm">
							{s.count}
							{s.count === 1 ? 'función' : 'funciones'} ·
							{yearOf(s.first) === yearOf(s.last) ? yearOf(s.last) : `${yearOf(s.first)}–${yearOf(s.last)}`}
						</span>
					</a>
				{/each}
			</div>
		</div>
	</section>
{/if}

<style>
	/* ---------- estreno ---------- */
	.hero {
		display: grid;
		padding: 64px 0 72px;
		position: relative;
	}
	.hero.empty {
		padding: 120px 0;
		gap: 18px;
	}
	.slide {
		grid-area: 1 / 1;
		display: grid;
		grid-template-columns: minmax(0, 1fr) 360px;
		gap: 80px;
		align-items: center;
		opacity: 0;
		visibility: hidden;
		transition:
			opacity 0.6s,
			visibility 0.6s;
	}
	.slide.on {
		opacity: 1;
		visibility: visible;
	}
	.kicker {
		margin: 0 0 22px;
		font-size: 12px;
		letter-spacing: 0.26em;
		text-transform: uppercase;
		color: var(--accent);
		font-weight: 600;
	}
	.kicker::first-letter {
		text-transform: uppercase;
	}
	h1 {
		font-size: clamp(42px, 6.2vw, 80px);
		line-height: 1.02;
		margin: 0;
		text-wrap: balance;
	}
	h1 em {
		font-style: italic;
		color: var(--mist);
	}
	.lede {
		font-size: 17px;
		line-height: 1.65;
		color: var(--mist);
		max-width: 52ch;
		margin: 24px 0 32px;
	}
	.cta {
		display: flex;
		align-items: center;
		gap: 28px;
		flex-wrap: wrap;
	}
	.cta .btn {
		padding: 17px 32px;
	}
	.frame {
		padding: 12px;
		border: 1px solid var(--line);
		background: var(--ink-2);
		transition: border-color 0.3s;
	}
	.frame:hover {
		border-color: var(--paper);
	}
	.frame :global(.poster) {
		border-radius: 0;
		box-shadow: none;
	}
	.dots {
		position: absolute;
		left: 0;
		bottom: 22px;
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.dot {
		width: 26px;
		height: 2px;
		border: 0;
		padding: 0;
		background: var(--line);
		cursor: pointer;
	}
	.dot.on {
		background: var(--paper);
	}
	.arr {
		background: none;
		border: 0;
		cursor: pointer;
		font-size: 16px;
		color: var(--mist);
		padding: 6px;
	}

	/* ---------- programa ---------- */
	.program {
		scroll-margin-top: 90px;
	}
	.phead {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 16px;
		flex-wrap: wrap;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--paper);
	}
	.phead h2 {
		font-size: clamp(28px, 3.4vw, 38px);
		margin: 0;
	}
	.tag {
		font-size: 11px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--stone);
		font-weight: 600;
	}
	.filters {
		display: flex;
		gap: 20px;
		flex-wrap: wrap;
	}
	.filters button {
		background: none;
		border: 0;
		border-bottom: 1px solid transparent;
		padding: 4px 0;
		font-size: 12px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-weight: 600;
		color: var(--mist);
		cursor: pointer;
	}
	.filters button.on {
		color: var(--paper);
		border-bottom-color: var(--paper);
	}
	.row {
		display: grid;
		grid-template-columns: 120px minmax(0, 1.4fr) minmax(0, 1fr) 150px 140px;
		gap: 24px;
		align-items: center;
		padding: 24px 0;
		border-bottom: 1px solid var(--line);
		transition: background 0.2s;
	}
	.row:hover {
		background: var(--ink-2);
	}
	.date {
		font-family: var(--display);
	}
	.date b {
		font-weight: 400;
		font-size: 38px;
	}
	.date small {
		font-family: var(--body);
		font-size: 12px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--mist);
		font-weight: 600;
	}
	.title {
		font-size: 18px;
		font-weight: 500;
	}
	.where {
		font-size: 14px;
		color: var(--mist);
	}
	.cap {
		text-transform: capitalize;
	}
	.price {
		font-size: 15px;
	}
	.few {
		color: var(--warn);
		font-weight: 600;
	}
	.sold {
		color: var(--danger);
		font-weight: 600;
	}
	.go {
		justify-self: end;
		font-size: 12px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-weight: 700;
		color: var(--accent);
		white-space: nowrap;
	}
	.ally .date b {
		color: var(--accent);
	}
	.ally .title {
		font-family: var(--display);
		font-size: 20px;
		font-style: italic;
	}
	.none {
		padding: 28px 0;
		color: var(--mist);
		border-bottom: 1px solid var(--line);
		margin: 0;
	}
	.none a {
		color: var(--accent);
		font-weight: 600;
	}

	/* ---------- cómo comprar ---------- */
	.steps {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 40px;
		padding: 72px 0 8px;
	}
	.steps div {
		display: grid;
		gap: 6px;
		padding-top: 18px;
		border-top: 1px solid var(--line);
	}
	.n {
		font-size: 28px;
		font-style: italic;
		color: var(--accent);
	}
	.steps b {
		font-size: 16px;
		font-weight: 600;
	}
	.steps p {
		margin: 0;
		font-size: 14px;
		color: var(--mist);
	}

	/* ---------- trayectoria ---------- */
	.story {
		padding-top: 88px;
		scroll-margin-top: 90px;
	}
	.snav {
		display: flex;
		gap: 6px;
	}
	.snav button {
		width: 40px;
		height: 40px;
		border: 1px solid var(--line);
		background: var(--ink-2);
		cursor: pointer;
		font-size: 15px;
	}
	.snav button:hover {
		border-color: var(--paper);
	}
	.sgrid {
		display: grid;
		grid-template-columns: 300px minmax(0, 1fr);
		gap: 48px;
		padding-top: 32px;
	}
	.sintro p {
		margin: 0 0 28px;
		color: var(--mist);
		line-height: 1.7;
	}
	.stats {
		display: grid;
		gap: 18px;
		margin: 0;
	}
	.stats div {
		display: flex;
		align-items: baseline;
		gap: 14px;
		padding-bottom: 14px;
		border-bottom: 1px solid var(--line);
	}
	.stats dd {
		margin: 0;
		font-size: 44px;
		line-height: 1;
		min-width: 64px;
	}
	.stats dt {
		font-size: 12px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--mist);
		font-weight: 600;
	}
	.strack {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: 200px;
		gap: 22px;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		scrollbar-width: none;
	}
	.strack::-webkit-scrollbar {
		display: none;
	}
	.pcard {
		display: grid;
		gap: 4px;
		align-content: start;
		scroll-snap-align: start;
	}
	.pframe {
		padding: 8px;
		border: 1px solid var(--line);
		background: var(--ink-2);
		margin-bottom: 10px;
		transition: border-color 0.3s;
	}
	.pcard:hover .pframe {
		border-color: var(--paper);
	}
	.pframe :global(.poster) {
		border-radius: 0;
		box-shadow: none;
	}
	.pcard b {
		font-family: var(--display);
		font-weight: 400;
		font-size: 18px;
		line-height: 1.25;
	}
	.pc {
		font-size: 13px;
		color: var(--accent);
		font-weight: 600;
	}
	.pm {
		font-size: 12px;
		color: var(--mist);
	}

	@media (max-width: 900px) {
		.hero {
			padding: 32px 0 64px;
		}
		.slide {
			grid-template-columns: 1fr;
			gap: 32px;
		}
		.frame {
			order: -1;
			max-width: 260px;
		}
		.row {
			grid-template-columns: 72px minmax(0, 1fr) auto;
			grid-template-areas: 'date title go' 'date where price';
			gap: 4px 16px;
		}
		.date {
			grid-area: date;
		}
		.date b {
			font-size: 30px;
		}
		.title {
			grid-area: title;
			font-size: 16px;
		}
		.where {
			grid-area: where;
			font-size: 13px;
		}
		.price {
			grid-area: price;
			justify-self: end;
			font-size: 13px;
		}
		.go {
			grid-area: go;
		}
		.steps,
		.sgrid {
			grid-template-columns: 1fr;
			gap: 24px;
		}
		.strack {
			grid-auto-columns: 46%;
		}
	}
</style>
