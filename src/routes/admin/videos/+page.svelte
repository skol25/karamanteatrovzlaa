<script lang="ts">
	import { enhance, deserialize, applyAction } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import AdminNav from '../AdminNav.svelte';

	let { data, form } = $props();

	let source = $state<'file' | 'link'>('file');
	let file = $state<File | null>(null);
	let fileError = $state('');
	let autoCover = $state<Blob | null>(null);
	let autoCoverUrl = $state('');
	let manualCover = $state(false);
	let progress = $state(-1); // -1: sin subir
	let busy = $state(false);
	let localError = $state('');
	let editing = $state<number | null>(null);
	let formEl: HTMLFormElement;

	const mb = (b: number | null) => (b ? (b / 1048576).toFixed(1) + ' MB' : '');
	const KIND = { archivo: 'Archivo', youtube: 'YouTube', instagram: 'Instagram' } as const;
	const thumb = (v: (typeof data.videos)[number]) =>
		v.cover ? (v.cover.startsWith('/') ? v.cover : `/archivo/${v.cover}`) : v.kind === 'youtube' ? `https://i.ytimg.com/vi/${v.src}/hqdefault.jpg` : null;

	/** Toma un cuadro del video elegido para usarlo como portada */
	function grabFrame(f: File) {
		autoCover = null;
		if (autoCoverUrl) URL.revokeObjectURL(autoCoverUrl);
		autoCoverUrl = '';
		const url = URL.createObjectURL(f);
		const v = document.createElement('video');
		v.muted = true;
		v.playsInline = true;
		v.preload = 'auto';
		v.src = url;
		v.addEventListener('loadedmetadata', () => {
			v.currentTime = Math.min(1.2, (v.duration || 2) / 3);
		});
		v.addEventListener('seeked', () => {
			const h = Math.min(960, v.videoHeight || 960);
			const w = Math.round(((v.videoWidth || 540) * h) / (v.videoHeight || 960));
			const c = document.createElement('canvas');
			c.width = w;
			c.height = h;
			c.getContext('2d')!.drawImage(v, 0, 0, w, h);
			c.toBlob(
				(b) => {
					autoCover = b;
					if (b) autoCoverUrl = URL.createObjectURL(b);
					URL.revokeObjectURL(url);
				},
				'image/jpeg',
				0.85
			);
		});
	}

	function pick(e: Event) {
		const f = (e.currentTarget as HTMLInputElement).files?.[0] ?? null;
		fileError = '';
		file = null;
		if (!f) return;
		if (!/^video\/(mp4|webm|quicktime)$/.test(f.type) && !/\.(mp4|webm|mov|m4v)$/i.test(f.name))
			return (fileError = 'Usa un video MP4, WEBM o MOV.');
		if (f.size > data.maxMb * 1048576) return (fileError = `El video pesa ${mb(f.size)}; el máximo es ${data.maxMb} MB.`);
		file = f;
		grabFrame(f);
	}

	async function upload(f: File) {
		const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
		let offset = 0;
		let tries = 0;
		while (offset < f.size) {
			const chunk = f.slice(offset, offset + data.chunk);
			try {
				const res = await fetch('/admin/videos/subir', {
					method: 'POST',
					headers: { 'content-type': 'application/octet-stream', 'x-upload-id': id, 'x-offset': String(offset) },
					body: chunk
				});
				const j = await res.json();
				if (j.error) throw new Error(j.error);
				offset = j.size;
				tries = 0;
			} catch (err) {
				if (++tries > 4) throw err;
				await new Promise((r) => setTimeout(r, 1500 * tries));
			}
			progress = Math.round((offset / f.size) * 100);
		}
		return id;
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		localError = '';
		const fd = new FormData(formEl);
		if (source === 'file') {
			if (!file) return (localError = 'Elige un video para subir.');
			fd.delete('video');
			const cover = fd.get('cover');
			if ((!(cover instanceof File) || cover.size === 0) && autoCover) fd.set('cover', new File([autoCover], 'portada.jpg', { type: 'image/jpeg' }));
		}
		busy = true;
		try {
			if (source === 'file') {
				progress = 0;
				fd.set('upload_id', await upload(file!));
			}
			const res = await fetch('?/crear', { method: 'POST', body: fd, headers: { 'x-sveltekit-action': 'true' } });
			const result = deserialize(await res.text());
			if (result.type === 'success') {
				formEl.reset();
				file = null;
				autoCover = null;
				autoCoverUrl = '';
				manualCover = false;
				await invalidateAll();
			}
			await applyAction(result);
		} catch (err) {
			localError = 'No se pudo subir el video: ' + (err as Error).message;
		} finally {
			busy = false;
			progress = -1;
		}
	}
</script>

<svelte:head><title>Videos · Administración</title></svelte:head>

<div class="wrap admin">
	<AdminNav />
	{#if form?.notice}<p class="notice">{form.notice}</p>{/if}
	{#if form?.error}<p class="err">{form.error}</p>{/if}

	<div class="head">
		<h1 class="display">Videos de la portada</h1>
		<p class="muted">Se muestran en un carrusel debajo de la obra en cartelera. Puedes subir el video o pegar un enlace de YouTube o Instagram.</p>
	</div>

	<form class="card frm" bind:this={formEl} method="POST" action="?/crear" enctype="multipart/form-data" onsubmit={submit}>
		<h2>Agregar video</h2>
		<div class="tabs" role="tablist">
			<button type="button" role="tab" aria-selected={source === 'file'} class:on={source === 'file'} onclick={() => (source = 'file')}>Subir video</button>
			<button type="button" role="tab" aria-selected={source === 'link'} class:on={source === 'link'} onclick={() => (source = 'link')}>Enlace de YouTube o Instagram</button>
		</div>
		<input type="hidden" name="source" value={source} />

		<div class="grid">
			<div class="fields">
				{#if source === 'file'}
					<div class="field">
						<label for="video">Video (MP4, WEBM o MOV · máx. {data.maxMb} MB)</label>
						<input class="input" id="video" name="video" type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm,.m4v" onchange={pick} />
						{#if fileError}<small class="bad">{fileError}</small>{:else if file}<small class="muted">{file.name} · {mb(file.size)}</small>{/if}
					</div>
				{:else}
					<div class="field">
						<label for="url">Enlace</label>
						<input class="input" id="url" name="url" type="url" placeholder="https://www.instagram.com/reel/… o https://youtu.be/…" />
					</div>
				{/if}
				<div class="field"><label for="title">Título</label><input class="input" id="title" name="title" required maxlength="80" placeholder="Así se vivió el estreno en Maturín" /></div>
				<div class="field"><label for="caption">Descripción corta (opcional)</label><input class="input" id="caption" name="caption" maxlength="120" placeholder="Hotel Tibisay · junio 2026" /></div>
				<div class="field wide"><label for="description">Texto que acompaña el video (opcional)</label><textarea class="input" id="description" name="description" rows="3" maxlength="1200" placeholder="Se muestra debajo del video al abrirlo"></textarea></div>
				<div class="field">
					<label for="show_id">Obra relacionada (opcional)</label>
					<select class="input" id="show_id" name="show_id">
						<option value="">— Ninguna —</option>
						{#each data.shows as s (s.id)}<option value={s.id}>{s.title}</option>{/each}
					</select>
				</div>
				<div class="field">
					<label for="cover">Portada (opcional · JPG/PNG/WEBP)</label>
					<input class="input" id="cover" name="cover" type="file" accept="image/jpeg,image/png,image/webp" onchange={(e) => (manualCover = !!(e.currentTarget as HTMLInputElement).files?.length)} />
					{#if source === 'file'}<small class="muted">Si no eliges una, se toma un cuadro del video.</small>{/if}
				</div>
			</div>
			<div class="preview">
				{#if source === 'file' && autoCoverUrl && !manualCover}
					<img src={autoCoverUrl} alt="Portada automática" />
					<span>Portada automática</span>
				{:else}
					<div class="ph">9:16</div>
				{/if}
			</div>
		</div>

		{#if progress >= 0}
			<div class="bar" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100">
				<i style="width:{progress}%"></i><span>Subiendo… {progress}%</span>
			</div>
		{/if}
		{#if localError}<p class="err">{localError}</p>{/if}
		<div><button class="btn btn-lime" disabled={busy}>{busy ? 'Guardando…' : 'Agregar al carrusel'}</button></div>
	</form>

	<h2 class="display ttl">En el carrusel <span class="muted">({data.videos.length})</span></h2>
	{#if data.videos.length === 0}
		<p class="muted">Todavía no hay videos. Mientras no haya ninguno visible, el carrusel no aparece en la portada.</p>
	{/if}
	<div class="vlist">
		{#each data.videos as v, i (v.id)}
			{@const t = thumb(v)}
			<article class="card vcard" class:off={!v.enabled}>
				<div class="th">
					{#if t}<img src={t} alt="" loading="lazy" />
					{:else if v.kind === 'archivo'}<video src="/video/{v.src}#t=1" preload="metadata" muted playsinline></video>
					{:else}<div class="ph">{KIND[v.kind]}</div>{/if}
					<span class="badge">{KIND[v.kind]}</span>
					{#if !v.enabled}<span class="badge hid">Oculto</span>{/if}
				</div>
				<div class="vb">
					<b>{v.title}</b>
					{#if v.caption}<span class="muted">{v.caption}</span>{/if}
					<small class="muted">{v.show_title ?? 'Sin obra'}{v.bytes ? ' · ' + mb(v.bytes) : ''}</small>
				</div>
				<div class="tools">
					<form method="POST" action="?/mover" use:enhance>
						<input type="hidden" name="id" value={v.id} /><input type="hidden" name="dir" value="up" />
						<button class="ib" disabled={i === 0} aria-label="Mover antes" title="Mover antes">←</button>
					</form>
					<form method="POST" action="?/mover" use:enhance>
						<input type="hidden" name="id" value={v.id} /><input type="hidden" name="dir" value="down" />
						<button class="ib" disabled={i === data.videos.length - 1} aria-label="Mover después" title="Mover después">→</button>
					</form>
					<form method="POST" action="?/visible" use:enhance>
						<input type="hidden" name="id" value={v.id} /><input type="hidden" name="enabled" value={v.enabled ? '0' : '1'} />
						<button class="lb">{v.enabled ? 'Ocultar' : 'Mostrar'}</button>
					</form>
					<button class="lb" onclick={() => (editing = editing === v.id ? null : v.id)}>Editar</button>
					<form
						method="POST"
						action="?/borrar"
						use:enhance={({ cancel }) => {
							if (!confirm(`¿Eliminar «${v.title}»? Esta acción no se puede deshacer.`)) cancel();
						}}
					>
						<input type="hidden" name="id" value={v.id} />
						<button class="lb danger">Eliminar</button>
					</form>
				</div>
				{#if editing === v.id}
					<form
						class="edit"
						method="POST"
						action="?/editar"
						enctype="multipart/form-data"
						use:enhance={() =>
							async ({ result, update }) => {
								await update();
								if (result.type === 'success') editing = null;
							}}
					>
						<input type="hidden" name="id" value={v.id} />
						<div class="field"><label for="et{v.id}">Título</label><input class="input" id="et{v.id}" name="title" value={v.title} maxlength="80" /></div>
						<div class="field"><label for="ec{v.id}">Descripción corta</label><input class="input" id="ec{v.id}" name="caption" value={v.caption} maxlength="120" /></div>
						<div class="field"><label for="ed{v.id}">Texto</label><textarea class="input" id="ed{v.id}" name="description" rows="4" maxlength="1200">{v.description ?? ''}</textarea></div>
						<div class="field">
							<label for="es{v.id}">Obra</label>
							<select class="input" id="es{v.id}" name="show_id">
								<option value="">— Ninguna —</option>
								{#each data.shows as s (s.id)}<option value={s.id} selected={s.id === v.show_id}>{s.title}</option>{/each}
							</select>
						</div>
						<div class="field"><label for="ep{v.id}">Cambiar portada</label><input class="input" id="ep{v.id}" name="cover" type="file" accept="image/jpeg,image/png,image/webp" /></div>
						<button class="btn btn-lime">Guardar cambios</button>
					</form>
				{/if}
			</article>
		{/each}
	</div>
</div>

<style>
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
	h1 {
		font-size: clamp(24px, 3vw, 32px);
		margin: 0 0 6px;
	}
	h2 {
		margin: 0;
		font-size: 18px;
	}
	.muted {
		color: var(--mist);
		font-size: 13px;
		margin: 0;
	}
	.bad {
		color: var(--danger);
	}
	.frm {
		padding: 22px;
		display: grid;
		gap: 16px;
	}
	.tabs {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}
	.tabs button {
		border: 1px solid var(--line);
		background: var(--ink);
		padding: 8px 14px;
		border-radius: 999px;
		font-weight: 600;
		font-size: 13px;
		cursor: pointer;
		color: var(--mist);
	}
	.tabs button.on {
		border-color: var(--paper);
		color: var(--paper);
		background: var(--ink-2);
	}
	.grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 160px;
		gap: 22px;
		align-items: start;
	}
	.fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	.fields .field:first-child,
	.fields .wide {
		grid-column: 1 / -1;
	}
	textarea {
		resize: vertical;
	}
	.preview {
		display: grid;
		gap: 6px;
		justify-items: center;
		font-size: 12px;
		color: var(--mist);
	}
	.preview img,
	.ph {
		width: 100%;
		aspect-ratio: 9 / 16;
		object-fit: cover;
		border: 1px solid var(--line);
		background: var(--ink-3);
	}
	.ph {
		display: grid;
		place-items: center;
		color: var(--stone);
		font-size: 12px;
		letter-spacing: 0.1em;
	}
	.bar {
		position: relative;
		height: 28px;
		background: var(--ink-3);
		border: 1px solid var(--line);
		overflow: hidden;
	}
	.bar i {
		position: absolute;
		inset: 0 auto 0 0;
		background: var(--lime);
		transition: width 0.3s;
	}
	.bar span {
		position: relative;
		display: block;
		text-align: center;
		line-height: 26px;
		font-size: 12px;
		font-weight: 700;
	}
	.ttl {
		font-size: 22px;
		margin-top: 8px;
	}
	.vlist {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 16px;
		align-items: start;
	}
	.vcard {
		padding: 10px;
		display: grid;
		gap: 10px;
	}
	.vcard.off .th {
		opacity: 0.45;
	}
	.th {
		position: relative;
		aspect-ratio: 9 / 16;
		background: var(--ink-3);
		overflow: hidden;
	}
	.th img,
	.th video {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.th .ph {
		border: 0;
		height: 100%;
	}
	.badge {
		position: absolute;
		top: 8px;
		left: 8px;
		background: var(--ink-2);
		color: var(--paper);
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		padding: 3px 7px;
	}
	.badge.hid {
		left: auto;
		right: 8px;
		background: var(--paper);
		color: var(--ink);
	}
	.vb {
		display: grid;
		gap: 2px;
	}
	.tools {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		align-items: center;
	}
	.ib {
		width: 30px;
		height: 30px;
		border: 1px solid var(--line);
		background: var(--ink-2);
		cursor: pointer;
	}
	.ib:disabled {
		opacity: 0.3;
		cursor: default;
	}
	.lb {
		background: none;
		border: 0;
		color: var(--mist);
		text-decoration: underline;
		cursor: pointer;
		font-size: 13px;
		padding: 4px;
	}
	.lb.danger:hover {
		color: var(--danger);
	}
	.edit {
		display: grid;
		gap: 10px;
		padding-top: 10px;
		border-top: 1px solid var(--line);
	}
	@media (max-width: 720px) {
		.grid {
			grid-template-columns: 1fr;
		}
		.fields {
			grid-template-columns: 1fr;
		}
		.preview {
			max-width: 160px;
		}
	}
</style>
