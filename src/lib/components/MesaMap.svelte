<script lang="ts">
	import { TABLE_R, CHAIR_R, SEAT, type ExpandedMap } from '#lib/seatmap.ts';

	/** Plano para el cliente (y vista previa en el admin): mesas con sillas y bloques de butacas */
	let {
		map,
		taken = new Set<string>(),
		picked = [],
		ontoggle,
		ontable,
		readonly = false,
		prices = false
	}: {
		map: ExpandedMap;
		taken?: Set<string>;
		picked?: string[];
		ontoggle?: (id: string) => void;
		ontable?: (ids: string[]) => void;
		readonly?: boolean;
		prices?: boolean;
	} = $props();

	const pickedSet = $derived(new Set(picked));
	const color = $derived(Object.fromEntries(map.zones.map((z) => [z.id, z.color])));
	const zname = $derived(Object.fromEntries(map.zones.map((z) => [z.id, z.name])));
	const usd = (n: number) => '$' + (Number.isInteger(n) ? n : n.toFixed(2));
	const key = (e: KeyboardEvent, fn: () => void) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			fn();
		}
	};
	const clickSeat = (id: string) => !readonly && !taken.has(id) && ontoggle?.(id);
</script>

<div class="mm" class:ro={readonly}>
	<div class="scroll">
		<svg viewBox="0 0 {map.w} {map.h}" role="group" aria-label="Plano de la sala" style="--minw:{Math.min(map.w, 760)}px">
			<rect x={map.stage.x} y={map.stage.y} width={map.stage.w} height={map.stage.h} rx="6" class="stage" />
			<text x={map.stage.x + map.stage.w / 2} y={map.stage.y + map.stage.h / 2 + 7} text-anchor="middle" class="stage-t">{map.stage.label.toUpperCase()}</text>

			{#each map.labels as l, i (i)}
				<text x={l.x} y={l.y} text-anchor={l.anchor} class="rowl">{l.text}</text>
			{/each}

			{#each map.seats as s (s.id)}
				{@const isTaken = taken.has(s.id)}
				{@const isMine = pickedSet.has(s.id)}
				{@const label = s.kind === 'silla' ? `Mesa ${s.table}, puesto ${s.chair}` : `Fila ${s.row}, asiento ${s.num}`}
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<g
					class="seat {s.kind}"
					class:taken={isTaken}
					class:mine={isMine}
					style="--zc:{color[s.zone]}"
					role={readonly || isTaken ? undefined : 'button'}
					tabindex={readonly || isTaken ? undefined : 0}
					aria-pressed={readonly || isTaken ? undefined : isMine}
					aria-label="{label}, {zname[s.zone]}{isTaken ? ', ocupado' : ''}"
					onclick={() => clickSeat(s.id)}
					onkeydown={(e) => key(e, () => clickSeat(s.id))}
				>
					<title>{label.replace(', ', ' · ')}</title>
					{#if s.kind === 'silla'}
						<circle cx={s.x.toFixed(1)} cy={s.y.toFixed(1)} r={CHAIR_R} />
					{:else}
						<rect x={s.x - SEAT / 2} y={s.y - SEAT / 2} width={SEAT} height={SEAT} rx="4" />
					{/if}
				</g>
			{/each}

			{#each map.tables as t (t.n)}
				{@const free = t.seatIds.filter((id) => !taken.has(id))}
				{@const mine = t.seatIds.some((id) => pickedSet.has(id))}
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<g
					class="mesa"
					class:on={mine}
					class:full={free.length === 0}
					style="--zc:{color[t.zone]}"
					role={readonly || !free.length ? undefined : 'button'}
					tabindex={readonly || !free.length ? undefined : 0}
					aria-label="Mesa {t.n}, {zname[t.zone]}: elegir los {free.length} puestos libres"
					onclick={() => !readonly && free.length && ontable?.(free)}
					onkeydown={(e) => !readonly && free.length && key(e, () => ontable?.(free))}
				>
					<title>Mesa {t.n}{free.length ? ` · elegir mesa completa (${free.length} libres)` : ' · completa'}</title>
					<circle cx={t.x} cy={t.y} r={TABLE_R} />
					<text x={t.x} y={t.y + 5} text-anchor="middle">{t.n}</text>
				</g>
			{/each}
		</svg>
	</div>
	<div class="legend">
		{#each map.zones as z (z.id)}<span><i style="background:{z.color}"></i>{z.name}{#if prices} · {usd(z.price)}{/if}</span>{/each}
		<span><i class="lmine"></i>Tu selección</span>
		<span><i class="ltaken"></i>Ocupado</span>
	</div>
</div>

<style>
	.scroll {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}
	svg {
		display: block;
		width: 100%;
		height: auto;
		min-width: var(--minw, 680px);
	}
	.stage {
		fill: var(--paper);
	}
	.stage-t {
		font-family: Georgia, serif;
		font-size: 20px;
		letter-spacing: 8px;
		fill: var(--lime);
	}
	.rowl {
		font-family: Arial, sans-serif;
		font-size: 11px;
		font-weight: bold;
		fill: #9a948a;
	}
	.seat circle,
	.seat rect {
		fill: color-mix(in srgb, var(--zc) 16%, #fff);
		stroke: var(--zc);
		stroke-width: 1.6;
		transition:
			fill 0.15s,
			stroke-width 0.15s;
	}
	.seat {
		cursor: pointer;
		outline: none;
	}
	.seat:hover circle,
	.seat:hover rect,
	.seat:focus-visible circle,
	.seat:focus-visible rect {
		fill: color-mix(in srgb, var(--zc) 45%, #fff);
		stroke-width: 2.4;
	}
	.seat.mine circle,
	.seat.mine rect {
		fill: var(--lime);
		stroke: var(--paper);
		stroke-width: 2;
	}
	.seat.taken {
		cursor: not-allowed;
	}
	.seat.taken circle,
	.seat.taken rect {
		fill: #d6d0c6;
		stroke: #c9c3b8;
		stroke-width: 1;
	}
	.mesa {
		cursor: pointer;
		outline: none;
	}
	.mesa circle {
		fill: #fff;
		stroke: var(--zc);
		stroke-width: 2;
		transition: fill 0.15s;
	}
	.mesa:hover circle,
	.mesa:focus-visible circle {
		fill: color-mix(in srgb, var(--zc) 20%, #fff);
	}
	.mesa.on circle {
		stroke: var(--paper);
		stroke-width: 2.6;
	}
	.mesa.full {
		cursor: default;
	}
	.mesa.full circle {
		stroke: #c9c3b8;
	}
	.mesa text {
		font-family: Georgia, serif;
		font-size: 15px;
		fill: var(--paper);
		pointer-events: none;
	}
	.ro .seat,
	.ro .mesa {
		cursor: default;
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 8px 20px;
		margin-top: 14px;
		font-size: 13px;
		color: var(--mist);
	}
	.legend span {
		display: flex;
		align-items: center;
		gap: 7px;
	}
	.legend i {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		display: inline-block;
	}
	.lmine {
		background: var(--lime);
		border: 2px solid var(--paper);
	}
	.ltaken {
		background: #d6d0c6;
	}
</style>
