<script lang="ts">
	import Poster from '#lib/components/Poster.svelte';
	import VideoReel from '#lib/components/VideoReel.svelte';
	import { dia, mes, diaSemana, hora, fechaLarga } from '#lib/format.ts';

	let { data } = $props();
	const yearOf = (iso: string | null) => (iso ? new Date(iso).getFullYear() : '');
	const cityOf = (venue: string) => (venue.split('·').at(-1) ?? venue).trim();
	const posterSrc = (p: string | null) => (p ? (p.startsWith('/') ? p : '/archivo/' + p) : null);
	const WA = 'https://wa.me/584249392784';

	// ---------- Banner principal: obras en cartelera + eventos especiales ----------
	type Slide = {
		key: string;
		kicker: string;
		title: string;
		lede: string;
		img: string | null;
		href: string;
		cta: string;
		external?: boolean;
		show?: (typeof data.slides)[number];
	};
	const specials: Slide[] = [
		{
			key: 'rutaca',
			kicker: 'Evento especial · Rutaca Airlines',
			title: 'Un hangar convertido en teatro',
			lede: 'Intervinimos el hangar de Rutaca Airlines con un diseño tipo teatro para presentar el avión oficial de la Vinotinto.',
			img: '/videos/rutaca-hangar.jpg',
			href: 'https://www.instagram.com/reel/DHd51_rseCm/',
			cta: 'Ver el video',
			external: true
		},
		{
			key: 'festivales',
			kicker: 'Festivales internacionales',
			title: 'De Bogotá a París',
			lede: 'Las Criadas, de Jean Genet, en el Festival Internacional de Teatro de Bogotá y en el Teatro Essaïon de París.',
			img: '/videos/las-criadas.jpg',
			href: 'https://www.instagram.com/reel/CyeXR7KuxNf/',
			cta: 'Ver el video',
			external: true
		}
	];
	const slides = $derived<Slide[]>([
		...data.slides.map((m, i) => ({
			key: 'show-' + m.id,
			kicker: `${i === 0 ? 'Estreno' : 'En cartelera'} · ${cityOf(m.venue)} · ${fechaLarga(m.next!)}`,
			title: m.title,
			lede: [m.cast_list, m.director ? `bajo la dirección de ${m.director}` : ''].filter(Boolean).join(', ') + `. ${m.venue.split('·')[0].trim()}, ${hora(m.next!).replace(/\.$/, '')}.`,
			img: posterSrc(m.poster),
			href: `/obra/${m.slug}#funciones`,
			cta: 'Comprar entradas',
			show: m
		})),
		...specials
	]);
	let current = $state(0);
	let paused = $state(false);
	const total = $derived(slides.length);
	const go = (i: number) => (current = (i + total) % total);
	$effect(() => {
		if (total < 2 || paused) return;
		const t = setTimeout(() => go(current + 1), 7000);
		return () => clearTimeout(t);
	});

	// ---------- Próximas funciones ----------
	const cities = $derived([...new Set(data.upcomingPerfs.map((p) => p.city))]);
	let city = $state('Todas');
	const events = $derived(data.upcomingPerfs.filter((p) => city === 'Todas' || p.city === city));

	// ---------- Trayectoria ----------
	let track: HTMLDivElement | undefined = $state();
	const scrollTrack = (dir: number) => track?.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: 'smooth' });
	const since = $derived(data.stats.since ?? 2024);

	// ---------- Aliados ----------
	const partners = $derived([...data.venues, 'Rutaca Airlines', 'Festival Internacional de Teatro de Bogotá', 'Teatro Essaïon · París']);
</script>

<svelte:head>
	<title>Karamantea Teatro · Cartelera y entradas</title>
	<meta name="description" content="Cartelera, funciones y venta de entradas de Karamantea Group Producciones." />
</svelte:head>

<!-- ============ BANNER ============ -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<section class="banner" aria-label="Destacados" onmouseenter={() => (paused = true)} onmouseleave={() => (paused = false)}>
	{#each slides as s, i (s.key)}
		<article class="bslide" class:on={i === current} aria-hidden={i !== current}>
			{#if s.img}<div class="bg" style="background-image:url('{s.img}')"></div>{/if}
			<div class="wrap binner">
				<div class="copy">
					<p class="kicker">{s.kicker}</p>
					<h1 class="display">{s.title}</h1>
					<p class="lede">{s.lede}</p>
					<div class="cta">
						<a class="btn bbtn" href={s.href} target={s.external ? '_blank' : undefined} rel={s.external ? 'noopener' : undefined} tabindex={i === current ? 0 : -1}>{s.cta}</a>
						{#if s.show}<a class="more" href="/obra/{s.show.slug}" tabindex={i === current ? 0 : -1}>Ver la obra →</a>{/if}
					</div>
				</div>
				<a class="art" href={s.show ? `/obra/${s.show.slug}` : s.href} target={s.external ? '_blank' : undefined} rel={s.external ? 'noopener' : undefined} tabindex="-1" aria-hidden="true">
					{#if s.show}
						<Poster title={s.show.title} variant={s.show.variant} poster={s.show.poster} size="lg" />
					{:else if s.img}
						<img src={s.img} alt="" />
					{/if}
				</a>
			</div>
		</article>
	{/each}
	{#if total > 1}
		<div class="wrap bctl">
			<button class="arr" onclick={() => go(current - 1)} aria-label="Anterior">←</button>
			<div class="dots">
				{#each slides as s, i (s.key)}
					<button class="dot" class:on={i === current} class:run={i === current && !paused} onclick={() => go(i)} aria-label="Ir a {s.title}"><i></i></button>
				{/each}
			</div>
			<button class="arr" onclick={() => go(current + 1)} aria-label="Siguiente">→</button>
		</div>
	{/if}
</section>

<!-- ============ OBRAS + ALIADOS ============ -->
{#if data.past.length}
	<section id="obras" class="works" aria-labelledby="obras-t">
		<div class="wrap">
			<header class="phead">
				<div>
					<span class="eyebrow">Repertorio</span>
					<h2 class="display" id="obras-t">Obras que hemos presentado</h2>
				</div>
				<div class="snav">
					<button onclick={() => scrollTrack(-1)} aria-label="Anterior">←</button>
					<button onclick={() => scrollTrack(1)} aria-label="Siguiente">→</button>
				</div>
			</header>
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
		<div class="partners" aria-label="Han confiado en Karamantea">
			<p class="wrap ptitle">Han confiado en Karamantea</p>
			<div class="marquee">
				<div class="mtrack">
					{#each [0, 1] as k (k)}
						<div class="mgroup" aria-hidden={k === 1}>
							{#each partners as n (n)}<span class="display">{n}</span>{/each}
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>
{/if}

<!-- ============ PRÓXIMAS FUNCIONES ============ -->
<section id="funciones" class="wrap program">
	<header class="phead">
		<div>
			<span class="eyebrow">Cartelera</span>
			<h2 class="display">Próximas funciones</h2>
		</div>
		{#if cities.length > 1}
			<div class="filters" role="tablist" aria-label="Filtrar por ciudad">
				{#each ['Todas', ...cities] as c (c)}
					<button role="tab" aria-selected={city === c} class:on={city === c} onclick={() => (city = c)}>{c}</button>
				{/each}
			</div>
		{/if}
	</header>

	<div class="egrid">
		{#each events as p (p.id)}
			<a class="ecard" href="/obra/{p.slug}?funcion={p.id}#funciones">
				<span class="eimg">
					<Poster title={p.title} variant={p.variant} poster={p.poster} size="md" />
					<span class="badge"><b>{dia(p.starts_at)}</b><small>{mes(p.starts_at)}</small></span>
					{#if p.state === 'soldout'}<span class="flag sold">Agotado</span>
					{:else if p.state === 'closed'}<span class="flag sold">Ventas cerradas</span>
					{:else if p.left <= 20}<span class="flag few">Últimas {p.left}</span>{/if}
				</span>
				<span class="ebody">
					<span class="ecity">{p.city}</span>
					<b>{p.title}</b>
					<span class="ewhere">{p.venue.split('·')[0].trim()}</span>
					<span class="ewhen"><span class="cap">{diaSemana(p.starts_at)}</span> {dia(p.starts_at)} {mes(p.starts_at)} · {hora(p.starts_at)}</span>
					<span class="ebtn" class:off={p.state !== 'open'}>{p.state === 'soldout' ? 'Agotado' : p.state === 'closed' ? 'Ventas cerradas' : 'Comprar entradas'}</span>
				</span>
			</a>
		{/each}
		<a class="ecard invite" href={WA} target="_blank" rel="noopener" style="--span:{3 - (events.length % 3)};--span2:{events.length % 2 ? 1 : 2}">
			<span class="ibody">
				<span class="ecity">Hoteles · restaurantes · salas · empresas</span>
				<b class="display">¿Llevamos una obra a tu ciudad o a tu evento?</b>
				<span>Producimos funciones a la medida, desde un hotel en Maturín hasta un hangar de aviones.</span>
				<span class="ebtn">Escríbenos por WhatsApp</span>
			</span>
		</a>
	</div>
	{#if !events.length}
		<p class="none">Pronto anunciaremos nuevas funciones. Escríbenos por WhatsApp y te avisamos.</p>
	{/if}
</section>

<!-- ============ VIDEOS ============ -->
{#if data.videos.length}
	<div id="videos"><VideoReel videos={data.videos} /></div>
{/if}


<!-- ============ TRAYECTORIA Y EVENTOS ESPECIALES ============ -->
<section id="trayectoria" class="wrap story" aria-labelledby="tray-t">
	<header class="phead">
		<div>
			<span class="eyebrow">Eventos especiales y giras · desde {since}</span>
			<h2 class="display" id="tray-t">Nuestra trayectoria</h2>
		</div>
	</header>
	<div class="sgrid">
		<a class="tile big" href="https://www.instagram.com/reel/DHd51_rseCm/" target="_blank" rel="noopener">
			<img src="/videos/rutaca-hangar.jpg" alt="" loading="lazy" />
			<span class="tcopy">
				<span class="tk">Rutaca Airlines · 2025</span>
				<b class="display">El avión oficial de la Vinotinto</b>
				<span>Convertimos un hangar en un teatro: telones, escena y público para la presentación del avión de la selección.</span>
				<span class="tlink">Ver el video →</span>
			</span>
		</a>
		<a class="tile" href="https://www.instagram.com/reel/CyeXR7KuxNf/" target="_blank" rel="noopener">
			<img src="/videos/las-criadas.jpg" alt="" loading="lazy" />
			<span class="tcopy">
				<span class="tk">Festivales internacionales</span>
				<b class="display">Bogotá y París</b>
				<span>Las Criadas, de Jean Genet, junto a compañías de nueve países.</span>
				<span class="tlink">Ver el video →</span>
			</span>
		</a>
		<a class="tile" href="#obras">
			<img src="/videos/no-eres-tu-rosa-bela.jpg" alt="" loading="lazy" />
			<span class="tcopy">
				<span class="tk">Gira nacional</span>
				<b class="display">{data.allCities.length} ciudades</b>
				<span>{data.allCities.join(' · ')}</span>
				<span class="tlink">Ver las obras →</span>
			</span>
		</a>
	</div>

	<div class="figures" aria-label="Karamantea en cifras">
		<div><b class="display">{data.stats.shows}</b><span>obras producidas</span></div>
		<div><b class="display">{data.stats.allPerformances}</b><span>funciones</span></div>
		<div><b class="display">{data.stats.allCities}</b><span>ciudades</span></div>
		<div><b class="display">2</b><span>festivales internacionales</span></div>
		<div><b class="display">{since}</b><span>en escena desde</span></div>
	</div>

	<div class="mtext">
		<p>Karamantea Group lleva el teatro a hoteles, restaurantes, salas y empresas de todo el país, y lo ha llevado a festivales fuera de Venezuela.</p>
		<div class="chips">
			{#each data.allCities as c (c)}<span>{c}</span>{/each}
		</div>
	</div>
</section>

<!-- ============ CÓMO COMPRAR ============ -->
<section class="wrap steps" aria-label="Cómo comprar">
	<div>
		<span class="n display">01</span>
		<b>Elige tu asiento</b>
		<p>Asientos numerados en el plano de la sala.</p>
	</div>
	<div>
		<span class="n display">02</span>
		<b>Paga en bolívares</b>
		<p>Pago Móvil a la tasa oficial BCV del momento.</p>
	</div>
	<div>
		<span class="n display">03</span>
		<b>Recibe tus entradas</b>
		<p>Llegan a tu correo al verificar el pago.</p>
	</div>
</section>

<!-- ============ CONTRATACIONES ============ -->
<section class="hire">
	<div class="wrap hinner">
		<div>
			<span class="hk">Contrataciones y patrocinios</span>
			<h2 class="display">Llevamos el teatro a donde lo necesites</h2>
		</div>
		<a class="btn hbtn" href={WA} target="_blank" rel="noopener">Escríbenos por WhatsApp</a>
	</div>
</section>

<style>
	/* ---------- banner ---------- */
	.banner {
		position: relative;
		background: #141311;
		color: #f6f3ec;
		overflow: hidden;
		height: clamp(520px, 74vh, 640px);
	}
	.bslide {
		position: absolute;
		inset: 0;
		opacity: 0;
		visibility: hidden;
		transition:
			opacity 0.7s ease,
			visibility 0.7s;
	}
	.bslide.on {
		opacity: 1;
		visibility: visible;
	}
	.bg {
		position: absolute;
		inset: -40px;
		background-size: cover;
		background-position: center;
		filter: blur(36px) saturate(1.2);
		opacity: 0.55;
		transform: scale(1.1);
	}
	.bslide::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(90deg, #141311 0%, #141311e6 38%, #14131166 70%, #14131133 100%);
	}
	.binner {
		position: relative;
		z-index: 1;
		height: 100%;
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
		gap: 48px;
		align-items: center;
		padding-bottom: 40px;
	}
	.kicker {
		font-size: 12px;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: var(--lime);
		font-weight: 700;
		margin: 0 0 18px;
	}
	.banner h1 {
		font-size: clamp(38px, 5.6vw, 76px);
		line-height: 1.02;
		margin: 0 0 22px;
		color: #fff;
		max-width: 14ch;
	}
	.lede {
		font-size: 17px;
		line-height: 1.65;
		color: #f6f3ecbf;
		max-width: 52ch;
		margin: 0 0 32px;
	}
	.cta {
		display: flex;
		gap: 24px;
		align-items: center;
		flex-wrap: wrap;
	}
	.bbtn {
		background: var(--lime);
		color: #141311;
		padding: 16px 28px;
		font-size: 15px;
	}
	.bbtn:hover {
		background: #c3e43a;
	}
	.more {
		color: #fff;
		font-weight: 600;
		font-size: 14px;
		border-bottom: 1px solid #ffffff55;
		padding-bottom: 2px;
	}
	.art {
		justify-self: end;
		width: min(100%, 340px);
		transform: rotate(2deg);
		box-shadow: 0 30px 80px #0009;
		border: 8px solid #fff;
		background: #fff;
		transition: transform 0.4s;
	}
	.art:hover {
		transform: rotate(0deg) scale(1.02);
	}
	.art img {
		display: block;
		width: 100%;
		aspect-ratio: 3 / 4;
		object-fit: cover;
	}
	.art :global(.poster) {
		border-radius: 0;
	}
	.bctl {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 26px;
		z-index: 2;
		display: flex;
		align-items: center;
		gap: 14px;
		margin-inline: auto;
	}
	.dots {
		display: flex;
		gap: 8px;
		flex: 1;
		max-width: 420px;
	}
	.dot {
		flex: 1;
		height: 18px;
		background: none;
		border: 0;
		padding: 8px 0;
		cursor: pointer;
	}
	.dot i {
		display: block;
		height: 2px;
		background: #ffffff40;
		position: relative;
		overflow: hidden;
	}
	.dot.on i::after {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--lime);
		transform-origin: left;
	}
	.dot.run i::after {
		animation: fill 7s linear forwards;
	}
	@keyframes fill {
		from {
			transform: scaleX(0);
		}
		to {
			transform: scaleX(1);
		}
	}
	.arr {
		width: 40px;
		height: 40px;
		border: 1px solid #ffffff40;
		background: none;
		color: #fff;
		cursor: pointer;
	}
	.arr:hover {
		border-color: var(--lime);
		color: var(--lime);
	}

	/* ---------- cifras ---------- */
	.figures {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		border-bottom: 1px solid var(--line);
		margin-top: 20px;
	}
	.figures div {
		padding: 34px 20px 30px;
		display: grid;
		gap: 4px;
		border-left: 1px solid var(--line);
	}
	.figures div:first-child {
		border-left: 0;
		padding-left: 0;
	}
	.figures b {
		font-size: clamp(36px, 4vw, 54px);
		font-weight: 400;
		line-height: 1;
	}
	.figures span {
		font-size: 12px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--mist);
		font-weight: 600;
	}

	/* ---------- encabezados ---------- */
	.phead {
		display: flex;
		justify-content: space-between;
		align-items: end;
		gap: 16px;
		flex-wrap: wrap;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--paper);
		margin-bottom: 28px;
	}
	.phead h2 {
		font-size: clamp(30px, 3.6vw, 42px);
		margin: 8px 0 0;
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

	/* ---------- próximas funciones ---------- */
	.program {
		padding-top: 80px;
		scroll-margin-top: 90px;
	}
	.egrid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 24px;
	}
	.ecard {
		display: grid;
		grid-template-rows: auto 1fr;
		background: var(--ink-2);
		border: 1px solid var(--line);
		transition:
			transform 0.25s,
			box-shadow 0.25s;
	}
	.ecard:hover {
		transform: translateY(-4px);
		box-shadow: 0 18px 40px #1514121a;
	}
	.eimg {
		position: relative;
		display: block;
		aspect-ratio: 4 / 5;
		overflow: hidden;
		background: var(--ink-3);
	}
	.eimg :global(.poster) {
		border-radius: 0;
		width: 100%;
		height: 100%;
		aspect-ratio: auto;
	}
	.badge {
		position: absolute;
		top: 14px;
		left: 14px;
		background: #fff;
		color: var(--paper);
		display: grid;
		justify-items: center;
		padding: 8px 12px 6px;
		box-shadow: 0 6px 18px #0003;
	}
	.badge b {
		font-family: var(--display);
		font-weight: 400;
		font-size: 28px;
		line-height: 1;
	}
	.badge small {
		font-size: 11px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-weight: 700;
	}
	.flag {
		position: absolute;
		top: 14px;
		right: 14px;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding: 5px 9px;
		background: var(--lime);
		color: #141311;
	}
	.flag.sold {
		background: var(--paper);
		color: #fff;
	}
	.ebody,
	.ibody {
		display: grid;
		gap: 6px;
		padding: 20px 20px 22px;
		align-content: start;
	}
	.ecity {
		font-size: 11px;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--accent);
		font-weight: 700;
	}
	.ebody b {
		font-family: var(--display);
		font-weight: 400;
		font-size: 22px;
		line-height: 1.2;
	}
	.ewhere,
	.ewhen {
		font-size: 14px;
		color: var(--text-2);
	}
	.cap {
		text-transform: capitalize;
	}
	.ebtn {
		margin-top: 12px;
		background: var(--paper);
		color: var(--ink);
		text-align: center;
		padding: 13px 16px;
		font-weight: 700;
		font-size: 14px;
	}
	.ebtn.off {
		background: var(--ink-3);
		color: var(--mist);
	}
	.ecard:hover .ebtn {
		background: #000;
	}
	.invite {
		grid-column: span var(--span, 1);
		background: #141311;
		color: #f6f3ec;
		border-color: #141311;
		grid-template-rows: 1fr;
		position: relative;
		overflow: hidden;
	}
	.invite::before {
		content: '';
		position: absolute;
		width: 340px;
		height: 340px;
		border-radius: 50%;
		right: -120px;
		top: -120px;
		background: radial-gradient(circle, #abce2655, transparent 70%);
	}
	.ibody {
		position: relative;
		align-content: end;
		padding: 28px;
		gap: 12px;
	}
	.invite .ecity {
		color: var(--lime);
	}
	.invite b {
		font-size: clamp(26px, 2.6vw, 32px);
		line-height: 1.1;
		font-weight: 400;
		color: #fff;
	}
	.ibody > span:not(.ecity):not(.ebtn) {
		color: #f6f3ecb3;
		font-size: 15px;
		line-height: 1.6;
	}
	.invite .ebtn {
		background: var(--lime);
		color: #141311;
	}
	.none {
		color: var(--mist);
		margin-top: 18px;
	}

	/* ---------- eventos especiales ---------- */
	.sgrid {
		display: grid;
		grid-template-columns: 1.3fr 1fr;
		grid-template-rows: 280px 280px;
		gap: 20px;
	}
	.tile {
		position: relative;
		overflow: hidden;
		background: #141311;
		color: #fff;
		display: block;
	}
	.tile.big {
		grid-row: span 2;
	}
	.tile img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.6s;
	}
	.tile:hover img {
		transform: scale(1.05);
	}
	.tile::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, #14131100 30%, #141311e6 100%);
	}
	.tcopy {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 1;
		display: grid;
		gap: 8px;
		padding: 26px;
	}
	.tk {
		font-size: 11px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--lime);
		font-weight: 700;
	}
	.tile b {
		font-size: clamp(24px, 2.4vw, 32px);
		font-weight: 400;
		line-height: 1.1;
	}
	.tile.big b {
		font-size: clamp(30px, 3.4vw, 46px);
	}
	.tcopy > span:not(.tk):not(.tlink) {
		font-size: 14px;
		line-height: 1.55;
		color: #ffffffcc;
		max-width: 46ch;
	}
	.tlink {
		font-size: 12px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-weight: 700;
		margin-top: 4px;
	}

	/* ---------- trayectoria ---------- */
	.story {
		padding-top: 96px;
		scroll-margin-top: 90px;
	}
	.mtext {
		margin-top: 20px;
		background: var(--lime);
		color: #141311;
		padding: 30px 32px;
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
		align-items: center;
		gap: 16px 40px;
	}
	.mtext p {
		margin: 0;
		font-family: var(--display);
		font-size: clamp(18px, 1.7vw, 22px);
		line-height: 1.4;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.chips span {
		font-size: 12px;
		font-weight: 700;
		padding: 5px 10px;
		border: 1px solid #14131140;
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
		scroll-snap-align: start;
	}
	.pframe {
		display: block;
		padding: 8px;
		border: 1px solid var(--line);
		background: var(--ink-2);
		margin-bottom: 10px;
		transition: border-color 0.2s;
	}
	.pframe :global(.poster) {
		border-radius: 0;
	}
	.pcard:hover .pframe {
		border-color: var(--paper);
	}
	.pcard b {
		font-family: var(--display);
		font-weight: 400;
		font-size: 17px;
	}
	.pc {
		font-size: 12px;
		color: var(--accent);
		font-weight: 600;
	}
	.pm {
		font-size: 12px;
		color: var(--mist);
	}

	/* ---------- aliados ---------- */
	.works {
		padding-top: 72px;
		scroll-margin-top: 90px;
	}
	.partners {
		margin-top: 48px;
		padding: 36px 0;
		border-block: 1px solid var(--line);
		background: var(--ink-2);
		overflow: hidden;
	}
	.ptitle {
		margin: 0 auto 18px;
		font-size: 12px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--mist);
		font-weight: 600;
	}
	.marquee {
		overflow: hidden;
		mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
	}
	.mtrack {
		display: flex;
		width: max-content;
		animation: slide 50s linear infinite;
	}
	.partners:hover .mtrack {
		animation-play-state: paused;
	}
	.mgroup {
		display: flex;
		align-items: center;
	}
	.mgroup span {
		font-size: clamp(20px, 2.2vw, 28px);
		white-space: nowrap;
		color: var(--text-2);
		padding-inline: 28px;
		position: relative;
	}
	.mgroup span::after {
		content: '';
		position: absolute;
		right: -4px;
		top: 50%;
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--lime);
		translate: 0 -50%;
	}
	@keyframes slide {
		to {
			transform: translateX(-50%);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.mtrack {
			animation: none;
			flex-wrap: wrap;
		}
		.mgroup[aria-hidden='true'] {
			display: none;
		}
	}

	/* ---------- cómo comprar ---------- */
	.steps {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 40px;
		padding: 80px 0;
	}
	.steps div {
		border-top: 2px solid var(--paper);
		padding-top: 18px;
		display: grid;
		gap: 6px;
	}
	.steps .n {
		font-size: 34px;
		color: var(--accent);
	}
	.steps b {
		font-size: 17px;
	}
	.steps p {
		margin: 0;
		color: var(--mist);
		font-size: 14px;
	}

	/* ---------- contrataciones ---------- */
	.hire {
		background: var(--lime);
		color: #141311;
	}
	.hinner {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 24px;
		flex-wrap: wrap;
		padding: 56px 0;
	}
	.hk {
		font-size: 12px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		font-weight: 700;
	}
	.hire h2 {
		margin: 8px 0 0;
		font-size: clamp(28px, 3.6vw, 44px);
		max-width: 20ch;
		line-height: 1.08;
	}
	.hbtn {
		background: #141311;
		color: #fff;
		padding: 16px 28px;
	}
	.hbtn:hover {
		background: #000;
	}

	/* ---------- responsive ---------- */
	@media (max-width: 960px) {
		.figures {
			grid-template-columns: repeat(3, 1fr);
		}
		.figures div:nth-child(4) {
			border-left: 0;
			padding-left: 0;
		}
		.sgrid {
			grid-template-columns: 1fr 1fr;
			grid-template-rows: 320px 240px;
		}
		.tile.big {
			grid-column: span 2;
			grid-row: auto;
		}
		.egrid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.invite {
			grid-column: span var(--span2, 1);
		}
	}
	@media (max-width: 720px) {
		.banner {
			height: auto;
		}
		.bslide {
			position: relative;
			display: none;
		}
		.bslide.on {
			display: block;
		}
		.binner {
			grid-template-columns: 1fr;
			gap: 28px;
			padding: 36px 0 84px;
		}
		.art {
			order: -1;
			justify-self: start;
			width: 46%;
			max-width: 200px;
		}
		.bslide::after {
			background: linear-gradient(180deg, #14131199, #141311 60%);
		}
		.lede {
			font-size: 15px;
			margin-bottom: 24px;
		}
		.kicker {
			font-size: 11px;
			letter-spacing: 0.16em;
		}
		.figures {
			grid-template-columns: repeat(2, 1fr);
		}
		.figures div {
			padding: 22px 0;
			border-left: 0;
			border-top: 1px solid var(--line);
		}
		.figures div:nth-child(-n + 2) {
			border-top: 0;
		}
		.figures div:last-child {
			grid-column: span 2;
		}
		.program {
			padding-top: 56px;
		}
		.sgrid {
			grid-template-columns: 1fr;
			grid-template-rows: none;
			grid-auto-rows: 300px;
		}
		.tile.big {
			grid-column: auto;
		}
		.egrid {
			grid-template-columns: 1fr;
		}
		.invite {
			grid-column: auto;
		}
		.mtext {
			grid-template-columns: 1fr;
		}
		.steps {
			grid-template-columns: 1fr;
			gap: 26px;
			padding: 56px 0;
		}
		.story {
			padding-top: 64px;
		}
	}
</style>
