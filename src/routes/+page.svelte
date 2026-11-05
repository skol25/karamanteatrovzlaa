<script lang="ts">
	import Poster from '#lib/components/Poster.svelte';
	import { bs, dia, mes, diaSemana, hora, fechaLarga } from '#lib/format.ts';

	let { data } = $props();
	const price = (usd: number | null) => (usd != null && data.rate ? bs(usd * data.rate.rate) : null);
	const posterUrl = (p: string | null) => (p ? (p.startsWith('/') ? p : '/archivo/' + p) : null);
	const yearOf = (iso: string | null) => (iso ? new Date(iso).getFullYear() : '');

	// ---- Banner rotativo
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

	// ---- Trayectoria
	let track: HTMLDivElement | undefined = $state();
	const scrollTrack = (dir: number) => track?.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: 'smooth' });
</script>

<svelte:head>
	<title>Karamantea Teatro · Cartelera y entradas</title>
	<meta name="description" content="Cartelera, funciones y venta de entradas de Karamantea Group Producciones." />
</svelte:head>

<!-- ============ BANNER ============ -->
{#if total}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<section class="hero" aria-label="Obras destacadas" aria-roledescription="carrusel" onmouseenter={() => (paused = true)} onmouseleave={() => (paused = false)}>
		{#each data.slides as m, i (m.id)}
			<article class="slide" class:on={i === current} aria-hidden={i !== current}>
				{#if posterUrl(m.poster)}
					<div class="backdrop" style="background-image:url('{posterUrl(m.poster)}')"></div>
				{:else}
					<div class="backdrop masks"></div>
				{/if}
				<div class="wrap hgrid">
					<div class="copy">
						<span class="eyebrow">{i === 0 ? 'Karamantea Group presenta' : 'También en cartelera'}</span>
						<h1 class="display">{m.title}</h1>
						{#if m.tagline}<p class="tag">{m.tagline}</p>{/if}
						<ul class="facts">
							<li>
								<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
								<div><span>{m.upcoming > 1 ? 'Próxima función' : 'Función'}</span><b>{fechaLarga(m.next!)}</b></div>
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
							<a class="btn btn-lime" href="/obra/{m.slug}#funciones" tabindex={i === current ? 0 : -1}>Comprar entradas</a>
							{#if price(m.minPrice)}<span class="from">Desde <b>{price(m.minPrice)}</b></span>{/if}
						</div>
					</div>
					<a class="hposter" href="/obra/{m.slug}" aria-label="Ver {m.title}" tabindex={i === current ? 0 : -1}>
						<Poster title={m.title} variant={m.variant} poster={m.poster} size="lg" />
					</a>
				</div>
			</article>
		{/each}
		{#if total > 1}
			<button class="harrow l" onclick={() => go(current - 1)} aria-label="Anterior">
				<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg>
			</button>
			<button class="harrow r" onclick={() => go(current + 1)} aria-label="Siguiente">
				<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
			</button>
			<div class="dots">
				{#each data.slides as s, i (s.id)}
					<button class:on={i === current} onclick={() => go(i)} aria-label="Ir a {s.title}"></button>
				{/each}
			</div>
		{/if}
	</section>
{:else}
	<section class="hero empty">
		<div class="backdrop masks"></div>
		<div class="wrap">
			<span class="eyebrow">Próximamente</span>
			<h1 class="display">Muy pronto, nueva temporada</h1>
			<p class="tag">Escríbenos por WhatsApp para enterarte primero.</p>
		</div>
	</section>
{/if}

<!-- ============ PRÓXIMOS EVENTOS ============ -->
<section id="funciones" class="wrap events">
	<header class="shead">
		<div>
			<span class="eyebrow">Cartelera</span>
			<h2 class="display">Próximos eventos</h2>
		</div>
		{#if cities.length > 1}
			<div class="filters" role="tablist" aria-label="Filtrar por ciudad">
				{#each ['Todas', ...cities] as c (c)}
					<button role="tab" aria-selected={city === c} class:on={city === c} onclick={() => (city = c)}>{c}</button>
				{/each}
			</div>
		{/if}
	</header>

	{#if events.length}
		<div class="egrid">
			{#each events as p (p.id)}
				<a class="ecard" href="/obra/{p.slug}?funcion={p.id}#funciones">
					<div class="media">
						{#if posterUrl(p.poster)}
							<img class="bg" src={posterUrl(p.poster)} alt="" aria-hidden="true" loading="lazy" />
							<img class="fg" src={posterUrl(p.poster)} alt="Afiche de {p.title}" loading="lazy" />
						{:else}
							<div class="gen"><Poster title={p.title} variant={p.variant} size="sm" /></div>
						{/if}
						{#if p.left <= 0}
							<span class="badge sold">Agotado</span>
						{:else if p.left <= 20}
							<span class="badge few">¡Últimas {p.left} entradas!</span>
						{:else}
							<span class="badge">{p.genre || 'Teatro'}</span>
						{/if}
					</div>
					<div class="ebody">
						<div class="einfo">
							<b class="etitle">{p.title}</b>
							<span class="evenue">{p.venue}</span>
							<span class="etime">{diaSemana(p.starts_at)} · {hora(p.starts_at)}</span>
						</div>
						<div class="edate">
							<span class="d">{dia(p.starts_at)}</span>
							<span class="m">{mes(p.starts_at)}</span>
						</div>
					</div>
					<div class="efoot">
						<span>{#if price(p.price_usd)}Desde <b>{price(p.price_usd)}</b>{/if}</span>
						<span class="go">{p.left <= 0 ? 'Ver detalle' : 'Comprar'} <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
					</div>
				</a>
			{/each}
			<a class="ecard ally" href="https://wa.me/584249392784" target="_blank" rel="noopener">
				<span class="eyebrow">Aliados</span>
				<b>¿Quieres llevar una obra a tu ciudad o patrocinar un evento?</b>
				<p>Karamantea Group lleva espectáculos a hoteles, restaurantes y salas de todo el país. Escríbenos y armamos el plan para tu marca.</p>
				<span class="go">Escribir por WhatsApp <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
			</a>
		</div>
	{:else}
		<div class="empty-ev card">
			<b>Pronto anunciaremos nuevas funciones</b>
			<p>Escríbenos y te avisamos apenas salgan a la venta.</p>
			<a class="btn btn-ghost" href="https://wa.me/584249392784" target="_blank" rel="noopener">Escribir por WhatsApp</a>
		</div>
	{/if}
</section>

<!-- ============ CÓMO COMPRAR ============ -->
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

<!-- ============ TRAYECTORIA ============ -->
{#if data.past.length}
	<section id="trayectoria" class="story">
		<div class="wrap sgrid">
			<div class="sintro">
				<span class="eyebrow">Nuestra trayectoria</span>
				<h2 class="display">Eventos que hemos realizado</h2>
				<p>
					Karamantea Group lleva el teatro a hoteles, restaurantes y salas de todo el país. Estas son algunas de las obras que ya
					hemos presentado.
				</p>
				<dl class="stats">
					<div><dt>Obras</dt><dd>{data.stats.shows}</dd></div>
					<div><dt>Funciones</dt><dd>{data.stats.performances}</dd></div>
					<div><dt>Ciudades</dt><dd>{data.stats.cities}</dd></div>
				</dl>
				<div class="snav">
					<button onclick={() => scrollTrack(-1)} aria-label="Anterior"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg></button>
					<button onclick={() => scrollTrack(1)} aria-label="Siguiente"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg></button>
				</div>
			</div>
			<div class="strack" bind:this={track}>
				{#each data.past as s (s.id)}
					<a class="pcard" href="/obra/{s.slug}">
						<Poster title={s.title} variant={s.variant} poster={s.poster} size="sm" />
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
	svg {
		width: 20px;
		height: 20px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.8;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	/* ---------- banner ---------- */
	.hero {
		position: relative;
		overflow: hidden;
		isolation: isolate;
		min-height: 600px;
		display: grid;
	}
	.hero.empty {
		min-height: 0;
		padding: 140px 0;
	}
	.slide {
		grid-area: 1 / 1;
		position: relative;
		isolation: isolate;
		padding: 64px 0 80px;
		display: flex;
		align-items: center;
		opacity: 0;
		visibility: hidden;
		transition:
			opacity 0.7s,
			visibility 0.7s;
	}
	.slide.on {
		opacity: 1;
		visibility: visible;
	}
	.slide .wrap {
		width: min(var(--wrap), 100% - 32px);
	}
	.backdrop {
		position: absolute;
		inset: -40px;
		z-index: -2;
		background-size: cover;
		background-position: center;
		filter: blur(40px) saturate(1.2);
		opacity: 0.4;
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
	.slide::after,
	.hero.empty::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		background:
			linear-gradient(90deg, var(--ink) 12%, color-mix(in srgb, var(--ink) 50%, transparent) 60%, color-mix(in srgb, var(--ink) 25%, transparent)),
			linear-gradient(0deg, var(--ink) 0%, transparent 30%);
	}
	.hgrid {
		display: grid;
		grid-template-columns: 1fr 340px;
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
		margin: 0;
		max-width: 44ch;
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
	.harrow {
		position: absolute;
		top: 50%;
		translate: 0 -50%;
		z-index: 2;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		border: 1px solid #ffffff22;
		background: #0b0b0bb3;
		backdrop-filter: blur(6px);
		display: grid;
		place-items: center;
		cursor: pointer;
		transition: 0.2s;
	}
	.harrow:hover {
		border-color: var(--lime);
		color: var(--lime);
	}
	.harrow.l {
		left: 20px;
	}
	.harrow.r {
		right: 20px;
	}
	.dots {
		position: absolute;
		bottom: 26px;
		left: 50%;
		translate: -50% 0;
		display: flex;
		gap: 8px;
		z-index: 2;
	}
	.dots button {
		width: 8px;
		height: 8px;
		border-radius: 8px;
		border: 0;
		padding: 0;
		background: #ffffff44;
		cursor: pointer;
		transition: width 0.3s;
	}
	.dots button.on {
		width: 28px;
		background: var(--lime);
	}

	/* ---------- próximos eventos ---------- */
	.events {
		padding: 64px 0 72px;
		scroll-margin-top: 72px;
	}
	.shead {
		display: flex;
		justify-content: space-between;
		align-items: end;
		gap: 20px;
		flex-wrap: wrap;
		margin-bottom: 28px;
	}
	.shead h2,
	.sintro h2 {
		font-size: clamp(26px, 3.2vw, 36px);
		margin: 10px 0 0;
	}
	.filters {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}
	.filters button {
		border: 1px solid var(--line);
		background: var(--ink-2);
		padding: 9px 16px;
		border-radius: 999px;
		font-size: 13px;
		font-weight: 700;
		color: var(--mist);
		cursor: pointer;
	}
	.filters button.on {
		background: var(--lime);
		border-color: var(--lime);
		color: var(--ink);
	}
	.egrid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 22px;
	}
	.ecard {
		display: flex;
		flex-direction: column;
		border-radius: var(--radius);
		background: var(--ink-2);
		border: 1px solid var(--line);
		overflow: hidden;
		transition:
			transform 0.25s,
			border-color 0.25s,
			box-shadow 0.25s;
	}
	.ecard:hover {
		transform: translateY(-4px);
		border-color: #abce2688;
		box-shadow: 0 20px 40px -20px #000;
	}
	.media {
		position: relative;
		aspect-ratio: 16 / 10;
		overflow: hidden;
		background: #000;
	}
	.media img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	.media .bg {
		object-fit: cover;
		filter: blur(20px) brightness(0.55);
		transform: scale(1.2);
	}
	.media .fg {
		object-fit: contain;
		transition: transform 0.4s;
	}
	.ecard:hover .fg {
		transform: scale(1.04);
	}
	.media .gen {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 12px;
	}
	.media .gen :global(.poster) {
		height: 100%;
		aspect-ratio: 2/3;
	}
	.badge {
		position: absolute;
		top: 12px;
		left: 12px;
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.04em;
		padding: 6px 10px;
		border-radius: 999px;
		background: #0b0b0bcc;
		backdrop-filter: blur(6px);
		color: var(--paper);
	}
	.badge.few {
		background: #ffb547;
		color: var(--ink);
	}
	.badge.sold {
		background: var(--danger);
		color: #fff;
	}
	.ebody {
		display: flex;
		gap: 14px;
		padding: 18px 18px 14px;
		flex: 1;
	}
	.einfo {
		display: grid;
		gap: 3px;
		min-width: 0;
		flex: 1;
		align-content: start;
	}
	.etitle {
		font-size: 16px;
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.evenue {
		font-size: 13px;
		color: var(--mist);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.etime {
		font-size: 12px;
		color: var(--lime);
		font-weight: 700;
		text-transform: capitalize;
	}
	.edate {
		display: grid;
		justify-items: center;
		align-content: start;
		line-height: 1;
		padding-left: 14px;
		border-left: 1px solid var(--line);
		text-transform: uppercase;
	}
	.edate .d {
		font-size: 30px;
		font-weight: 800;
		color: var(--lime);
	}
	.edate .m {
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.15em;
		color: var(--mist);
		margin-top: 5px;
	}
	.efoot {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 14px 18px;
		border-top: 1px solid var(--line);
		font-size: 13px;
		color: var(--mist);
	}
	.efoot b {
		color: var(--paper);
		font-size: 15px;
		margin-left: 2px;
	}
	.go {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-weight: 800;
		color: var(--lime);
	}
	.go svg {
		width: 16px;
		height: 16px;
		transition: translate 0.2s;
	}
	.ecard:hover .go svg {
		translate: 3px 0;
	}
	.ecard.ally {
		justify-content: center;
		gap: 14px;
		padding: 32px 28px;
		border-style: dashed;
		background:
			radial-gradient(circle at 100% 0, #abce2622, transparent 60%),
			var(--ink-2);
	}
	.ally b {
		font-size: 22px;
		line-height: 1.25;
		letter-spacing: -0.01em;
	}
	.ally p {
		margin: 0;
		color: var(--mist);
		font-size: 14px;
		line-height: 1.6;
	}
	.empty-ev {
		display: grid;
		justify-items: start;
		gap: 8px;
		padding: 32px;
	}
	.empty-ev p {
		margin: 0 0 10px;
		color: var(--mist);
	}

	/* ---------- cómo comprar ---------- */
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

	/* ---------- trayectoria ---------- */
	.story {
		position: relative;
		padding: 80px 0;
		overflow: hidden;
		isolation: isolate;
	}
	.story::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		background:
			linear-gradient(90deg, var(--ink) 30%, transparent),
			url('/masks.jpg') right -200px center / 800px no-repeat;
		opacity: 0.6;
	}
	.sgrid {
		display: grid;
		grid-template-columns: 340px 1fr;
		gap: 48px;
		align-items: center;
	}
	.sintro p {
		color: #cfcfcf;
		line-height: 1.7;
		margin: 16px 0 28px;
	}
	.stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
		margin: 0 0 28px;
	}
	.stats div {
		padding: 14px 12px;
		border-radius: 14px;
		background: var(--ink-2);
		border: 1px solid var(--line);
	}
	.stats dt {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: var(--mist);
	}
	.stats dd {
		margin: 4px 0 0;
		font-size: 32px;
		font-weight: 800;
		color: var(--lime);
		line-height: 1;
	}
	.snav {
		display: flex;
		gap: 8px;
	}
	.snav button {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: 1px solid var(--line);
		background: var(--ink-2);
		display: grid;
		place-items: center;
		cursor: pointer;
	}
	.snav button:hover {
		border-color: var(--lime);
		color: var(--lime);
	}
	.strack {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: 210px;
		gap: 18px;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		padding-bottom: 6px;
		scrollbar-width: none;
		mask-image: linear-gradient(to right, #000 85%, transparent);
	}
	.strack::-webkit-scrollbar {
		display: none;
	}
	.pcard {
		display: grid;
		gap: 4px;
		scroll-snap-align: start;
		align-content: start;
	}
	.pcard :global(.poster) {
		margin-bottom: 10px;
		transition: transform 0.3s;
	}
	.pcard:hover :global(.poster) {
		transform: translateY(-4px);
	}
	.pcard b {
		font-size: 15px;
		line-height: 1.3;
	}
	.pc {
		font-size: 13px;
		color: var(--lime);
		font-weight: 600;
	}
	.pm {
		font-size: 12px;
		color: var(--mist);
	}

	@media (max-width: 900px) {
		.hero {
			min-height: 0;
		}
		.slide {
			padding: 28px 0 64px;
			align-items: start;
		}
		.hgrid {
			grid-template-columns: 1fr;
			gap: 28px;
		}
		.hposter {
			order: -1;
			max-width: 240px;
		}
		.harrow {
			display: none;
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
		.sgrid {
			grid-template-columns: 1fr;
		}
		.snav {
			display: none;
		}
		.strack {
			grid-auto-columns: 46%;
		}
	}
</style>
