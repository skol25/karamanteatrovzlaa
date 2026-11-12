<script lang="ts">
	import { enhance } from '$app/forms';
	import AdminNav from '../../AdminNav.svelte';
	import PlanoEditor from '#lib/components/PlanoEditor.svelte';
	import Poster from '#lib/components/Poster.svelte';
	import { parseMap } from '#lib/seatmap.ts';

	let { data, form } = $props();
	let valid = $state(true);
	let busy = $state(false);
	// svelte-ignore state_referenced_locally
	let obraMode = $state<'existente' | 'nueva'>(data.shows.length ? 'existente' : 'nueva');
	let title = $state('');
	let variant = $state(0);
	let dates = $state<string[]>(['']);
	let venueId = $state('');
	let vname = $state('');
	let city = $state('');
	let address = $state('');
	let maps = $state('');
	let saveVenue = $state(true);
	let editor: ReturnType<typeof PlanoEditor> | undefined = $state();

	const templates = $derived(data.venues.map((v) => ({ name: v.city ? `${v.name} · ${v.city}` : v.name, map: parseMap(v.layout), capacity: v.capacity, price: v.price_usd })));
	function pickVenue() {
		const v = data.venues.find((x) => String(x.id) === venueId);
		if (!v) {
			vname = city = address = maps = '';
			saveVenue = true;
			return;
		}
		vname = v.name;
		city = v.city;
		address = v.address;
		maps = v.maps_url;
		saveVenue = false;
		editor?.load({ map: parseMap(v.layout), capacity: v.capacity, price: v.price_usd });
	}
	/** Repite la última fecha un día después, a la misma hora */
	function addDate() {
		const last = dates.findLast((d) => d);
		if (!last) return (dates = [...dates, '']);
		const d = new Date(last + ':00Z');
		d.setUTCDate(d.getUTCDate() + 1);
		dates = [...dates, d.toISOString().slice(0, 16)];
	}
</script>

<svelte:head><title>Nuevo evento · Administración</title></svelte:head>

<div class="wrap admin">
	<AdminNav />
	<div>
		<h1 class="display">Nuevo evento</h1>
		<p class="muted">Cuatro pasos: la obra, las fechas, el lugar con su plano y precios, y cómo se abren las ventas.</p>
	</div>
	{#if form?.error}<p class="err">{form.error}</p>{/if}

	<form
		method="POST"
		enctype="multipart/form-data"
		class="steps"
		use:enhance={() => {
			busy = true;
			return async ({ update }) => {
				busy = false;
				await update({ reset: false });
			};
		}}
	>
		<!-- 1 -->
		<section class="card step">
			<h2><span>1</span> Obra</h2>
			<div class="seg">
				<label class:on={obraMode === 'existente'}><input type="radio" name="obra_mode" value="existente" bind:group={obraMode} class="sr-only" disabled={!data.shows.length} />Una obra que ya está</label>
				<label class:on={obraMode === 'nueva'}><input type="radio" name="obra_mode" value="nueva" bind:group={obraMode} class="sr-only" />Obra nueva</label>
			</div>
			{#if obraMode === 'existente'}
				<div class="field">
					<label for="sh">Obra</label>
					<select class="input" id="sh" name="show_id" value={data.preShow ? String(data.preShow) : undefined}>
						{#each data.shows as s (s.id)}<option value={String(s.id)}>{s.title}</option>{/each}
					</select>
				</div>
			{:else}
				<div class="nueva">
					<div class="g2">
						<div class="field wide"><label for="t">Título</label><input class="input" id="t" name="title" required bind:value={title} /></div>
						<div class="field wide"><label for="tg">Frase corta</label><input class="input" id="tg" name="tagline" /></div>
						<div class="field wide"><label for="sy">Sinopsis</label><textarea class="input" id="sy" name="synopsis" rows="3" required></textarea></div>
						<div class="field"><label for="di">Dirección</label><input class="input" id="di" name="director" /></div>
						<div class="field"><label for="ca">Elenco</label><input class="input" id="ca" name="cast_list" /></div>
						<div class="field"><label for="ge">Género</label><input class="input" id="ge" name="genre" placeholder="Drama · Comedia" /></div>
						<div class="field"><label for="du">Duración (min)</label><input class="input" id="du" name="duration_min" type="number" min="10" value="90" /></div>
						<div class="field"><label for="ag">Clasificación</label><input class="input" id="ag" name="age_rating" placeholder="+12" /></div>
						<div class="field"><label for="po">Afiche (opcional)</label><input class="input" id="po" name="poster" type="file" accept="image/jpeg,image/png,image/webp" /></div>
					</div>
					<div class="variant">
						<span class="muted">Si no subes afiche, se genera uno con este estilo:</span>
						<div class="vrow">
							{#each [0, 1, 2, 3] as v (v)}
								<label class:on={variant === v}>
									<input type="radio" name="variant" value={v} bind:group={variant} class="sr-only" />
									<Poster title={title || 'Título'} variant={v} size="sm" />
								</label>
							{/each}
						</div>
					</div>
				</div>
			{/if}
		</section>

		<!-- 2 -->
		<section class="card step">
			<h2><span>2</span> Fechas</h2>
			<p class="muted">Cada fecha es una función con su propio plano y sus propias ventas (hora de Caracas).</p>
			<div class="dates">
				{#each dates as _, i (i)}
					<div class="date">
						<input class="input" type="datetime-local" name="starts_at" bind:value={dates[i]} required aria-label="Fecha {i + 1}" />
						{#if dates.length > 1}<button type="button" class="x" aria-label="Quitar fecha" onclick={() => (dates = dates.filter((_, j) => j !== i))}>×</button>{/if}
					</div>
				{/each}
			</div>
			<div><button type="button" class="btn btn-ghost sm" onclick={addDate}>+ Otra fecha</button></div>
		</section>

		<!-- 3 -->
		<section class="card step">
			<h2><span>3</span> Lugar</h2>
			<div class="g4">
				<div class="field">
					<label for="vs">Sala guardada</label>
					<select class="input" id="vs" name="venue_id" bind:value={venueId} onchange={pickVenue}>
						<option value="">— Lugar nuevo —</option>
						{#each data.venues as v (v.id)}<option value={String(v.id)}>{v.name}{v.city ? ' · ' + v.city : ''}</option>{/each}
					</select>
				</div>
				<div class="field"><label for="vn">Nombre del lugar</label><input class="input" id="vn" name="venue_name" bind:value={vname} required placeholder="Hotel Tibisay" /></div>
				<div class="field"><label for="vc">Ciudad</label><input class="input" id="vc" name="venue_city" bind:value={city} placeholder="Maturín" /></div>
				<div class="field"><label for="ad">Dirección</label><input class="input" id="ad" name="address" bind:value={address} /></div>
			</div>
			<div class="field"><label for="mp">Enlace de Google Maps</label><input class="input" id="mp" name="maps_url" type="url" bind:value={maps} /></div>
		</section>

		<!-- 4 -->
		<section class="step plano">
			<h2><span>4</span> Plano y tipos de entrada</h2>
			<p class="muted">{venueId ? 'Se cargó el plano de la sala. Ajústalo si este evento es distinto.' : 'Elige un formato (mesas, teatro, cine) y arrastra para acomodarlo.'} Cada zona es un tipo de entrada con su precio.</p>
			<PlanoEditor bind:this={editor} map={null} capacity={100} price={20} {templates} bind:valid />
			<label class="check"><input type="checkbox" name="save_venue" bind:checked={saveVenue} /> {venueId ? 'Actualizar también el plano guardado de esta sala' : 'Guardar este lugar y su plano como sala para próximos eventos'}</label>
		</section>

		<!-- 5 -->
		<section class="card step">
			<h2><span>5</span> Ventas</h2>
			<div class="g2">
				<div class="field">
					<label for="ss">Al crear el evento</label>
					<select class="input" id="ss" name="sales_status">
						<option value="open">Abrir ventas ya</option>
						<option value="closed">Dejar ventas cerradas (las abro luego)</option>
					</select>
				</div>
				<div class="field">
					<label for="cm">Cerrar ventas automáticamente</label>
					<select class="input" id="cm" name="sales_close_minutes">
						{#each data.closeOptions as o (o.v)}<option value={String(o.v)}>{o.label}</option>{/each}
					</select>
				</div>
			</div>
			<p class="muted">Si se venden todos los puestos, la función se marca <b>Agotado</b> y deja de vender sola.</p>
			<div><button class="btn btn-lime" disabled={!valid || busy}>{busy ? 'Creando…' : `Crear evento (${dates.length} ${dates.length === 1 ? 'función' : 'funciones'})`}</button></div>
		</section>
	</form>
</div>

<style>
	.admin {
		padding-top: 28px;
		display: grid;
		gap: 20px;
	}
	h1 {
		font-size: clamp(26px, 3.4vw, 38px);
		margin: 0 0 6px;
	}
	h2 {
		font-size: 18px;
		margin: 0;
		display: flex;
		align-items: center;
		gap: 10px;
	}
	h2 span {
		width: 28px;
		height: 28px;
		display: grid;
		place-items: center;
		background: var(--paper);
		color: var(--lime);
		font-size: 14px;
		border-radius: 50%;
	}
	.muted {
		color: var(--mist);
		font-size: 13px;
		margin: 0;
	}
	.err {
		margin: 0;
		padding: 12px 16px;
		background: #ff6b5a1a;
		border: 1px solid #ff6b5a55;
		color: var(--danger);
	}
	.steps {
		display: grid;
		gap: 18px;
	}
	.step {
		padding: 22px;
		display: grid;
		gap: 14px;
	}
	.step.plano {
		padding: 0;
	}
	.seg {
		display: inline-flex;
		border: 1px solid var(--line);
		width: fit-content;
	}
	.seg label {
		padding: 10px 16px;
		font-weight: 700;
		font-size: 14px;
		cursor: pointer;
		color: var(--mist);
	}
	.seg label.on {
		background: var(--paper);
		color: #fff;
	}
	.nueva {
		display: grid;
		gap: 14px;
	}
	.g2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	.g2 .wide {
		grid-column: span 2;
	}
	.g4 {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 12px;
	}
	.variant {
		display: grid;
		gap: 8px;
	}
	.vrow {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}
	.vrow label {
		width: 80px;
		cursor: pointer;
		outline: 2px solid transparent;
		outline-offset: 2px;
	}
	.vrow label.on {
		outline-color: var(--lime);
	}
	.dates {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}
	.date {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.x {
		background: none;
		border: 0;
		font-size: 22px;
		color: var(--mist);
		cursor: pointer;
		padding: 0 6px;
	}
	.btn.sm {
		padding: 8px 14px;
		font-size: 13px;
	}
	.check {
		display: flex;
		gap: 8px;
		align-items: center;
		font-size: 14px;
	}
	@media (max-width: 900px) {
		.g4 {
			grid-template-columns: 1fr 1fr;
		}
	}
	@media (max-width: 600px) {
		.g2,
		.g4 {
			grid-template-columns: 1fr;
		}
		.g2 .wide {
			grid-column: auto;
		}
	}
</style>
