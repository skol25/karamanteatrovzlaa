<script lang="ts">
	/** Afiche generado con la estética del logo (luna dual, puntos de alas). Si la obra tiene imagen, se usa la imagen. */
	let {
		title,
		variant = 0,
		poster = null,
		past = false,
		size = 'md'
	}: { title: string; variant?: number; poster?: string | null; past?: boolean; size?: 'sm' | 'md' | 'lg' } = $props();

	const v = $derived(((variant % 4) + 4) % 4);
	const uid = Math.random().toString(36).slice(2, 8);
</script>

<div class="poster v{v} {size}" class:past class:img={!!poster}>
	{#if poster}
		{@const src = poster.startsWith('/') ? poster : '/archivo/' + poster}
		<img class="bg" {src} alt="" aria-hidden="true" loading="lazy" />
		<img class="fg" {src} alt={'Afiche de ' + title} loading="lazy" />
	{:else}
		<svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
			<defs>
				<clipPath id="half-{uid}"><rect x="0" y="0" width="150" height="400" /></clipPath>
				<radialGradient id="glow-{uid}" cx="50%" cy="38%" r="60%">
					<stop offset="0" stop-color="#abce26" stop-opacity=".22" />
					<stop offset="1" stop-color="#abce26" stop-opacity="0" />
				</radialGradient>
			</defs>
			{#if v === 0}
				<rect width="300" height="400" fill="#0d0d0d" />
				<rect width="300" height="400" fill="url(#glow-{uid})" />
				<circle cx="150" cy="150" r="92" fill="#abce26" />
				<circle cx="150" cy="150" r="92" fill="#0d0d0d" clip-path="url(#half-{uid})" />
				<circle cx="150" cy="150" r="92" fill="none" stroke="#abce26" stroke-width="1.5" />
				<path d="M150 58 C 118 104, 182 196, 150 242" fill="none" stroke="#0d0d0d" stroke-width="10" />
				<g fill="#abce26"><circle cx="48" cy="58" r="9" /><circle cx="72" cy="66" r="6" /><circle cx="90" cy="72" r="3.5" /></g>
				<g fill="#f2f2ee"><circle cx="252" cy="58" r="9" /><circle cx="228" cy="66" r="6" /><circle cx="210" cy="72" r="3.5" /></g>
			{:else if v === 1}
				<rect width="300" height="400" fill="#5d5d5d" />
				<circle cx="210" cy="120" r="150" fill="#0d0d0d" />
				<circle cx="210" cy="120" r="150" fill="none" stroke="#abce26" stroke-width="2" stroke-dasharray="2 9" />
				<circle cx="92" cy="96" r="34" fill="#abce26" />
				<g fill="#0d0d0d"><circle cx="40" cy="190" r="8" /><circle cx="40" cy="214" r="5" /><circle cx="40" cy="232" r="3" /></g>
			{:else if v === 2}
				<rect width="300" height="400" fill="#abce26" />
				<circle cx="150" cy="140" r="110" fill="#0d0d0d" />
				<circle cx="186" cy="118" r="54" fill="#abce26" />
				<circle cx="168" cy="118" r="54" fill="#0d0d0d" />
				<g fill="#f2f2ee"><circle cx="78" cy="96" r="7" /><circle cx="96" cy="82" r="4.5" /><circle cx="108" cy="72" r="2.5" /></g>
			{:else}
				<rect width="300" height="400" fill="#0d0d0d" />
				<circle cx="118" cy="150" r="88" fill="none" stroke="#abce26" stroke-width="3" />
				<circle cx="182" cy="150" r="88" fill="none" stroke="#f2f2ee" stroke-width="3" />
				<path d="M150 79 a88 88 0 0 1 0 142 a88 88 0 0 1 0 -142z" fill="#abce26" />
				<g fill="#abce26"><circle cx="40" cy="300" r="5" /><circle cx="58" cy="300" r="3.5" /><circle cx="72" cy="300" r="2" /></g>
			{/if}
		</svg>
		<div class="title">
			<span class="mark">Karamantea · Teatro</span>
			<span class="t display">{title}</span>
		</div>
	{/if}
</div>

<style>
	.poster {
		position: relative;
		aspect-ratio: 2 / 3;
	}
	.poster.img img.bg {
		filter: blur(18px) brightness(0.6);
		transform: scale(1.15);
	}
	.poster.img img.fg {
		object-fit: contain;
	}
	.poster {
		border-radius: 14px;
		overflow: hidden;
		background: #0d0d0d;
		isolation: isolate;
		box-shadow: 0 0 0 1px #ffffff10 inset;
	}
	svg,
	img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.title {
		position: absolute;
		inset: auto 0 0 0;
		padding: 18px 16px 16px;
		display: grid;
		gap: 6px;
		background: linear-gradient(to top, #0d0d0df2 30%, #0d0d0d00);
	}
	.v2 .title {
		background: linear-gradient(to top, #abce26 40%, #abce2600);
		color: #0d0d0d;
	}
	.mark {
		font-size: 9px;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		opacity: 0.7;
		font-weight: 700;
	}
	.t {
		font-size: 17px;
		line-height: 1.2;
		text-wrap: balance;
	}
	.sm .t {
		font-size: 14px;
	}
	.lg .t {
		font-size: clamp(20px, 2.4vw, 28px);
	}
	.past {
		filter: grayscale(1) contrast(0.9) brightness(0.8);
	}
</style>
