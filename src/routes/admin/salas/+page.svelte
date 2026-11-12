<script lang="ts">
	import { enhance } from '$app/forms';
	import AdminNav from '../AdminNav.svelte';
	import MesaMap from '#lib/components/MesaMap.svelte';
	import { parseMap, expandMap, presetButacas } from '#lib/seatmap.ts';

	let { data, form } = $props();
	const preview = (v: (typeof data.venues)[number]) => expandMap(parseMap(v.layout) ?? presetButacas(v.capacity, 20));
</script>

<svelte:head><title>Salas · Administración</title></svelte:head>

<div class="wrap admin">
	<AdminNav />
	{#if form?.notice}<p class="notice">{form.notice}</p>{/if}
	{#if form?.error}<p class="err">{form.error}</p>{/if}
	<div class="head">
		<div>
			<h1 class="display">Salas</h1>
			<p class="muted">Lugares donde presentan, con su plano dibujado. Al crear un evento eliges la sala y su plano se copia a la función (luego puedes ajustarlo solo para esa función).</p>
		</div>
		<a class="btn btn-lime" href="/admin/salas/nueva">+ Nueva sala</a>
	</div>
	<div class="grid">
		{#each data.venues as v (v.id)}
			<article class="card sala">
				<a class="pv" href="/admin/salas/{v.id}" aria-label="Editar {v.name}"><MesaMap map={preview(v)} readonly /></a>
				<div class="sb">
					<b>{v.name}</b>
					<span class="muted">{v.city}{v.address ? ' · ' + v.address : ''}</span>
					<span class="muted">{v.capacity} puestos · {v.funciones} {v.funciones === 1 ? 'función' : 'funciones'}</span>
				</div>
				<div class="acts">
					<a class="btn btn-ghost sm" href="/admin/salas/{v.id}">Editar plano</a>
					<form method="POST" action="?/borrar" use:enhance={({ cancel }) => { if (!confirm(`¿Eliminar la sala «${v.name}»?`)) cancel(); }}>
						<input type="hidden" name="id" value={v.id} />
						<button class="lb">Eliminar</button>
					</form>
				</div>
			</article>
		{:else}
			<p class="muted">Todavía no hay salas guardadas.</p>
		{/each}
	</div>
</div>

<style>
	.admin {
		padding-top: 28px;
		display: grid;
		gap: 20px;
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: end;
		gap: 16px;
		flex-wrap: wrap;
	}
	h1 {
		font-size: clamp(24px, 3vw, 32px);
		margin: 0 0 6px;
	}
	.muted {
		color: var(--mist);
		font-size: 13px;
		margin: 0;
		max-width: 70ch;
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
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 16px;
	}
	.sala {
		padding: 14px;
		display: grid;
		gap: 12px;
	}
	.pv {
		display: block;
		max-height: 220px;
		overflow: hidden;
		pointer-events: auto;
	}
	.pv :global(.legend) {
		display: none;
	}
	.pv :global(svg) {
		min-width: 0 !important;
	}
	.sb {
		display: grid;
		gap: 3px;
	}
	.acts {
		display: flex;
		gap: 10px;
		align-items: center;
	}
	.btn.sm {
		padding: 8px 12px;
		font-size: 13px;
	}
	.lb {
		background: none;
		border: 0;
		color: var(--mist);
		text-decoration: underline;
		cursor: pointer;
		font-size: 13px;
	}
</style>
