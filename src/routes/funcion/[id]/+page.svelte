<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate, replaceState } from '$app/navigation';
	import { buildLayout, sortSeats } from '#lib/seats.ts';
	import { fechaLarga, hora } from '#lib/format.ts';
	import MesaMap from '#lib/components/MesaMap.svelte';
	import { seatLabel } from '#lib/seatmap.ts';

	let { data, form } = $props();
	const p = $derived(data.perf);
	const layout = $derived(buildLayout(p.capacity));
	const taken = $derived(new Set(data.taken));

	// svelte-ignore state_referenced_locally
	let n = $state(data.n);
	let picked = $state<string[]>([]);
	let sending = $state(false);

	// Si otra persona tomó un asiento que tenías marcado, se quita de tu selección
	$effect(() => {
		const clash = picked.filter((s) => taken.has(s));
		if (clash.length) picked = picked.filter((s) => !taken.has(s));
	});
	// Refresca la disponibilidad cada 15 s
	$effect(() => {
		const t = setInterval(() => invalidate('app:seats'), 15000);
		return () => clearInterval(t);
	});

	function toggle(id: string) {
		if (taken.has(id)) return;
		if (picked.includes(id)) picked = picked.filter((s) => s !== id);
		else if (picked.length < n) picked = [...picked, id];
		else if (n === 1) picked = [id];
		else picked = [...picked.slice(1), id]; // reemplaza el más antiguo
	}
	function setN(v: number) {
		n = Math.max(1, Math.min(v, data.maxTickets, data.left));
		if (picked.length > n) picked = picked.slice(picked.length - n);
		const u = new URL(location.href);
		u.searchParams.set('n', String(n));
		replaceState(u, {});
	}

	// ---- Plano por mesas: el cliente elige puestos sueltos o la mesa completa
	let limitMsg = $state('');
	const max = $derived(Math.min(data.maxTickets, data.left));
	function toggleMesa(id: string) {
		limitMsg = '';
		if (picked.includes(id)) picked = picked.filter((s) => s !== id);
		else if (picked.length < max) picked = [...picked, id];
		else limitMsg = `Puedes elegir hasta ${max} puestos por compra.`;
	}
	// Aviso al elegir o quitar una mesa completa
	let toast = $state<{ kind: 'ok' | 'off' | 'warn'; text: string } | null>(null);
	let toastTimer: ReturnType<typeof setTimeout> | undefined;
	function notify(kind: 'ok' | 'off' | 'warn', text: string) {
		toast = { kind, text };
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = null), 3500);
	}

	function pickTable(ids: string[]) {
		limitMsg = '';
		if (!ids.length) return;
		const mesa = ids[0].match(/^M(\d+)-/)?.[1] ?? '';
		const zone = data.map?.byId[ids[0]]?.zone.name ?? '';
		if (ids.every((s) => picked.includes(s))) {
			picked = picked.filter((s) => !ids.includes(s));
			notify('off', `Quitaste la mesa ${mesa} de tu selección.`);
			return;
		}
		const add = ids.filter((s) => !picked.includes(s));
		const room = max - picked.length;
		const taken_ = add.slice(0, Math.max(0, room));
		picked = [...picked, ...taken_];
		if (add.length > room) {
			limitMsg = `Puedes elegir hasta ${max} puestos por compra.`;
			notify('warn', taken_.length ? `Solo se agregaron ${taken_.length} puestos de la mesa ${mesa}: el máximo por compra es ${max}.` : `Ya tienes ${max} puestos, el máximo por compra.`);
		} else {
			const total = data.map?.rows.flatMap((r) => r.tables).find((t) => String(t.n) === mesa)?.seats.length ?? ids.length;
			notify(
				'ok',
				ids.length === total
					? `Elegiste la mesa ${mesa} completa (${zone}): ${ids.length} puestos.`
					: `Elegiste los ${ids.length} puestos libres de la mesa ${mesa} (${zone}).`
			);
		}
	}

	// zonas con sus filas y mesas (para las pestañas y el resumen)
	const zoneInfo = $derived.by(() => {
		if (!data.map) return [];
		return data.map.zones
			.map((z) => {
				const rows = data.map!.rows.filter((r) => r.zone.id === z.id);
				const idx = rows.map((r) => r.index + 1);
				const tables = rows.flatMap((r) => r.tables.map((t) => t.n));
				return {
					z,
					filas: idx.length > 1 ? `filas ${idx[0]} a ${idx.at(-1)}` : `fila ${idx[0]}`,
					mesas: tables.length ? `mesas ${tables[0]}–${tables.at(-1)}` : ''
				};
			})
			.filter((x) => x.mesas);
	});

	const rate = $derived(data.rate?.rate ?? null);
	const ready = $derived(data.map ? picked.length > 0 : picked.length === n);
</script>

<svelte:head><title>Asientos · {p.title} · Karamantea Teatro</title></svelte:head>

<div class="wrap page">
	<a class="back" href="/obra/{p.slug}#funciones">← {p.title}</a>
	<span class="eyebrow">Paso 2 de 3</span>
	<h1 class="display">{data.map ? 'Elige tus puestos' : 'Elige tus asientos'}</h1>
	<p class="sub">{fechaLarga(p.starts_at)} · {hora(p.starts_at)} · {p.venue}</p>

	{#if data.past}
		<p class="alert">Esta función ya pasó.</p>
	{:else if data.left <= 0}
		<p class="alert">Función agotada.</p>
	{:else}
		<div class="grid" class:mesas={!!data.map}>
			<section class="hall card">
				{#if data.map}
					<div class="ztabs">
						{#each zoneInfo as zi (zi.z.id)}
							<span class="ztab"><i style="background:{zi.z.color}"></i><b>{zi.z.name}</b> · {zi.filas} · {zi.mesas}</span>
						{/each}
					</div>
					<p class="howto">Toca una silla para elegir ese puesto, o toca el número de la mesa para elegir la mesa completa.</p>
					<MesaMap map={data.map} {taken} {picked} ontoggle={toggleMesa} ontable={pickTable} />
					{#if toast}
						<div class="toast {toast.kind}" role="status" aria-live="polite">
							<span>{toast.kind === 'ok' ? '✓' : toast.kind === 'off' ? '−' : '!'}</span>
							{toast.text}
							<button type="button" onclick={() => (toast = null)} aria-label="Cerrar aviso">×</button>
						</div>
					{/if}
				{:else}
				<div class="stage"><span>Escenario</span></div>
				<div class="map" style="--cols:{layout.width}">
					{#each layout.rows as row (row.label)}
						<span class="rl">{row.label}</span>
						{#each row.cells as c, i (i)}
							{#if c}
								{@const isTaken = taken.has(c.id)}
								{@const isPicked = picked.includes(c.id)}
								<button
									class="seat"
									class:taken={isTaken}
									class:picked={isPicked}
									disabled={isTaken}
									aria-pressed={isPicked}
									aria-label="Asiento {c.id}{isTaken ? ', ocupado' : ''}"
									title={c.id}
									onclick={() => toggle(c.id)}
								>
									<span>{c.id.replace(row.label, '')}</span>
								</button>
							{:else}
								<span class="gap"></span>
							{/if}
						{/each}
						<span class="rl">{row.label}</span>
					{/each}
				</div>
				<div class="legend">
					<span><i class="seat sm"></i>Disponible</span>
					<span><i class="seat sm picked"></i>Tu selección</span>
					<span><i class="seat sm taken"></i>Ocupado</span>
				</div>
				{/if}
			</section>

			<aside class="side card">
				{#if data.map}
					<div class="zlist">
						<h3>Zonas</h3>
						{#each zoneInfo as zi (zi.z.id)}
							<div class="zrow"><span><i style="background:{zi.z.color}"></i>{zi.z.name}</span><small>{zi.filas.replace('filas', 'Filas').replace('fila', 'Fila')}</small></div>
						{/each}
					</div>
					<div class="picked-list">
						<h3>Tus puestos ({picked.length})</h3>
						<div class="mlist">
							{#each [...picked].sort((a, b) => (a < b ? -1 : 1)) as s (s)}
								<button class="mtag" onclick={() => toggleMesa(s)} aria-label="Quitar {seatLabel(s)}">
									<span>{seatLabel(s)}</span><small>{data.map.byId[s]?.zone.name}</small><b>×</b>
								</button>
							{:else}
								<span class="hint">Elige tus puestos en el plano.</span>
							{/each}
						</div>
						{#if limitMsg}<p class="lim">{limitMsg}</p>{/if}
					</div>
				{:else}
				<div class="qty">
					<span>Entradas</span>
					<div class="stepper">
						<button onclick={() => setN(n - 1)} disabled={n <= 1} aria-label="Menos">−</button>
						<output>{n}</output>
						<button onclick={() => setN(n + 1)} disabled={n >= Math.min(data.maxTickets, data.left)} aria-label="Más">+</button>
					</div>
				</div>

				<div class="picked-list">
					<span class="lbl">Asientos ({picked.length}/{n})</span>
					<div class="tags">
						{#each sortSeats(picked) as s (s)}
							<button class="tag" onclick={() => toggle(s)} aria-label="Quitar {s}">{s} <span>×</span></button>
						{:else}
							<span class="hint">Toca los asientos en el plano.</span>
						{/each}
						{#each Array(Math.max(0, n - picked.length)) as _, i (i)}
							{#if picked.length}<span class="tag empty">—</span>{/if}
						{/each}
					</div>
				</div>
				{/if}

				<div class="sum">
					<small>Al continuar, tus asientos quedan apartados por {data.holdMinutes} minutos y se genera la cotización en bolívares con la tasa BCV vigente. Verás el monto a pagar en el siguiente paso.</small>
				</div>

				{#if form?.message}<p class="alert">{form.message}</p>{/if}

				<form
					method="POST"
					use:enhance={() => {
						sending = true;
						return async ({ update }) => {
							await update({ reset: false });
							sending = false;
						};
					}}
				>
					<input type="hidden" name="seats" value={picked.join(',')} />
					<button class="btn btn-lime full" disabled={!ready || !rate || sending}>
						{sending
							? 'Apartando asientos…'
							: data.map
								? picked.length
									? `Continuar con ${picked.length} puesto${picked.length === 1 ? '' : 's'}`
									: 'Elige tus puestos'
								: ready
									? 'Continuar al pago'
									: `Elige ${n - picked.length} asiento${n - picked.length === 1 ? '' : 's'} más`}
					</button>
				</form>
			</aside>
		</div>
	{/if}
</div>

<style>
	.page {
		padding-top: 28px;
	}
	.back {
		display: block;
		font-size: 14px;
		color: var(--mist);
		font-weight: 600;
		margin-bottom: 24px;
	}
	.back:hover {
		color: var(--accent);
	}
	h1 {
		font-size: clamp(24px, 3.6vw, 40px);
		margin: 10px 0 6px;
	}
	.sub {
		color: var(--mist);
		margin: 0 0 32px;
		text-transform: capitalize;
	}
	.grid {
		display: grid;
		grid-template-columns: 1fr 360px;
		gap: 24px;
		align-items: start;
	}
	.hall {
		padding: 28px 20px 24px;
		overflow-x: auto;
	}
	.stage {
		position: relative;
		height: 54px;
		margin: 0 auto 36px;
		max-width: 520px;
		border-radius: 50% 50% 0 0 / 100% 100% 0 0;
		border-top: 3px solid var(--lime);
		background: radial-gradient(ellipse at 50% 0, #abce2633, transparent 70%);
		display: grid;
		place-items: center;
	}
	.stage span {
		font-family: var(--display);
		font-size: 11px;
		letter-spacing: 0.5em;
		color: var(--accent);
		text-transform: uppercase;
	}
	.map {
		display: grid;
		grid-template-columns: 22px repeat(var(--cols), minmax(26px, 38px)) 22px;
		gap: 8px 6px;
		justify-content: center;
		min-width: max-content;
		margin-inline: auto;
	}
	.rl {
		display: grid;
		place-items: center;
		font-size: 11px;
		color: var(--stone);
		font-weight: 700;
	}
	.gap {
		display: block;
	}
	.seat {
		aspect-ratio: 1;
		border: 1.5px solid #c9c3b8;
		background: var(--ink-3);
		border-radius: 9px 9px 5px 5px;
		cursor: pointer;
		display: grid;
		place-items: center;
		font-size: 10px;
		color: var(--mist);
		padding: 0;
		transition:
			transform 0.12s,
			background 0.15s,
			border-color 0.15s;
		position: relative;
	}
	.seat::after {
		content: '';
		position: absolute;
		inset: auto 18% -4px;
		height: 3px;
		border-radius: 2px;
		background: inherit;
		border: inherit;
		border-width: 0 0 1.5px;
	}
	.seat:hover:not(:disabled) {
		border-color: var(--accent);
		color: var(--paper);
		transform: translateY(-2px);
	}
	.seat.picked {
		background: var(--lime);
		border-color: var(--accent);
		color: var(--on-accent);
		font-weight: 800;
	}
	.seat.taken {
		background: repeating-linear-gradient(45deg, #d6d0c6 0 3px, #e2ddd4 3px 6px);
		border-color: #e2ddd4;
		color: transparent;
		cursor: not-allowed;
	}
	.legend {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 22px;
		margin-top: 32px;
		font-size: 13px;
		color: var(--mist);
	}
	.legend span {
		display: flex;
		gap: 8px;
		align-items: center;
	}
	.seat.sm {
		width: 18px;
		height: 18px;
		display: inline-block;
		cursor: default;
	}
	.side {
		padding: 22px;
		display: grid;
		gap: 20px;
		position: sticky;
		top: 92px;
	}
	.qty {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-weight: 700;
	}
	.stepper {
		display: flex;
		align-items: center;
		gap: 4px;
		background: var(--ink);
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 4px;
	}
	.stepper button {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		border: 0;
		background: var(--ink-3);
		font-size: 19px;
		cursor: pointer;
	}
	.stepper button:hover:not(:disabled) {
		background: var(--lime);
		color: var(--on-accent);
	}
	.stepper button:disabled {
		opacity: 0.3;
	}
	.stepper output {
		min-width: 30px;
		text-align: center;
		font-family: var(--display);
	}
	.lbl {
		font-size: 13px;
		color: var(--mist);
		font-weight: 600;
	}
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 10px;
	}
	.tag {
		border: 1px solid var(--lime);
		color: var(--accent);
		background: var(--lime-soft);
		border-radius: 8px;
		padding: 6px 10px;
		font-weight: 800;
		font-size: 14px;
		cursor: pointer;
	}
	.tag span {
		opacity: 0.6;
		margin-left: 4px;
	}
	.tag.empty {
		border-style: dashed;
		border-color: var(--line);
		background: none;
		color: var(--stone);
		cursor: default;
	}
	.hint {
		color: var(--stone);
		font-size: 14px;
	}
	.sum {
		display: grid;
		gap: 8px;
		padding-top: 16px;
		border-top: 1px solid var(--line);
	}
	.sum small {
		color: var(--mist);
		font-size: 12px;
		line-height: 1.5;
	}
	.full {
		width: 100%;
	}
	.alert {
		background: #ff6b5a1a;
		border: 1px solid #ff6b5a55;
		color: var(--danger);
		padding: 12px 14px;
		border-radius: 12px;
		margin: 0;
		font-size: 14px;
	}
	.grid.mesas {
		grid-template-columns: minmax(0, 1fr) 340px;
	}
	.ztabs {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-bottom: 12px;
	}
	.ztab {
		display: flex;
		align-items: center;
		gap: 8px;
		border: 1px solid var(--line);
		background: var(--ink);
		padding: 8px 14px;
		font-size: 13px;
		color: var(--mist);
	}
	.ztab b {
		color: var(--paper);
	}
	.ztab i,
	.zrow i {
		width: 11px;
		height: 11px;
		border-radius: 50%;
		display: inline-block;
	}
	.side h3 {
		margin: 0;
		font-size: 15px;
	}
	.zlist {
		display: grid;
	}
	.zrow {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 11px 0;
		border-bottom: 1px solid var(--line);
		font-size: 14px;
	}
	.zrow:last-child {
		border-bottom: 0;
	}
	.zrow span {
		display: flex;
		align-items: center;
		gap: 9px;
	}
	.zrow small {
		color: var(--mist);
		font-size: 12px;
	}
	.toast {
		position: fixed;
		left: 50%;
		top: 92px;
		translate: -50% 0;
		z-index: 30;
		display: flex;
		align-items: center;
		gap: 12px;
		background: var(--paper);
		color: #fff;
		padding: 13px 16px;
		font-size: 14px;
		font-weight: 600;
		box-shadow: 0 14px 40px #0004;
		max-width: min(92vw, 520px);
		animation: tin 0.25s ease;
	}
	.toast span {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: var(--lime);
		color: var(--paper);
		font-weight: 800;
		flex: none;
	}
	.toast.off span {
		background: #ffffff33;
		color: #fff;
	}
	.toast.warn span {
		background: #e9a23b;
	}
	.toast button {
		background: none;
		border: 0;
		color: #ffffff99;
		font-size: 18px;
		cursor: pointer;
		margin-left: 4px;
	}
	@keyframes tin {
		from {
			opacity: 0;
			translate: -50% -8px;
		}
	}
	.howto {
		margin: 0 0 14px;
		font-size: 14px;
		color: var(--mist);
		text-align: center;
	}
	.mlist {
		display: grid;
		gap: 8px;
		margin-top: 12px;
		max-height: 300px;
		overflow: auto;
	}
	.mtag {
		display: flex;
		align-items: center;
		gap: 6px;
		border: 1px solid var(--lime);
		background: var(--lime-soft);
		padding: 5px 9px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		color: var(--paper);
	}
	.mtag {
		justify-content: space-between;
		padding: 10px 12px;
		font-size: 14px;
		text-align: left;
	}
	.mtag span {
		flex: 1;
	}
	.mtag small {
		color: var(--mist);
		font-weight: 600;
		font-size: 12px;
	}
	.mtag b {
		opacity: 0.5;
	}
	.lim {
		margin: 8px 0 0;
		color: var(--warn);
		font-size: 13px;
	}
	@media (max-width: 960px) {
		.grid.mesas {
			grid-template-columns: minmax(0, 1fr);
		}
		.grid.mesas .side {
			position: sticky;
			bottom: 0;
			top: auto;
			z-index: 5;
			grid-template-columns: minmax(0, 1fr);
			padding: 12px 14px;
			gap: 8px;
			box-shadow: 0 -10px 30px #1514121a;
		}
		.grid.mesas .zlist {
			display: none;
		}
		.grid.mesas .mlist {
			display: flex;
		}
		.grid.mesas .sum {
			display: none;
		}
		.grid.mesas .mlist {
			flex-wrap: nowrap;
			overflow-x: auto;
			max-height: none;
			margin-top: 6px;
			padding-bottom: 2px;
		}
		.grid.mesas .mtag {
			flex: none;
			font-size: 12px;
			padding: 4px 8px;
		}
		.grid {
			grid-template-columns: minmax(0, 1fr);
		}
		.side {
			position: static;
		}
		.hall {
			padding-inline: 10px;
		}
		.map {
			grid-template-columns: 14px repeat(var(--cols), minmax(0, 30px)) 14px;
			gap: 6px 3px;
			min-width: 0;
		}
		.seat {
			font-size: 8px;
			border-radius: 6px 6px 4px 4px;
		}
	}
</style>
