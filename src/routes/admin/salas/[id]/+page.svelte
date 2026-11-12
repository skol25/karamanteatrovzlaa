<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import AdminNav from '../../AdminNav.svelte';
	import PlanoEditor from '#lib/components/PlanoEditor.svelte';
	import { parseMap } from '#lib/seatmap.ts';

	let { data, form } = $props();
	let valid = $state(true);
	const templates = $derived(data.others.map((v) => ({ name: v.city ? `${v.name} · ${v.city}` : v.name, map: parseMap(v.layout), capacity: v.capacity, price: v.price_usd })));
</script>

<svelte:head><title>{data.venue?.name ?? 'Nueva sala'} · Administración</title></svelte:head>

<div class="wrap admin">
	<AdminNav />
	<a class="back" href="/admin/salas">← Salas</a>
	{#if page.url.searchParams.get('creada')}<p class="notice">Sala creada.</p>{/if}
	{#if form?.notice}<p class="notice">{form.notice}</p>{/if}
	{#if form?.error}<p class="err">{form.error}</p>{/if}

	<form method="POST" action="?/guardar" use:enhance={() => async ({ update }) => update({ reset: false })} class="frm">
		<header class="ph">
			<h1 class="display">{data.venue ? data.venue.name : 'Nueva sala'}</h1>
			<button class="btn btn-lime" disabled={!valid}>Guardar sala</button>
		</header>
		<section class="card box">
			<div class="g4">
				<div class="field"><label for="n">Nombre</label><input class="input" id="n" name="name" value={data.venue?.name ?? ''} placeholder="Hotel Tibisay" required /></div>
				<div class="field"><label for="c">Ciudad</label><input class="input" id="c" name="city" value={data.venue?.city ?? ''} placeholder="Maturín" /></div>
				<div class="field"><label for="a">Dirección</label><input class="input" id="a" name="address" value={data.venue?.address ?? ''} /></div>
				<div class="field"><label for="m">Enlace de Google Maps</label><input class="input" id="m" name="maps_url" type="url" value={data.venue?.maps_url ?? ''} /></div>
			</div>
		</section>
		<PlanoEditor map={data.map} capacity={data.venue?.capacity ?? 100} price={data.venue?.price_usd ?? 20} {templates} bind:valid />
	</form>
</div>

<style>
	.admin {
		padding-top: 28px;
		display: grid;
		gap: 18px;
	}
	.back {
		font-size: 14px;
		color: var(--mist);
		font-weight: 600;
	}
	.frm {
		display: grid;
		gap: 16px;
	}
	.ph {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}
	h1 {
		font-size: clamp(24px, 3vw, 32px);
		margin: 0;
	}
	.box {
		padding: 18px;
	}
	.g4 {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 12px;
	}
	.notice,
	.err {
		margin: 0;
		padding: 12px 16px;
	}
	.notice {
		background: var(--lime-soft);
		color: var(--accent);
	}
	.err {
		background: #ff6b5a1a;
		color: var(--danger);
	}
	@media (max-width: 900px) {
		.g4 {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
