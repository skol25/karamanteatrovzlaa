<script lang="ts">
	import MesaMap from '#lib/components/MesaMap.svelte';
	import {
		PRESETS,
		ZONE_COLORS,
		TABLE_R,
		CHAIR_R,
		CHAIR_D,
		SEAT,
		SEAT_PITCH,
		ROW_PITCH,
		presetButacas,
		validatePlan,
		expandMap,
		itemBox,
		rowLetter,
		type Plan,
		type PlanItem,
		type MesaItem,
		type BloqueItem,
		type Zone
	} from '#lib/seatmap.ts';

	/**
	 * Diseñador de planos: se arrastran mesas, bloques de butacas y el escenario.
	 * Deja en el formulario: mode=libre y map (JSON del plano).
	 */
	let {
		map: initial = null,
		capacity = 100,
		price = 20,
		locked = [],
		templates = [],
		valid = $bindable(true)
	}: {
		map?: Plan | null;
		capacity?: number;
		price?: number;
		locked?: string[];
		templates?: { name: string; map: Plan | null; capacity: number; price: number }[];
		valid?: boolean;
	} = $props();

	const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
	const uid = () => Math.random().toString(36).slice(2, 9);
	// svelte-ignore state_referenced_locally
	let plan = $state<Plan>(clone(initial ?? presetButacas(capacity, price)));
	let selected = $state<string | null>(null); // key del elemento, o 'stage'
	let view = $state<'diseno' | 'cliente'>('diseno');

	/** Carga otro plano desde fuera (al elegir una sala en "Nuevo evento") */
	export function load(t: { map: Plan | null; capacity: number; price: number }) {
		plan = clone(t.map ?? presetButacas(t.capacity, t.price));
		selected = null;
	}

	const lockedSet = $derived(new Set<string>(locked));
	const err = $derived(validatePlan(plan));
	const ex = $derived(expandMap(plan));
	$effect(() => {
		valid = !err;
	});
	const H = $derived(Math.max(ex.h + 160, 640));
	const zcolor = $derived(Object.fromEntries(plan.zones.map((z) => [z.id, z.color])));
	const sel = $derived(plan.items.find((i) => i.key === selected) ?? null);
	const perZone = $derived(plan.zones.map((z) => ex.seats.filter((s) => s.zone === z.id).length));
	const itemLocked = (it: PlanItem) => ex.seats.some((s) => lockedSet.has(s.id) && belongs(s.id, it));
	function belongs(id: string, it: PlanItem) {
		if (it.type === 'mesa') return id.startsWith(`M${it.n}-`);
		const m = id.match(/^([A-Z]{1,2})(\d+)$/);
		if (!m) return false;
		const rows = Array.from({ length: it.rows }, (_, r) => rowLetter(it.rowStart, r));
		return rows.includes(m[1]) && +m[2] >= it.numStart && +m[2] < it.numStart + it.cols;
	}

	// ---------------- arrastrar
	let svg: SVGSVGElement | undefined = $state();
	let drag: { key: string; dx: number; dy: number } | null = null;
	const snap = (v: number) => Math.round(v / 5) * 5;
	function pt(e: PointerEvent) {
		const m = svg!.getScreenCTM()!.inverse();
		const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
		return { x: p.x, y: p.y };
	}
	function down(e: PointerEvent, key: string) {
		e.stopPropagation();
		selected = key;
		const p = pt(e);
		const o = key === 'stage' ? plan.stage : plan.items.find((i) => i.key === key)!;
		drag = { key, dx: p.x - o.x, dy: p.y - o.y };
		svg!.setPointerCapture(e.pointerId);
	}
	function move(e: PointerEvent) {
		if (!drag) return;
		const p = pt(e);
		const o = drag.key === 'stage' ? plan.stage : plan.items.find((i) => i.key === drag!.key);
		if (!o) return;
		o.x = Math.max(0, Math.min(plan.w - 20, snap(p.x - drag.dx)));
		o.y = Math.max(0, snap(p.y - drag.dy));
	}
	const up = () => (drag = null);
	function nudge(e: KeyboardEvent) {
		if (!selected) return;
		const tag = (e.target as HTMLElement).tagName;
		if (tag === 'INPUT' || tag === 'SELECT') return;
		const o = selected === 'stage' ? plan.stage : sel;
		if (!o) return;
		const d = e.shiftKey ? 20 : 5;
		const k: Record<string, [number, number]> = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] };
		if (k[e.key]) {
			e.preventDefault();
			o.x += k[e.key][0];
			o.y += k[e.key][1];
		} else if ((e.key === 'Delete' || e.key === 'Backspace') && sel) {
			e.preventDefault();
			removeItem(sel);
		}
	}

	// ---------------- agregar / quitar
	const nextTable = () => Math.max(0, ...plan.items.filter((i): i is MesaItem => i.type === 'mesa').map((i) => i.n)) + 1;
	function nextRowStart() {
		let max = 0;
		for (const s of ex.seats) if (s.row) max = Math.max(max, s.row.split('').reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0));
		return rowLetter('A', max);
	}
	const freeY = () => Math.min(ex.h + 40, H - 80);
	function addMesa() {
		const last = [...plan.items].reverse().find((i): i is MesaItem => i.type === 'mesa');
		const it: MesaItem = { type: 'mesa', key: uid(), n: nextTable(), x: plan.w / 2, y: freeY(), seats: last?.seats ?? 9, zone: last?.zone ?? plan.zones[0].id };
		plan.items.push(it);
		selected = it.key;
	}
	function addBloque() {
		const it: BloqueItem = { type: 'butacas', key: uid(), x: plan.w / 2 - 5 * SEAT_PITCH, y: freeY(), rows: 4, cols: 10, rowStart: nextRowStart(), numStart: 1, zone: plan.zones[0].id };
		plan.items.push(it);
		selected = it.key;
	}
	function duplicate(it: PlanItem) {
		const c = clone(it);
		c.key = uid();
		if (c.type === 'mesa') {
			c.n = nextTable();
			c.x = Math.min(plan.w - 50, c.x + 100);
		} else {
			c.numStart = c.numStart + c.cols;
			c.x = Math.min(plan.w - 50, c.x + c.cols * SEAT_PITCH + 60);
		}
		plan.items.push(c);
		selected = c.key;
	}
	function removeItem(it: PlanItem) {
		if (itemLocked(it)) return alert('Este elemento tiene puestos apartados o vendidos: no se puede eliminar.');
		plan.items = plan.items.filter((i) => i.key !== it.key);
		selected = null;
	}
	function addZone() {
		plan.zones.push({ id: 'z' + uid(), name: 'Nueva zona', color: ZONE_COLORS[plan.zones.length % ZONE_COLORS.length], price: 20 });
	}
	function removeZone(z: Zone) {
		if (plan.items.some((i) => i.zone === z.id)) return alert('Primero cambia la zona de las mesas o butacas que la usan.');
		plan.zones = plan.zones.filter((x) => x.id !== z.id);
	}
	function usePreset(make: () => Plan, name: string) {
		if (locked.length) return alert('Ya hay puestos vendidos: no se puede cambiar el formato completo. Edita el plano actual.');
		if (plan.items.length && !confirm(`¿Usar el formato «${name}»? Se reemplaza el plano que tienes en pantalla.`)) return;
		plan = make();
		selected = null;
	}
	const allTemplates = $derived(templates.filter((t) => t.map));
</script>

<input type="hidden" name="mode" value="libre" />
<input type="hidden" name="map" value={JSON.stringify(plan)} />

<div class="pe">
	<div class="presets">
		<span class="ttl">Formatos</span>
		{#each PRESETS as p (p.id)}
			<button type="button" class="preset" onclick={() => usePreset(p.make, p.name)}><b>{p.name}</b><small>{p.desc}</small></button>
		{/each}
		{#if allTemplates.length}
			<select class="input sm" aria-label="Usar el plano de una sala guardada" onchange={(e) => { const t = allTemplates[Number((e.currentTarget as HTMLSelectElement).value)]; (e.currentTarget as HTMLSelectElement).value = ''; if (t) usePreset(() => clone(t.map!), t.name); }}>
				<option value="">Plano de una sala guardada…</option>
				{#each allTemplates as t, i (i)}<option value={i}>{t.name}</option>{/each}
			</select>
		{/if}
	</div>

	<div class="work">
		<section class="card canvas-card">
			<div class="tools">
				<button type="button" class="tool" onclick={addMesa}>＋ Mesa</button>
				<button type="button" class="tool" onclick={addBloque}>＋ Bloque de butacas</button>
				<span class="sp"></span>
				<div class="views" role="tablist">
					<button type="button" role="tab" aria-selected={view === 'diseno'} class:on={view === 'diseno'} onclick={() => (view = 'diseno')}>Diseño</button>
					<button type="button" role="tab" aria-selected={view === 'cliente'} class:on={view === 'cliente'} onclick={() => (view = 'cliente')}>Vista del cliente</button>
				</div>
			</div>
			{#if view === 'diseno'}
				<p class="hint">Arrastra las mesas, los bloques y el escenario. Haz clic en un elemento para editarlo; con las flechas del teclado lo mueves fino.</p>
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_no_noninteractive_tabindex -->
				<svg
					bind:this={svg}
					viewBox="0 0 {plan.w} {H}"
					class="canvas"
					role="application"
					aria-label="Diseño del plano"
					tabindex="0"
					onpointermove={move}
					onpointerup={up}
					onpointercancel={up}
					onpointerdown={() => (selected = null)}
					onkeydown={nudge}
				>
					<defs>
						<pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#ece8e0" stroke-width="1" /></pattern>
					</defs>
					<rect width={plan.w} height={H} fill="url(#grid)" />

					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<g class="it" class:sel={selected === 'stage'} onpointerdown={(e) => down(e, 'stage')}>
						<rect x={plan.stage.x} y={plan.stage.y} width={plan.stage.w} height={plan.stage.h} rx="6" fill="#151412" />
						<text x={plan.stage.x + plan.stage.w / 2} y={plan.stage.y + plan.stage.h / 2 + 7} text-anchor="middle" class="stage-t">{plan.stage.label.toUpperCase()}</text>
						{#if selected === 'stage'}<rect class="selbox" x={plan.stage.x - 6} y={plan.stage.y - 6} width={plan.stage.w + 12} height={plan.stage.h + 12} rx="8" />{/if}
					</g>

					{#each plan.items as it (it.key)}
						{@const b = itemBox(it)}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<g class="it" class:sel={selected === it.key} style="--zc:{zcolor[it.zone] ?? '#999'}" onpointerdown={(e) => down(e, it.key)}>
							<rect class="hit" x={b.x} y={b.y} width={b.w} height={b.h} rx="8" />
							{#if it.type === 'mesa'}
								{#each Array(it.seats) as _, c (c)}
									{@const a = -Math.PI / 2 + (c * 2 * Math.PI) / it.seats}
									<circle cx={it.x + CHAIR_D * Math.cos(a)} cy={it.y + CHAIR_D * Math.sin(a)} r={CHAIR_R} class="ch" class:lk={lockedSet.has(`M${it.n}-${c + 1}`)} />
								{/each}
								<circle cx={it.x} cy={it.y} r={TABLE_R} class="tb" />
								<text x={it.x} y={it.y + 5} text-anchor="middle" class="num">{it.n}</text>
							{:else}
								{#each Array(it.rows) as _, r (r)}
									<text x={it.x - 12} y={it.y + r * ROW_PITCH + 4} text-anchor="end" class="rowl">{rowLetter(it.rowStart, r)}</text>
									{#each Array(it.cols) as __, c (c)}
										<rect x={it.x + c * SEAT_PITCH - SEAT / 2} y={it.y + r * ROW_PITCH - SEAT / 2} width={SEAT} height={SEAT} rx="4" class="ch" class:lk={lockedSet.has(`${rowLetter(it.rowStart, r)}${it.numStart + c}`)} />
									{/each}
								{/each}
								<text x={it.x - SEAT / 2} y={it.y - SEAT / 2 - 6} class="bl">{rowLetter(it.rowStart, 0)}{it.rows > 1 ? '–' + rowLetter(it.rowStart, it.rows - 1) : ''} · {it.numStart}–{it.numStart + it.cols - 1}</text>
							{/if}
							{#if selected === it.key}<rect class="selbox" x={b.x - 4} y={b.y - 4} width={b.w + 8} height={b.h + 8} rx="10" />{/if}
						</g>
					{/each}
				</svg>
			{:else}
				<MesaMap map={ex} taken={lockedSet} readonly prices />
			{/if}
			<div class="totals">
				<b>{ex.capacity}</b> puestos · <b>{ex.tables.length}</b> mesas · <b>{plan.items.filter((i) => i.type === 'butacas').length}</b> bloques de butacas
			</div>
			{#if err}<p class="err">{err}</p>{/if}
		</section>

		<aside class="side">
			<section class="card box">
				{#if selected === 'stage'}
					<h3>Escenario</h3>
					<div class="field"><label for="st-l">Texto</label><input class="input" id="st-l" bind:value={plan.stage.label} maxlength="30" /></div>
					<div class="g2">
						<div class="field"><label for="st-w">Ancho</label><input class="input" id="st-w" type="number" min="100" max="1200" step="10" bind:value={plan.stage.w} /></div>
						<div class="field"><label for="st-h">Alto</label><input class="input" id="st-h" type="number" min="20" max="200" step="5" bind:value={plan.stage.h} /></div>
					</div>
				{:else if sel?.type === 'mesa'}
					<h3>Mesa {sel.n}</h3>
					{#if itemLocked(sel)}<p class="lock">Tiene puestos vendidos: solo puedes moverla o cambiar su zona.</p>{/if}
					<div class="g2">
						<div class="field"><label for="m-n">Número</label><input class="input" id="m-n" type="number" min="1" bind:value={sel.n} disabled={itemLocked(sel)} /></div>
						<div class="field"><label for="m-s">Puestos</label><input class="input" id="m-s" type="number" min="1" max="14" bind:value={sel.seats} disabled={itemLocked(sel)} /></div>
					</div>
					<div class="field">
						<label for="m-z">Tipo de entrada</label>
						<select class="input" id="m-z" bind:value={sel.zone}>{#each plan.zones as z (z.id)}<option value={z.id}>{z.name}</option>{/each}</select>
					</div>
					<div class="acts">
						<button type="button" class="btn btn-ghost sm" onclick={() => duplicate(sel)}>Duplicar</button>
						<button type="button" class="btn btn-ghost sm danger" onclick={() => removeItem(sel)}>Eliminar</button>
					</div>
				{:else if sel?.type === 'butacas'}
					<h3>Bloque de butacas</h3>
					{#if itemLocked(sel)}<p class="lock">Tiene puestos vendidos: solo puedes moverlo o cambiar su zona.</p>{/if}
					<div class="g2">
						<div class="field"><label for="b-r">Filas</label><input class="input" id="b-r" type="number" min="1" max="40" bind:value={sel.rows} disabled={itemLocked(sel)} /></div>
						<div class="field"><label for="b-c">Asientos por fila</label><input class="input" id="b-c" type="number" min="1" max="50" bind:value={sel.cols} disabled={itemLocked(sel)} /></div>
						<div class="field"><label for="b-s">Fila inicial</label><input class="input" id="b-s" maxlength="2" value={sel.rowStart} oninput={(e) => (sel.rowStart = (e.currentTarget as HTMLInputElement).value.toUpperCase().replace(/[^A-Z]/g, ''))} disabled={itemLocked(sel)} /></div>
						<div class="field"><label for="b-n">Nº del primer asiento</label><input class="input" id="b-n" type="number" min="1" bind:value={sel.numStart} disabled={itemLocked(sel)} /></div>
					</div>
					<div class="field">
						<label for="b-z">Tipo de entrada</label>
						<select class="input" id="b-z" bind:value={sel.zone}>{#each plan.zones as z (z.id)}<option value={z.id}>{z.name}</option>{/each}</select>
					</div>
					<div class="acts">
						<button type="button" class="btn btn-ghost sm" onclick={() => duplicate(sel)}>Duplicar al lado</button>
						<button type="button" class="btn btn-ghost sm danger" onclick={() => removeItem(sel)}>Eliminar</button>
					</div>
				{:else}
					<h3>Elemento</h3>
					<p class="muted">Haz clic en una mesa, un bloque de butacas o el escenario para editarlo.</p>
				{/if}
			</section>

			<section class="card box">
				<header class="bh">
					<h3>Tipos de entrada</h3>
					<button type="button" class="lb" onclick={addZone}>+ Agregar</button>
				</header>
				<p class="muted">Precio por puesto en dólares (referencia). Se cobra en bolívares a la tasa BCV.</p>
				{#each plan.zones as z, i (z.id)}
					<div class="zrow">
						<input type="color" bind:value={z.color} aria-label="Color de {z.name}" />
						<input class="input" bind:value={z.name} aria-label="Nombre del tipo de entrada" maxlength="30" />
						<label class="pr"><span>$</span><input class="input" type="number" min="1" step="0.5" bind:value={z.price} aria-label="Precio {z.name}" /></label>
						<button type="button" class="x" onclick={() => removeZone(z)} aria-label="Quitar {z.name}">×</button>
						<small class="cnt">{perZone[i]} puestos</small>
					</div>
				{/each}
			</section>
		</aside>
	</div>
</div>

<style>
	.pe {
		display: grid;
		gap: 14px;
	}
	h3 {
		font-size: 16px;
		margin: 0;
	}
	.muted {
		color: var(--mist);
		font-size: 13px;
		margin: 0;
	}
	.err {
		margin: 0;
		padding: 10px 14px;
		font-size: 14px;
		background: #ff6b5a1a;
		border: 1px solid #ff6b5a55;
		color: var(--danger);
	}
	.lock {
		margin: 0;
		font-size: 13px;
		color: var(--warn);
	}
	.presets {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		align-items: stretch;
	}
	.presets .ttl {
		align-self: center;
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-weight: 700;
		color: var(--mist);
		margin-right: 4px;
	}
	.preset {
		display: grid;
		gap: 2px;
		text-align: left;
		border: 1px solid var(--line);
		background: var(--ink-2);
		padding: 9px 14px;
		cursor: pointer;
		font-size: 14px;
		color: var(--paper);
	}
	.preset small {
		color: var(--mist);
		font-size: 12px;
	}
	.preset:hover {
		border-color: var(--paper);
	}
	.input.sm {
		width: auto;
		align-self: center;
		font-size: 13px;
		padding: 8px 10px;
	}
	.work {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 320px;
		gap: 16px;
		align-items: start;
	}
	.canvas-card {
		padding: 16px;
		display: grid;
		gap: 10px;
	}
	.tools {
		display: flex;
		gap: 8px;
		align-items: center;
		flex-wrap: wrap;
	}
	.tool {
		border: 1px solid var(--paper);
		background: var(--paper);
		color: #fff;
		padding: 8px 14px;
		font-weight: 700;
		font-size: 13px;
		cursor: pointer;
	}
	.sp {
		flex: 1;
	}
	.views {
		display: flex;
	}
	.views button {
		border: 1px solid var(--line);
		background: var(--ink-2);
		padding: 7px 12px;
		font-size: 13px;
		cursor: pointer;
		color: var(--mist);
	}
	.views button.on {
		border-color: var(--paper);
		color: var(--paper);
		font-weight: 700;
	}
	.hint {
		margin: 0;
		font-size: 12px;
		color: var(--mist);
	}
	.canvas {
		width: 100%;
		height: auto;
		display: block;
		border: 1px solid var(--line);
		background: #fff;
		touch-action: none;
		user-select: none;
		outline: none;
	}
	.canvas:focus-visible {
		border-color: var(--paper);
	}
	.it {
		cursor: grab;
	}
	.it:active {
		cursor: grabbing;
	}
	.hit {
		fill: transparent;
	}
	.it:hover .hit {
		fill: #1514120a;
	}
	.selbox {
		fill: none;
		stroke: #abce26;
		stroke-width: 3;
		stroke-dasharray: 8 5;
		pointer-events: none;
	}
	.ch {
		fill: color-mix(in srgb, var(--zc) 18%, #fff);
		stroke: var(--zc);
		stroke-width: 1.6;
	}
	.ch.lk {
		fill: #d6d0c6;
		stroke: #b9b2a6;
	}
	.tb {
		fill: #fff;
		stroke: var(--zc);
		stroke-width: 2;
	}
	.num {
		font-family: Georgia, serif;
		font-size: 15px;
		fill: #151412;
		pointer-events: none;
	}
	.rowl {
		font-family: Arial, sans-serif;
		font-size: 11px;
		font-weight: bold;
		fill: #9a948a;
	}
	.bl {
		font-family: Arial, sans-serif;
		font-size: 11px;
		fill: var(--zc);
		font-weight: bold;
	}
	.stage-t {
		font-family: Georgia, serif;
		font-size: 20px;
		letter-spacing: 8px;
		fill: #abce26;
		pointer-events: none;
	}
	.totals {
		font-size: 14px;
	}
	.side {
		display: grid;
		gap: 14px;
		position: sticky;
		top: 90px;
	}
	.box {
		padding: 18px;
		display: grid;
		gap: 12px;
	}
	.g2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	.acts {
		display: flex;
		gap: 8px;
	}
	.btn.sm {
		padding: 8px 12px;
		font-size: 13px;
	}
	.danger {
		color: var(--danger);
	}
	.bh {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.lb {
		background: none;
		border: 0;
		color: var(--accent);
		font-weight: 700;
		cursor: pointer;
		font-size: 13px;
	}
	.zrow {
		display: grid;
		grid-template-columns: 34px minmax(0, 1fr) 84px 26px;
		gap: 6px;
		align-items: center;
	}
	.zrow input[type='color'] {
		width: 34px;
		height: 34px;
		border: 1px solid var(--line);
		padding: 2px;
		background: #fff;
	}
	.pr {
		display: flex;
		align-items: center;
		gap: 3px;
	}
	.x {
		width: 26px;
		height: 26px;
		border: 1px solid var(--line);
		background: var(--ink-2);
		cursor: pointer;
	}
	.cnt {
		grid-column: 2 / -1;
		margin-top: -4px;
		font-size: 11px;
		color: var(--mist);
	}
	@media (max-width: 1100px) {
		.work {
			grid-template-columns: 1fr;
		}
		.side {
			position: static;
		}
	}
</style>
