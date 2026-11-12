<script lang="ts">
	import { enhance } from '$app/forms';
	import AdminNav from '../../AdminNav.svelte';
	import MesaMap from '#lib/components/MesaMap.svelte';
	import { fechaLarga, hora } from '#lib/format.ts';
	import { TEMPLATE_TIBISAY, ZONE_COLORS, validateMap, expandMap, type SeatMap, type Zone, type MesaRow } from '#lib/seatmap.ts';

	let { data, form } = $props();

	const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
	// svelte-ignore state_referenced_locally
	let mode = $state<'mesas' | 'butacas'>(data.map ? 'mesas' : 'butacas');
	// svelte-ignore state_referenced_locally
	let zones = $state<Zone[]>(clone(data.map?.zones ?? TEMPLATE_TIBISAY.zones));
	// svelte-ignore state_referenced_locally
	let rows = $state<MesaRow[]>(clone(data.map?.rows ?? TEMPLATE_TIBISAY.rows));
	// svelte-ignore state_referenced_locally
	let capacity = $state(data.perf.capacity);
	// svelte-ignore state_referenced_locally
	let price = $state(String(data.perf.price_usd));

	const map = $derived<SeatMap>({ kind: 'mesas', zones, rows });
	const err = $derived(validateMap(map));
	const ex = $derived(err ? null : expandMap(map));
	const locked = $derived(new Set<string>(data.locked));
	const perZone = $derived(
		zones.map((z) => {
			const rs = rows.filter((r) => r.zone === z.id);
			return { z, tables: rs.reduce((a, r) => a + r.tables, 0), seats: rs.reduce((a, r) => a + r.tables * r.seats, 0) };
		})
	);
	// numeración de mesas por fila (para mostrar "mesas 1–8")
	const ranges = $derived.by(() => {
		let n = 1;
		return rows.map((r) => {
			const a = n;
			n += Math.max(0, Math.floor(r.tables) || 0);
			return `${a}–${n - 1}`;
		});
	});

	function addZone() {
		const id = 'z' + Date.now().toString(36);
		zones = [...zones, { id, name: 'Nueva zona', color: ZONE_COLORS[zones.length % ZONE_COLORS.length], price: 20 }];
	}
	function removeZone(id: string) {
		if (rows.some((r) => r.zone === id)) return alert('Primero cambia o quita las filas que usan esta zona.');
		zones = zones.filter((z) => z.id !== id);
	}
	const addRow = () => (rows = [...rows, clone(rows.at(-1) ?? { zone: zones[0]?.id ?? '', tables: 8, seats: 9 })]);
	const removeRow = (i: number) => (rows = rows.filter((_, k) => k !== i));
	function moveRow(i: number, d: number) {
		const j = i + d;
		if (j < 0 || j >= rows.length) return;
		const r = [...rows];
		[r[i], r[j]] = [r[j], r[i]];
		rows = r;
	}
	function loadTemplate() {
		if (!confirm('¿Cargar el plano del Hotel Tibisay (60 mesas de 9)? Se reemplaza lo que tienes en pantalla (no se guarda hasta que pulses Guardar).')) return;
		zones = clone(TEMPLATE_TIBISAY.zones);
		rows = clone(TEMPLATE_TIBISAY.rows);
	}
</script>

<svelte:head><title>Plano · {data.perf.title} · Administración</title></svelte:head>

<div class="wrap admin">
	<AdminNav />
	<a class="back" href="/admin/obras">← Obras y funciones</a>
	<div>
		<h1 class="display">Plano de asientos</h1>
		<p class="muted"><b>{data.perf.title}</b> · <span class="cap">{fechaLarga(data.perf.starts_at)}</span> · {hora(data.perf.starts_at)} · {data.perf.venue}</p>
	</div>
	{#if form?.notice}<p class="notice">{form.notice}</p>{/if}
	{#if form?.error}<p class="err">{form.error}</p>{/if}
	{#if data.locked.length}
		<p class="info">Hay {data.locked.length} puesto(s) apartados o vendidos. Puedes cambiar zonas, precios, nombres y colores, o agregar filas al final; no se pueden quitar ni cambiar las mesas de las filas existentes.</p>
	{/if}

	<div class="modes" role="tablist">
		<button role="tab" aria-selected={mode === 'mesas'} class:on={mode === 'mesas'} onclick={() => (mode = 'mesas')}>Mesas por zonas</button>
		<button role="tab" aria-selected={mode === 'butacas'} class:on={mode === 'butacas'} onclick={() => (mode = 'butacas')}>Butacas (precio único)</button>
	</div>

	<form
		method="POST"
		action="?/guardar"
		use:enhance={() =>
			async ({ update }) =>
				update({ reset: false })}
	>
		<input type="hidden" name="mode" value={mode} />
		{#if mode === 'mesas'}
			<input type="hidden" name="map" value={JSON.stringify(map)} />
			<div class="editor">
				<section class="card box">
					<header class="bh">
						<h2>Zonas y precios</h2>
						<button type="button" class="lb" onclick={addZone}>+ Agregar zona</button>
					</header>
					<p class="muted">El precio es por puesto, en dólares (referencia). El cliente paga en bolívares a la tasa BCV.</p>
					<div class="zlist">
						{#each zones as z, i (z.id)}
							<div class="zrow">
								<input type="color" bind:value={z.color} aria-label="Color de {z.name}" />
								<input class="input" bind:value={z.name} aria-label="Nombre de la zona" maxlength="30" />
								<label class="pr"><span>$</span><input class="input" type="number" min="1" step="0.5" bind:value={z.price} aria-label="Precio {z.name}" /></label>
								<span class="cnt">{perZone[i].tables} mesas · {perZone[i].seats} puestos</span>
								<button type="button" class="x" onclick={() => removeZone(z.id)} aria-label="Quitar zona {z.name}">×</button>
							</div>
						{/each}
					</div>

					<header class="bh">
						<h2>Filas de mesas</h2>
						<span>
							<button type="button" class="lb" onclick={loadTemplate}>Plantilla Hotel Tibisay</button>
							<button type="button" class="lb" onclick={addRow}>+ Agregar fila</button>
						</span>
					</header>
					<p class="muted">Fila 1 es la más cercana al escenario. Las mesas se numeran de corrido.</p>
					<div class="rlist">
						<div class="rhead"><span>Fila</span><span>Zona</span><span>Mesas</span><span>Puestos por mesa</span><span>Numeración</span><span></span></div>
						{#each rows as r, i (i)}
							<div class="rrow">
								<b>F{i + 1}</b>
								<select class="input" bind:value={r.zone} aria-label="Zona de la fila {i + 1}">
									{#each zones as z (z.id)}<option value={z.id}>{z.name}</option>{/each}
								</select>
								<input class="input" type="number" min="1" max="24" bind:value={r.tables} aria-label="Mesas en la fila {i + 1}" />
								<input class="input" type="number" min="1" max="14" bind:value={r.seats} aria-label="Puestos por mesa en la fila {i + 1}" />
								<span class="muted">Mesas {ranges[i]}</span>
								<span class="ra">
									<button type="button" class="ib" onclick={() => moveRow(i, -1)} disabled={i === 0} aria-label="Subir fila">↑</button>
									<button type="button" class="ib" onclick={() => moveRow(i, 1)} disabled={i === rows.length - 1} aria-label="Bajar fila">↓</button>
									<button type="button" class="ib" onclick={() => removeRow(i)} disabled={rows.length === 1} aria-label="Quitar fila">×</button>
								</span>
							</div>
						{/each}
					</div>
					<div class="totals">
						<b>{ex?.capacity ?? 0}</b> puestos en total · <b>{rows.reduce((a, r) => a + (Number(r.tables) || 0), 0)}</b> mesas
					</div>
					{#if err}<p class="err">{err}</p>{/if}
					<button class="btn btn-lime" disabled={!!err}>Guardar plano</button>
				</section>

				<section class="card box prev">
					<h2>Así lo verá el cliente</h2>
					{#if ex}
						<MesaMap map={ex} taken={locked} readonly prices />
					{:else}
						<p class="muted">Completa los datos para ver la vista previa.</p>
					{/if}
				</section>
			</div>
		{:else}
			<section class="card box narrow">
				<h2>Butacas numeradas</h2>
				<p class="muted">Filas de butacas (A, B, C…) generadas según el aforo, todas al mismo precio.</p>
				<div class="g2">
					<div class="field"><label for="cap">Personas admitidas</label><input class="input" id="cap" name="capacity" type="number" min="1" max="1000" bind:value={capacity} /></div>
					<div class="field"><label for="pr">Precio por entrada (USD)</label><input class="input" id="pr" name="price_usd" inputmode="decimal" bind:value={price} /></div>
				</div>
				<button class="btn btn-lime">Guardar plano</button>
			</section>
		{/if}
	</form>
</div>

<style>
	.admin {
		padding-top: 28px;
		display: grid;
		gap: 20px;
	}
	.back {
		font-size: 14px;
		color: var(--mist);
		font-weight: 600;
	}
	h1 {
		font-size: clamp(24px, 3vw, 32px);
		margin: 0 0 6px;
	}
	h2 {
		font-size: 17px;
		margin: 0;
	}
	.muted {
		color: var(--mist);
		font-size: 13px;
		margin: 0;
	}
	.cap {
		text-transform: capitalize;
	}
	.notice,
	.err,
	.info {
		margin: 0;
		padding: 12px 16px;
		font-size: 14px;
	}
	.notice {
		background: var(--lime-soft);
		border: 1px solid #abce2666;
		color: var(--accent);
	}
	.err {
		background: #ff6b5a1a;
		border: 1px solid #ff6b5a55;
		color: var(--danger);
	}
	.info {
		background: #a15c0014;
		border: 1px solid #a15c0055;
		color: var(--warn);
	}
	.modes {
		display: flex;
		gap: 6px;
	}
	.modes button {
		border: 1px solid var(--line);
		background: var(--ink-2);
		padding: 9px 16px;
		font-weight: 600;
		font-size: 14px;
		cursor: pointer;
		color: var(--mist);
	}
	.modes button.on {
		border-color: var(--paper);
		color: var(--paper);
	}
	.editor {
		display: grid;
		grid-template-columns: minmax(0, 560px) minmax(0, 1fr);
		gap: 20px;
		align-items: start;
	}
	.box {
		padding: 22px;
		display: grid;
		gap: 14px;
	}
	.narrow {
		max-width: 560px;
	}
	.prev {
		position: sticky;
		top: 90px;
		max-height: calc(100vh - 110px);
		overflow: auto;
	}
	.bh {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
		margin-top: 6px;
	}
	.lb {
		background: none;
		border: 0;
		color: var(--accent);
		font-weight: 700;
		cursor: pointer;
		font-size: 13px;
		padding: 4px 6px;
	}
	.zlist,
	.rlist {
		display: grid;
		gap: 8px;
	}
	.zrow {
		display: grid;
		grid-template-columns: 38px minmax(0, 1fr) 100px auto 28px;
		gap: 8px;
		align-items: center;
	}
	.zrow input[type='color'] {
		width: 38px;
		height: 38px;
		border: 1px solid var(--line);
		padding: 2px;
		background: #fff;
	}
	.pr {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.cnt {
		font-size: 12px;
		color: var(--mist);
		white-space: nowrap;
	}
	.x,
	.ib {
		width: 28px;
		height: 28px;
		border: 1px solid var(--line);
		background: var(--ink-2);
		cursor: pointer;
	}
	.ib:disabled {
		opacity: 0.3;
	}
	.rhead,
	.rrow {
		display: grid;
		grid-template-columns: 34px minmax(0, 1fr) 70px 70px 90px auto;
		gap: 8px;
		align-items: center;
	}
	.rhead {
		font-size: 11px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--mist);
		font-weight: 700;
	}
	.ra {
		display: flex;
		gap: 4px;
	}
	.totals {
		font-size: 14px;
		padding-top: 10px;
		border-top: 1px solid var(--line);
	}
	.g2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	@media (max-width: 1100px) {
		.editor {
			grid-template-columns: 1fr;
		}
		.prev {
			position: static;
			max-height: none;
		}
	}
	@media (max-width: 560px) {
		.rhead {
			display: none;
		}
		.rrow {
			grid-template-columns: 30px 1fr 60px 60px;
		}
		.rrow .muted,
		.ra {
			grid-column: 2 / -1;
		}
		.zrow {
			grid-template-columns: 38px 1fr 90px 28px;
		}
		.cnt {
			display: none;
		}
	}
</style>
