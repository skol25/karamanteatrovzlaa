<script lang="ts">
	import type { PublicVideo } from '#lib/server/videos.ts';

	let { videos }: { videos: PublicVideo[] } = $props();

	let track: HTMLDivElement | undefined = $state();
	let atStart = $state(true);
	let atEnd = $state(false);
	let dialog: HTMLDialogElement | undefined = $state();
	let open = $state<number | null>(null);
	const cur = $derived(open != null ? videos[open] : null);

	function update() {
		if (!track) return;
		atStart = track.scrollLeft < 8;
		atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
	}
	const scroll = (dir: number) => track?.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: 'smooth' });
	$effect(() => {
		if (!track) return;
		update();
		const ro = new ResizeObserver(update);
		ro.observe(track);
		return () => ro.disconnect();
	});

	function show(i: number) {
		open = i;
		if (!dialog?.open) dialog?.showModal();
	}
	function close() {
		dialog?.close();
	}
	const step = (d: number) => open != null && show((open + d + videos.length) % videos.length);

	function key(e: KeyboardEvent) {
		if (e.key === 'ArrowRight') step(1);
		if (e.key === 'ArrowLeft') step(-1);
	}

	// Vista previa sin sonido al pasar el mouse (solo videos subidos, solo en computadoras)
	const canHover = typeof matchMedia !== 'undefined' && matchMedia('(hover: hover)').matches;
	function preview(e: Event, on: boolean) {
		if (!canHover) return;
		const v = (e.currentTarget as HTMLElement).querySelector('video');
		if (!v) return;
		if (on) v.play().catch(() => {});
		else {
			v.pause();
			v.currentTime = 0.5;
		}
	}
</script>

<section class="wrap reel" aria-label="Videos">
	<header class="phead">
		<div class="ttl">
			<h2 class="display">En escena</h2>
			<span class="tag">{videos.length} {videos.length === 1 ? 'video' : 'videos'}</span>
		</div>
		<div class="snav" class:hidden={atStart && atEnd}>
			<button onclick={() => scroll(-1)} disabled={atStart} aria-label="Anterior">←</button>
			<button onclick={() => scroll(1)} disabled={atEnd} aria-label="Siguiente">→</button>
		</div>
	</header>

	<div class="track" bind:this={track} onscroll={update}>
		{#each videos as v, i (v.id)}
			<button class="vcard" onclick={() => show(i)} onmouseenter={(e) => preview(e, true)} onmouseleave={(e) => preview(e, false)} aria-label="Ver video: {v.title}">
				<span class="frame">
					{#if v.kind === 'archivo'}
						<video src="{v.src}#t=0.5" poster={v.cover ?? undefined} muted loop playsinline preload={v.cover ? 'none' : 'metadata'}></video>
					{:else if v.cover}
						<img src={v.cover} alt="" loading="lazy" />
					{:else}
						<span class="ph"><span>{v.kind === 'instagram' ? 'Instagram' : 'Video'}</span></span>
					{/if}
					<span class="play" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg></span>
				</span>
				<b>{v.title}</b>
				{#if v.caption || v.show}<small>{v.caption || v.show?.title}</small>{/if}
			</button>
		{/each}
	</div>
</section>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events -->
<dialog bind:this={dialog} class="lightbox" onclose={() => (open = null)} onkeydown={key} onclick={(e) => e.target === dialog && close()} aria-label={cur?.title}>
	{#if cur}
		<div class="stage" class:wide={!cur.vertical}>
			{#key cur.id}
				{#if cur.kind === 'archivo'}
					<!-- svelte-ignore a11y_media_has_caption -->
					<video src={cur.src} poster={cur.cover ?? undefined} controls autoplay playsinline></video>
				{:else if cur.kind === 'youtube'}
					<iframe
						src="https://www.youtube-nocookie.com/embed/{cur.src}?autoplay=1&rel=0&playsinline=1"
						title={cur.title}
						allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
						allowfullscreen
					></iframe>
				{:else}
					<iframe class="ig" src="https://www.instagram.com/{cur.src}/embed/" title={cur.title} allow="autoplay; encrypted-media" scrolling="no"></iframe>
				{/if}
			{/key}
		</div>
		<div class="meta">
			<div>
				<b>{cur.title}</b>
				{#if cur.caption}<span>{cur.caption}</span>{/if}
			</div>
			{#if cur.show}<a href="/obra/{cur.show.slug}" onclick={close}>Ver la obra →</a>{/if}
		</div>
		{#if videos.length > 1}
			<button class="nav prev" onclick={() => step(-1)} aria-label="Video anterior">←</button>
			<button class="nav next" onclick={() => step(1)} aria-label="Video siguiente">→</button>
		{/if}
		<button class="x" onclick={close} aria-label="Cerrar">×</button>
	{/if}
</dialog>

<style>
	.reel {
		padding: 72px 0 80px;
	}
	.phead {
		display: flex;
		justify-content: space-between;
		align-items: end;
		gap: 16px;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--paper);
	}
	.ttl {
		display: flex;
		align-items: baseline;
		gap: 18px;
		flex-wrap: wrap;
	}
	h2 {
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
	.snav {
		display: flex;
		gap: 6px;
	}
	.snav.hidden {
		display: none;
	}
	.snav button {
		width: 40px;
		height: 40px;
		border: 1px solid var(--line);
		background: var(--ink-2);
		cursor: pointer;
		font-size: 15px;
	}
	.snav button:hover:not(:disabled) {
		border-color: var(--paper);
	}
	.snav button:disabled {
		opacity: 0.35;
		cursor: default;
	}
	.track {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: 216px;
		gap: 22px;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		scrollbar-width: none;
		padding-top: 28px;
		align-items: start;
	}
	.track::-webkit-scrollbar {
		display: none;
	}
	.vcard {
		scroll-snap-align: start;
		display: grid;
		gap: 4px;
		text-align: left;
		background: none;
		border: 0;
		padding: 0;
		cursor: pointer;
		color: inherit;
		font: inherit;
	}
	.frame {
		position: relative;
		display: block;
		aspect-ratio: 9 / 16;
		padding: 8px;
		border: 1px solid var(--line);
		background: var(--ink-2);
		margin-bottom: 10px;
		transition: border-color 0.2s;
	}
	.frame video,
	.frame img,
	.ph {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		background: var(--ink-3);
	}
	.ph {
		display: grid;
		place-items: center;
		background: linear-gradient(160deg, #23211e, #3b3833);
		color: #fff9;
		font-size: 11px;
		letter-spacing: 0.2em;
		text-transform: uppercase;
	}
	.play {
		position: absolute;
		left: 50%;
		top: 50%;
		translate: -50% -50%;
		width: 54px;
		height: 54px;
		border-radius: 50%;
		background: #faf8f4e6;
		color: var(--paper);
		display: grid;
		place-items: center;
		padding-left: 3px;
		box-shadow: 0 6px 20px #0003;
		transition:
			transform 0.2s,
			opacity 0.2s;
	}
	.vcard:hover .frame {
		border-color: var(--paper);
	}
	.vcard:hover .play {
		transform: scale(1.08);
	}
	@media (hover: hover) {
		.vcard:hover .play {
			opacity: 0;
		}
	}
	.vcard b {
		font-family: var(--display);
		font-weight: 400;
		font-size: 17px;
		line-height: 1.25;
	}
	.vcard small {
		font-size: 12px;
		color: var(--mist);
	}

	/* ---------- reproductor ---------- */
	.lightbox {
		border: 0;
		padding: 0;
		background: transparent;
		max-width: 100vw;
		max-height: 100vh;
		width: 100vw;
		height: 100vh;
		display: none;
		overflow: hidden;
	}
	.lightbox[open] {
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 14px;
	}
	.lightbox::backdrop {
		background: #0d0c0bf0;
	}
	.stage {
		height: min(80vh, 820px);
		aspect-ratio: 9 / 16;
		max-width: 92vw;
		background: #000;
	}
	.stage.wide {
		height: auto;
		width: min(92vw, 1100px);
		aspect-ratio: 16 / 9;
		max-height: 80vh;
	}
	.stage video,
	.stage iframe {
		width: 100%;
		height: 100%;
		border: 0;
		display: block;
		background: #000;
	}
	.stage iframe.ig {
		background: #fff;
	}
	.meta {
		width: min(92vw, 460px);
		display: flex;
		justify-content: space-between;
		gap: 16px;
		align-items: baseline;
		color: #f3f0ea;
	}
	.stage.wide + .meta {
		width: min(92vw, 1100px);
	}
	.meta div {
		display: grid;
		gap: 2px;
	}
	.meta b {
		font-family: var(--display);
		font-weight: 400;
		font-size: 20px;
	}
	.meta span {
		color: #f3f0ea99;
		font-size: 13px;
	}
	.meta a {
		color: var(--lime);
		font-size: 12px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-weight: 700;
		white-space: nowrap;
	}
	.nav,
	.x {
		position: fixed;
		background: #ffffff14;
		border: 1px solid #ffffff2e;
		color: #fff;
		cursor: pointer;
		display: grid;
		place-items: center;
	}
	.nav {
		top: 50%;
		translate: 0 -50%;
		width: 48px;
		height: 48px;
		font-size: 18px;
	}
	.nav:hover,
	.x:hover {
		background: #ffffff2e;
	}
	.prev {
		left: 24px;
	}
	.next {
		right: 24px;
	}
	.x {
		top: 18px;
		right: 18px;
		width: 44px;
		height: 44px;
		font-size: 26px;
		line-height: 1;
	}
	@media (max-width: 640px) {
		.reel {
			padding: 56px 0 56px;
		}
		.track {
			grid-auto-columns: 58%;
			gap: 14px;
		}
		.snav {
			display: none;
		}
		.stage {
			height: auto;
			width: 100vw;
			max-width: 100vw;
			max-height: 76vh;
		}
		.nav {
			top: 18px;
			translate: none;
			width: 44px;
			height: 44px;
		}
		.prev {
			left: 18px;
		}
		.next {
			left: 70px;
			right: auto;
		}
		.meta {
			padding-inline: 16px;
		}
	}
</style>
