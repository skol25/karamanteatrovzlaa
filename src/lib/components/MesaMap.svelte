<script lang="ts">
	import type { ExpandedMap } from '#lib/seatmap.ts';

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

	// Medidas del dibujo (el SVG se adapta al ancho disponible)
	const W = 1240;
	const ROW_H = 118;
	const TABLE_R = 24;
	const CHAIR_R = 7.5;
	const CHAIR_D = 38;
	const TOP = 150;

	const pickedSet = $derived(new Set(picked));
	const usd = (n: number) => '$' + (Number.isInteger(n) ? n : n.toFixed(2));

	type Chair = { id: string; x: number; y: number; chair: number };
	type Tbl = { n: number; x: number; y: number; zone: string; color: string; zoneName: string; chairs: Chair[] };

	const layout = $derived.by(() => {
		const tables: Tbl[] = [];
		const labels: { x: number; y: number; text: string; color: string; zone?: boolean }[] = [];
		let y = TOP;
		let prev = '';
		map.rows.forEach((row, i) => {
			if (row.zone.id !== prev) {
				if (prev) y += 24;
				labels.push({ x: 20, y: y - 62, text: row.zone.name.toUpperCase() + (prices ? ` · ${usd(row.zone.price)}` : ''), color: row.zone.color, zone: true });
				prev = row.zone.id;
			}
			labels.push({ x: 20, y: y + 5, text: `F${i + 1}`, color: '#9a948a' });
			const n = row.tables.length;
			const gap = (W - 80) / n;
			row.tables.forEach((t, k) => {
				const cx = 60 + gap * k + gap / 2;
				const chairs = t.seats.map((s, j) => {
					const a = -Math.PI / 2 + (j * 2 * Math.PI) / t.seats.length;
					return { id: s.id, chair: s.chair, x: cx + CHAIR_D * Math.cos(a), y: y + CHAIR_D * Math.sin(a) };
				});
				tables.push({ n: t.n, x: cx, y, zone: row.zone.id, color: row.zone.color, zoneName: row.zone.name, chairs });
			});
			y += ROW_H;
		});
		return { tables, labels, height: y - 40 };
	});

	const key = (e: KeyboardEvent, fn: () => void) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			fn();
		}
	};
</script>

<div class="mm" class:ro={readonly}>
	<div class="scroll">
		<svg viewBox="0 0 {W} {layout.height}" role="group" aria-label="Plano de mesas">
			<rect x={W / 2 - 330} y="30" width="660" height="56" rx="6" class="stage" />
			<text x={W / 2} y="65" text-anchor="middle" class="stage-t">ESCENARIO</text>
			{#each layout.labels as l, i (i)}
				<text x={l.x} y={l.y} class:zl={l.zone} class="lbl" fill={l.color}>{l.text}</text>
			{/each}
			{#each layout.tables as t (t.n)}
				{@const free = t.chairs.filter((c) => !taken.has(c.id))}
				{@const mine = t.chairs.some((c) => pickedSet.has(c.id))}
				<g style="--zc:{t.color}">
					{#each t.chairs as c (c.id)}
						{@const isTaken = taken.has(c.id)}
						{@const isMine = pickedSet.has(c.id)}
						<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
						<circle
							cx={c.x.toFixed(1)}
							cy={c.y.toFixed(1)}
							r={CHAIR_R}
							class="silla"
							class:taken={isTaken}
							class:mine={isMine}
							role={readonly || isTaken ? undefined : 'button'}
							tabindex={readonly || isTaken ? undefined : 0}
							aria-pressed={readonly || isTaken ? undefined : isMine}
							aria-label="Mesa {t.n}, puesto {c.chair}, {t.zoneName}{isTaken ? ', ocupado' : ''}"
							onclick={() => !readonly && !isTaken && ontoggle?.(c.id)}
							onkeydown={(e) => !readonly && !isTaken && key(e, () => ontoggle?.(c.id))}
						><title>Mesa {t.n} · Puesto {c.chair}</title></circle>
					{/each}
					<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
					<circle
						cx={t.x.toFixed(1)}
						cy={t.y}
						r={TABLE_R}
						class="mesa"
						class:on={mine}
						class:full={free.length === 0}
						role={readonly || !free.length ? undefined : 'button'}
						tabindex={readonly || !free.length ? undefined : 0}
						aria-label="Mesa {t.n}, {t.zoneName}: elegir los {free.length} puestos libres"
						onclick={() => !readonly && free.length && ontable?.(free.map((c) => c.id))}
						onkeydown={(e) => !readonly && free.length && key(e, () => ontable?.(free.map((c) => c.id)))}
					><title>Mesa {t.n}{free.length ? ` · elegir mesa completa (${free.length} libres)` : ' · completa'}</title></circle>
					<text x={t.x.toFixed(1)} y={t.y + 5} text-anchor="middle" class="num">{t.n}</text>
				</g>
			{/each}
		</svg>
	</div>
	<div class="legend">
		<span><i class="ldisp"></i>Disponible</span>
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
		min-width: 680px;
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
	.lbl {
		font-family: Arial, sans-serif;
		font-size: 12px;
	}
	.lbl.zl {
		font-weight: bold;
		letter-spacing: 2px;
	}
	.silla {
		fill: color-mix(in srgb, var(--zc) 16%, #fff);
		stroke: var(--zc);
		stroke-width: 1.6;
		cursor: pointer;
		transition:
			fill 0.15s,
			stroke-width 0.15s;
	}
	.silla:hover,
	.silla:focus-visible {
		fill: color-mix(in srgb, var(--zc) 45%, #fff);
		outline: none;
		stroke-width: 2.4;
	}
	.silla.mine {
		fill: var(--lime);
		stroke: var(--paper);
		stroke-width: 2;
	}
	.silla.taken {
		fill: #d6d0c6;
		stroke: #c9c3b8;
		stroke-width: 1;
		cursor: not-allowed;
	}
	.mesa {
		fill: #fff;
		stroke: var(--zc);
		stroke-width: 2;
		cursor: pointer;
		transition: fill 0.15s;
	}
	.mesa:hover,
	.mesa:focus-visible {
		fill: color-mix(in srgb, var(--zc) 20%, #fff);
		outline: none;
	}
	.mesa.on {
		stroke: var(--paper);
		stroke-width: 2.6;
	}
	.mesa.full {
		stroke: #c9c3b8;
		cursor: default;
	}
	.num {
		font-family: Georgia, serif;
		font-size: 15px;
		fill: var(--paper);
		pointer-events: none;
	}
	.ro .silla,
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
	.ldisp {
		background: #f6eccd;
		border: 1.6px solid #b8932c;
	}
	.lmine {
		background: var(--lime);
		border: 2px solid var(--paper);
	}
	.ltaken {
		background: #d6d0c6;
	}
</style>
