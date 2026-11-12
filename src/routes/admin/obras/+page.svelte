<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import AdminNav from '../AdminNav.svelte';
	import Poster from '#lib/components/Poster.svelte';
	import { fechaLarga, hora } from '#lib/format.ts';

	let { data, form } = $props();
	let variant = $state(0);
	let title = $state('');
	const isPast = (iso: string) => new Date(iso).getTime() <= Date.now();
</script>

<svelte:head><title>Obras · Administración</title></svelte:head>

<div class="wrap admin">
	<AdminNav />
	{#if page.url.searchParams.get('creado')}<p class="notice">Evento creado: {page.url.searchParams.get('creado')} función(es). Ya aparecen abajo y en la página.</p>{/if}
	{#if form?.notice}<p class="notice">{form.notice}</p>{/if}
	{#if form?.error}<p class="err">{form.error}</p>{/if}

	<div class="forms">
		<form class="card" method="POST" action="?/obra" enctype="multipart/form-data" use:enhance>
			<h2>Nueva obra</h2>
			<div class="g2">
				<div class="field wide"><label for="t">Título</label><input class="input" id="t" name="title" required bind:value={title} /></div>
				<div class="field wide"><label for="tg">Frase corta</label><input class="input" id="tg" name="tagline" /></div>
				<div class="field wide"><label for="sy">Sinopsis</label><textarea class="input" id="sy" name="synopsis" rows="4" required></textarea></div>
				<div class="field"><label for="di">Dirección</label><input class="input" id="di" name="director" /></div>
				<div class="field"><label for="ca">Elenco</label><input class="input" id="ca" name="cast_list" /></div>
				<div class="field"><label for="ge">Género</label><input class="input" id="ge" name="genre" placeholder="Drama · Comedia" /></div>
				<div class="field"><label for="du">Duración (min)</label><input class="input" id="du" name="duration_min" type="number" min="10" value="90" /></div>
				<div class="field"><label for="ag">Clasificación</label><input class="input" id="ag" name="age_rating" placeholder="+12" /></div>
				<div class="field"><label for="po">Afiche (opcional)</label><input class="input" id="po" name="poster" type="file" accept="image/jpeg,image/png,image/webp" /></div>
			</div>
			<div class="variant">
				<span class="lbl">Si no subes afiche, se genera uno con estilo:</span>
				<div class="vrow">
					{#each [0, 1, 2, 3] as v (v)}
						<label class:on={variant === v}>
							<input type="radio" name="variant" value={v} bind:group={variant} class="sr-only" />
							<Poster title={title || 'Título'} variant={v} size="sm" />
						</label>
					{/each}
				</div>
			</div>
			<label class="check"><input type="checkbox" name="featured" /> Marcar como obra principal</label>
			<button class="btn btn-lime">Crear obra</button>
		</form>

		<div class="card cta">
			<h2>Nuevo evento</h2>
			<p class="muted">Crea funciones de una obra con su fecha, sala, plano (mesas, teatro o cine), tipos de entrada y precios, y decide cuándo abren y cierran las ventas.</p>
			<a class="btn btn-lime" href="/admin/eventos/nuevo">+ Crear evento</a>
			<a class="linkbtn" href="/admin/salas">Ver salas guardadas</a>
		</div>
	</div>

	<h2 class="display ttl">Obras</h2>
	<div class="shows">
		{#each data.shows as s (s.id)}
			<article class="card show">
				<div class="pw"><Poster title={s.title} variant={s.variant} poster={s.poster} size="sm" /></div>
				<div class="sbody">
					<div class="stop">
						<h3>{s.title}</h3>
						{#if s.featured}<span class="badge">Principal</span>{:else}
							<form method="POST" action="?/destacar" use:enhance><input type="hidden" name="id" value={s.id} /><button class="linkbtn">Hacer principal</button></form>
						{/if}
						<a class="linkbtn" href="/obra/{s.slug}" target="_blank">Ver ↗</a>
					</div>
					<table>
						<tbody>
							{#each s.perfs as p (p.id)}
								<tr class:past={isPast(p.starts_at)}>
									<td class="cap">{fechaLarga(p.starts_at)} · {hora(p.starts_at)}</td>
									<td>{p.venue}</td>
									<td><span class="st {p.state}">{p.stateLabel}</span></td>
									<td>{p.sold} vendidas · {p.taken}/{p.capacity} ocupados</td>
									<td class="acts">
										<a class="linkbtn" href="/admin/plano/{p.id}">Gestionar</a>
										{#if p.state !== 'past'}
											<form method="POST" action="?/ventas" use:enhance>
												<input type="hidden" name="id" value={p.id} />
												{#if p.sales_status === 'closed'}<button class="linkbtn" name="sales_status" value="open">Abrir ventas</button>
												{:else}<button class="linkbtn" name="sales_status" value="closed">Cerrar ventas</button>{/if}
											</form>
										{/if}
									</td>
									<td>
										<form method="POST" action="?/borrarFuncion" use:enhance><input type="hidden" name="id" value={p.id} /><button class="linkbtn danger" title="Eliminar">×</button></form>
									</td>
								</tr>
							{:else}
								<tr><td class="muted">Sin funciones</td></tr>
							{/each}
						</tbody>
					</table>
				</div>
			</article>
		{/each}
	</div>
</div>

<style>
	.cta {
		padding: 22px;
		display: grid;
		gap: 12px;
		align-content: start;
	}
	.cta .btn {
		width: fit-content;
	}
	.st {
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		padding: 3px 8px;
		border: 1px solid var(--line);
		white-space: nowrap;
	}
	.st.open {
		background: var(--lime);
		border-color: var(--lime);
		color: #151412;
	}
	.st.closed,
	.st.soldout {
		background: var(--paper);
		border-color: var(--paper);
		color: #fff;
	}
	.acts {
		display: flex;
		gap: 10px;
		align-items: center;
	}
	.admin {
		padding-top: 28px;
		display: grid;
		gap: 24px;
	}
	.notice {
		background: var(--lime-soft);
		border: 1px solid #abce2666;
		color: var(--accent);
		padding: 12px 16px;
		border-radius: 12px;
		margin: 0;
	}
	.err {
		background: #ff6b5a1a;
		border: 1px solid #ff6b5a55;
		color: var(--danger);
		padding: 12px 16px;
		border-radius: 12px;
		margin: 0;
	}
	.forms {
		display: grid;
		grid-template-columns: 1.4fr 1fr;
		gap: 20px;
		align-items: start;
	}
	.forms form {
		padding: 22px;
		display: grid;
		gap: 14px;
	}
	h2 {
		margin: 0;
		font-size: 18px;
	}
	.g2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	.wide {
		grid-column: 1 / -1;
	}
	textarea {
		resize: vertical;
	}
	.lbl {
		font-size: 13px;
		color: var(--mist);
		font-weight: 600;
	}
	.vrow {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 10px;
		margin-top: 8px;
	}
	.vrow label {
		cursor: pointer;
		border-radius: 16px;
		padding: 3px;
		border: 2px solid transparent;
	}
	.vrow label.on {
		border-color: var(--accent);
	}
	.check {
		display: flex;
		gap: 10px;
		align-items: center;
		font-size: 14px;
	}
	.check input {
		accent-color: var(--accent);
		width: 18px;
		height: 18px;
	}
	.muted {
		color: var(--mist);
		font-size: 13px;
		margin: 0;
	}
	.ttl {
		font-size: 22px;
		margin-top: 20px;
	}
	.shows {
		display: grid;
		gap: 12px;
	}
	.show {
		display: grid;
		grid-template-columns: 90px 1fr;
		gap: 18px;
		padding: 16px;
	}
	.stop {
		display: flex;
		gap: 12px;
		align-items: center;
		flex-wrap: wrap;
	}
	.stop h3 {
		margin: 0;
	}
	.badge {
		background: var(--lime);
		color: var(--on-accent);
		font-size: 11px;
		font-weight: 800;
		padding: 3px 9px;
		border-radius: 999px;
		text-transform: uppercase;
	}
	.linkbtn {
		background: none;
		border: 0;
		color: var(--mist);
		text-decoration: underline;
		cursor: pointer;
		font-size: 13px;
	}
	.danger {
		font-size: 18px;
		text-decoration: none;
	}
	.danger:hover {
		color: var(--danger);
	}
	table {
		width: 100%;
		border-collapse: collapse;
		margin-top: 10px;
		font-size: 13px;
	}
	td {
		padding: 7px 8px;
		border-top: 1px solid var(--line);
	}
	.cap {
		text-transform: capitalize;
	}
	tr.past {
		opacity: 0.45;
	}
	@media (max-width: 960px) {
		.forms {
			grid-template-columns: 1fr;
		}
		.show {
			grid-template-columns: 1fr;
		}
		.pw {
			max-width: 120px;
		}
		table {
			display: block;
			overflow-x: auto;
		}
	}
</style>
