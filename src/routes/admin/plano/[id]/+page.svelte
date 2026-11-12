<script lang="ts">
	import { enhance } from '$app/forms';
	import AdminNav from '../../AdminNav.svelte';
	import PlanoEditor from '#lib/components/PlanoEditor.svelte';
	import { fechaLarga, hora } from '#lib/format.ts';
	import { parseMap } from '#lib/seatmap.ts';

	let { data, form } = $props();
	let valid = $state(true);
	const p = $derived(data.perf);
	const left = $derived(p.capacity - data.locked.length);
	// svelte-ignore state_referenced_locally
	let venueId = $state(String(data.perf.venue_id ?? ''));
	// svelte-ignore state_referenced_locally
	let venue = $state(data.perf.venue);
	// svelte-ignore state_referenced_locally
	let address = $state(data.perf.address);
	// svelte-ignore state_referenced_locally
	let maps = $state(data.perf.maps_url);
	function pickVenue() {
		const v = data.venues.find((x) => String(x.id) === venueId);
		if (!v) return;
		venue = v.city ? `${v.name} · ${v.city}` : v.name;
		address = v.address;
		maps = v.maps_url;
	}
	const templates = $derived(data.venues.map((v) => ({ name: v.city ? `${v.name} · ${v.city}` : v.name, map: parseMap(v.layout), capacity: v.capacity, price: v.price_usd })));
	const keep = () => async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => update({ reset: false });
</script>

<svelte:head><title>Función · {p.title} · Administración</title></svelte:head>

<div class="wrap admin">
	<AdminNav />
	<a class="back" href="/admin/obras">← Obras y funciones</a>
	<div class="head">
		<div>
			<h1 class="display">{p.title}</h1>
			<p class="muted"><span class="cap">{fechaLarga(p.starts_at)}</span> · {hora(p.starts_at)} · {p.venue}</p>
		</div>
		<span class="state {data.state}">{data.stateLabel}</span>
	</div>
	{#if form?.notice}<p class="notice">{form.notice}</p>{/if}
	{#if form?.error}<p class="err">{form.error}</p>{/if}

	<div class="top">
		<!-- Ventas -->
		<section class="card box">
			<h2>Ventas</h2>
			<div class="stats">
				<div><b>{data.counts.sold}</b><span>vendidos</span></div>
				<div><b>{data.counts.pending}</b><span>por verificar</span></div>
				<div><b>{data.counts.held}</b><span>apartados</span></div>
				<div><b>{left}</b><span>libres de {p.capacity}</span></div>
			</div>
			{#if data.state === 'soldout'}<p class="info">La función está agotada: la venta se cerró sola. Si se liberan puestos, vuelve a abrirse.</p>{/if}
			<form method="POST" action="?/ventas" use:enhance={keep} class="sales">
				<div class="field">
					<label for="cm">Cerrar ventas automáticamente</label>
					<select class="input" id="cm" name="sales_close_minutes" value={String(p.sales_close_minutes ?? 0)}>
						{#each data.closeOptions as o (o.v)}<option value={String(o.v)}>{o.label}</option>{/each}
					</select>
				</div>
				<div class="row">
					{#if p.sales_status === 'closed'}
						<button class="btn btn-lime" name="sales_status" value="open">Abrir ventas</button>
					{:else}
						<button class="btn btn-ghost danger" name="sales_status" value="closed">Cerrar ventas ahora</button>
						<button class="btn btn-ghost" name="sales_status" value="open">Guardar cierre automático</button>
					{/if}
				</div>
			</form>
		</section>

		<!-- Datos -->
		<form class="card box" method="POST" action="?/datos" use:enhance={keep}>
			<h2>Fecha y lugar</h2>
			<div class="g2">
				<div class="field"><label for="dt">Fecha y hora (Caracas)</label><input class="input" id="dt" name="starts_at" type="datetime-local" value={p.local} required /></div>
				<div class="field">
					<label for="vs">Sala guardada</label>
					<select class="input" id="vs" name="venue_id" bind:value={venueId} onchange={pickVenue}>
						<option value="">— Otra —</option>
						{#each data.venues as v (v.id)}<option value={String(v.id)}>{v.name}{v.city ? ' · ' + v.city : ''}</option>{/each}
					</select>
				</div>
			</div>
			<div class="field"><label for="ve">Lugar (como lo ve el cliente)</label><input class="input" id="ve" name="venue" bind:value={venue} required /></div>
			<div class="g2">
				<div class="field"><label for="ad">Dirección</label><input class="input" id="ad" name="address" bind:value={address} /></div>
				<div class="field"><label for="mp">Enlace de Google Maps</label><input class="input" id="mp" name="maps_url" type="url" bind:value={maps} /></div>
			</div>
			<div><button class="btn btn-ghost">Guardar fecha y lugar</button></div>
		</form>
	</div>

	<!-- Plano -->
	<form method="POST" action="?/guardar" use:enhance={keep} class="plano">
		<header class="ph">
			<div>
				<h2>Plano y tipos de entrada</h2>
				<p class="muted">Elige un formato o dibuja el tuyo. Lo que guardes aquí es lo que verá el cliente al elegir sus puestos.</p>
			</div>
			<button class="btn btn-lime" disabled={!valid}>Guardar plano</button>
		</header>
		{#if data.locked.length}
			<p class="info">Hay {data.locked.length} puesto(s) apartados o vendidos (en gris). Puedes mover todo, cambiar precios y zonas o agregar más puestos, pero esos puestos no se pueden quitar.</p>
		{/if}
		<PlanoEditor map={data.map} capacity={p.capacity} price={p.price_usd} locked={data.locked} {templates} bind:valid />
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
	.head {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 16px;
		flex-wrap: wrap;
	}
	h1 {
		font-size: clamp(24px, 3vw, 34px);
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
	.state {
		font-size: 12px;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		padding: 8px 14px;
		border: 1px solid var(--line);
	}
	.state.open {
		background: var(--lime);
		border-color: var(--lime);
		color: #151412;
	}
	.state.closed,
	.state.soldout {
		background: var(--paper);
		color: #fff;
		border-color: var(--paper);
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
	.top {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
		gap: 20px;
		align-items: start;
	}
	.box {
		padding: 22px;
		display: grid;
		gap: 14px;
	}
	.stats {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 10px;
	}
	.stats div {
		display: grid;
		border: 1px solid var(--line);
		padding: 10px 12px;
	}
	.stats b {
		font-family: var(--display);
		font-weight: 400;
		font-size: 26px;
	}
	.stats span {
		font-size: 11px;
		color: var(--mist);
	}
	.sales {
		display: grid;
		gap: 12px;
	}
	.row {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.danger {
		color: var(--danger);
		border-color: #c0392b66;
	}
	.g2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	.plano {
		display: grid;
		gap: 14px;
	}
	.ph {
		display: flex;
		justify-content: space-between;
		align-items: end;
		gap: 12px;
		flex-wrap: wrap;
	}
	@media (max-width: 960px) {
		.top {
			grid-template-columns: 1fr;
		}
		.stats {
			grid-template-columns: repeat(2, 1fr);
		}
		.g2 {
			grid-template-columns: 1fr;
		}
	}
</style>
