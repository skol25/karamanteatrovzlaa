<script lang="ts">
	import type { Snippet } from 'svelte';
	let { label, eyebrow, children, id }: { label: string; eyebrow?: string; children: Snippet; id?: string } = $props();
	let track: HTMLDivElement;
	let atStart = $state(true);
	let atEnd = $state(false);

	function update() {
		if (!track) return;
		atStart = track.scrollLeft < 8;
		atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
	}
	function go(dir: number) {
		track.scrollBy({ left: dir * track.clientWidth * 0.85, behavior: 'smooth' });
	}
	$effect(() => {
		update();
		const ro = new ResizeObserver(update);
		ro.observe(track);
		return () => ro.disconnect();
	});
</script>

<section class="carousel" {id} aria-label={label}>
	<header class="wrap head">
		<div>
			{#if eyebrow}<span class="eyebrow">{eyebrow}</span>{/if}
			<h2 class="display">{label}</h2>
		</div>
		<div class="nav" class:hidden={atStart && atEnd}>
			<button class="arrow" onclick={() => go(-1)} disabled={atStart} aria-label="Anterior">
				<svg viewBox="0 0 24 24" width="20" height="20"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" /></svg>
			</button>
			<button class="arrow" onclick={() => go(1)} disabled={atEnd} aria-label="Siguiente">
				<svg viewBox="0 0 24 24" width="20" height="20"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" /></svg>
			</button>
		</div>
	</header>
	<div class="track" bind:this={track} onscroll={update}>
		{@render children()}
	</div>
</section>

<style>
	.carousel {
		padding: 56px 0 8px;
	}
	.head {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 22px;
	}
	h2 {
		margin: 10px 0 0;
		font-size: clamp(24px, 3vw, 34px);
	}
	.nav {
		display: flex;
		gap: 8px;
	}
	.nav.hidden {
		display: none;
	}
	.arrow {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: 1px solid var(--line);
		background: var(--ink-2);
		display: grid;
		place-items: center;
		cursor: pointer;
		transition: 0.2s;
	}
	.arrow:hover:not(:disabled) {
		border-color: var(--accent);
		color: var(--accent);
	}
	.arrow:disabled {
		opacity: 0.3;
		cursor: default;
	}
	.track {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: var(--item, 240px);
		gap: 18px;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		scroll-padding-inline: max(16px, (100vw - var(--wrap)) / 2);
		padding: 4px max(16px, (100vw - var(--wrap)) / 2) 18px;
		scrollbar-width: none;
	}
	.track::-webkit-scrollbar {
		display: none;
	}
	.track > :global(*) {
		scroll-snap-align: start;
	}
	@media (max-width: 640px) {
		.nav {
			display: none;
		}
		.track {
			grid-auto-columns: var(--item-sm, 70%);
		}
	}
</style>
