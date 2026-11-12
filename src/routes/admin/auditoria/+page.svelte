<script lang="ts">
	import { page } from '$app/state';
	import AdminNav from '../AdminNav.svelte';
	import { fechaHora } from '#lib/format.ts';

	let { data } = $props();
	const KINDS = [
		['', 'Todo'],
		['admin', 'Administración'],
		['venta', 'Ventas'],
		['sistema', 'Sistema']
	] as const;
	const KIND_LABEL: Record<string, string> = { admin: 'Admin', venta: 'Venta', sistema: 'Sistema' };

	/** Arma la URL conservando los filtros actuales */
	function link(changes: Record<string, string | number>) {
		const u = new URL(page.url.href);
		for (const [k, v] of Object.entries(changes)) {
			if (v === '' || v == null) u.searchParams.delete(k);
			else u.searchParams.set(k, String(v));
		}
		if (!('pagina' in changes)) u.searchParams.delete('pagina');
		return u.pathname + u.search;
	}
	const csvHref = $derived('/admin/auditoria/csv' + page.url.search.replace(/([?&])pagina=\d+&?/, '$1'));

	function pretty(detail: string | null) {
		if (!detail) return '';
		try {
			const o = JSON.parse(detail);
			if (o && typeof o === 'object' && !Array.isArray(o))
				return Object.entries(o)
					.map(([k, v]) =>
						v && typeof v === 'object' && 'antes' in (v as object)
							? `${k}: ${fmt((v as any).antes)} → ${fmt((v as any).ahora)}`
							: `${k}: ${fmt(v)}`
					)
					.join('\n');
			return JSON.stringify(o, null, 2);
		} catch {
			return detail;
		}
	}
	const fmt = (v: unknown) => (v == null || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));
	const shortUa = (ua: string | null) => {
		if (!ua) return '';
		const os = /iPhone|iPad/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : '';
		const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
		return [br, os].filter(Boolean).join(' · ');
	};
</script>

<svelte:head><title>Auditoría · Administración</title></svelte:head>

<div class="wrap admin">
	<AdminNav />

	<div class="head">
		<div>
			<h1 class="display">Registro de auditoría</h1>
			<p class="muted">Todo lo que pasa en el sistema: quién lo hizo, cuándo y desde dónde. Los registros no se pueden editar ni borrar desde el panel.</p>
		</div>
		<div class="kpis">
			<div><b>{data.counts.hoy ?? 0}</b><span>eventos en 24 h</span></div>
			<div class:alert={(data.counts.fallidos ?? 0) > 0}><b>{data.counts.fallidos ?? 0}</b><span>claves incorrectas en 24 h</span></div>
		</div>
	</div>

	<form class="card filters" method="GET">
		<div class="kinds" role="tablist" aria-label="Tipo de evento">
			{#each KINDS as [k, label] (k)}
				<a role="tab" aria-selected={data.filter.kind === k} class:on={data.filter.kind === k} href={link({ tipo: k })}>{label}</a>
			{/each}
		</div>
		{#if data.filter.kind}<input type="hidden" name="tipo" value={data.filter.kind} />{/if}
		<div class="row">
			<div class="field grow">
				<label for="q">Buscar</label>
				<input class="input" id="q" name="q" value={data.filter.q} placeholder="Nombre, correo, referencia, IP, n.º de reserva…" />
			</div>
			<div class="field">
				<label for="accion">Acción</label>
				<select class="input" id="accion" name="accion">
					<option value="">Todas</option>
					{#each Object.entries(data.actions) as [k, label] (k)}<option value={k} selected={data.filter.action === k}>{label}</option>{/each}
				</select>
			</div>
			<div class="field"><label for="desde">Desde</label><input class="input" id="desde" name="desde" type="date" value={data.filter.from} /></div>
			<div class="field"><label for="hasta">Hasta</label><input class="input" id="hasta" name="hasta" type="date" value={data.filter.to} /></div>
			<div class="btns">
				<button class="btn btn-lime">Filtrar</button>
				<a class="btn btn-ghost" href={csvHref} download>Exportar CSV</a>
			</div>
		</div>
		{#if data.filter.q || data.filter.action || data.filter.from || data.filter.to}
			<a class="clear" href="/admin/auditoria{data.filter.kind ? '?tipo=' + data.filter.kind : ''}">Quitar filtros</a>
		{/if}
	</form>

	<p class="muted count">{data.total} {data.total === 1 ? 'evento' : 'eventos'}{data.pages > 1 ? ` · página ${data.page} de ${data.pages}` : ''}</p>

	<div class="card tbl">
		<table>
			<thead>
				<tr><th>Fecha</th><th>Tipo</th><th>Acción</th><th>Descripción</th><th>Quién</th></tr>
			</thead>
			<tbody>
				{#each data.rows as r (r.id)}
					<tr class:bad={r.action === 'login_fallido'}>
						<td class="when">{fechaHora(r.at)}</td>
						<td><span class="pill {r.kind}">{KIND_LABEL[r.kind] ?? r.kind}</span></td>
						<td class="act">{data.actions[r.action] ?? r.action}</td>
						<td class="sum">
							{r.summary}
							{#if r.detail && r.detail !== '{}'}
								<details><summary>Ver detalle</summary><pre>{pretty(r.detail)}</pre></details>
							{/if}
						</td>
						<td class="who">
							<b>{r.actor}</b>
							{#if r.ip}<a href={link({ q: r.ip })} title="Ver todo lo de esta IP">{r.ip}</a>{/if}
							{#if r.user_agent}<small>{shortUa(r.user_agent)}</small>{/if}
						</td>
					</tr>
				{:else}
					<tr><td colspan="5" class="empty">No hay eventos con estos filtros.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if data.pages > 1}
		<nav class="pager" aria-label="Páginas">
			{#if data.page > 1}<a class="btn btn-ghost" href={link({ pagina: data.page - 1 })}>← Más recientes</a>{/if}
			{#if data.page < data.pages}<a class="btn btn-ghost" href={link({ pagina: data.page + 1 })}>Más antiguos →</a>{/if}
		</nav>
	{/if}
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
		gap: 20px;
		align-items: end;
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
		max-width: 62ch;
	}
	.kpis {
		display: flex;
		gap: 10px;
	}
	.kpis div {
		border: 1px solid var(--line);
		background: var(--ink-2);
		padding: 10px 16px;
		display: grid;
		min-width: 120px;
	}
	.kpis b {
		font-family: var(--display);
		font-size: 26px;
		font-weight: 400;
	}
	.kpis span {
		font-size: 11px;
		color: var(--mist);
	}
	.kpis .alert {
		border-color: var(--danger);
	}
	.kpis .alert b {
		color: var(--danger);
	}
	.filters {
		padding: 16px 18px;
		display: grid;
		gap: 14px;
	}
	.kinds {
		display: flex;
		gap: 18px;
		flex-wrap: wrap;
		border-bottom: 1px solid var(--line);
	}
	.kinds a {
		padding: 4px 0 10px;
		font-size: 12px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-weight: 600;
		color: var(--mist);
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
	}
	.kinds a.on {
		color: var(--paper);
		border-bottom-color: var(--paper);
	}
	.row {
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
		align-items: end;
	}
	.grow {
		flex: 1 1 260px;
	}
	.btns {
		display: flex;
		gap: 8px;
	}
	.clear {
		font-size: 13px;
		color: var(--accent);
		font-weight: 600;
	}
	.count {
		margin-bottom: -8px;
	}
	.tbl {
		padding: 0;
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
		min-width: 820px;
	}
	th {
		text-align: left;
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--mist);
		font-weight: 600;
		padding: 12px 14px;
		border-bottom: 1px solid var(--line);
	}
	td {
		padding: 12px 14px;
		border-bottom: 1px solid var(--line);
		vertical-align: top;
	}
	tr:last-child td {
		border-bottom: 0;
	}
	tr.bad td {
		background: #c0392b0d;
	}
	.when {
		white-space: nowrap;
		color: var(--text-2);
		font-variant-numeric: tabular-nums;
	}
	.act {
		font-weight: 700;
		white-space: nowrap;
	}
	.sum {
		color: var(--text-2);
		line-height: 1.5;
		max-width: 520px;
	}
	details {
		margin-top: 6px;
	}
	summary {
		cursor: pointer;
		color: var(--accent);
		font-size: 12px;
		font-weight: 600;
	}
	pre {
		margin: 8px 0 0;
		padding: 10px 12px;
		background: var(--ink-3);
		font-size: 12px;
		white-space: pre-wrap;
		word-break: break-word;
	}
	.who {
		display: grid;
		gap: 2px;
		min-width: 170px;
	}
	.who a {
		color: var(--mist);
		font-size: 12px;
		font-variant-numeric: tabular-nums;
	}
	.who a:hover {
		color: var(--accent);
	}
	.who small {
		color: var(--stone);
		font-size: 11px;
	}
	.pill {
		display: inline-block;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding: 3px 8px;
		border: 1px solid var(--line);
	}
	.pill.admin {
		background: var(--paper);
		color: var(--ink);
		border-color: var(--paper);
	}
	.pill.venta {
		background: var(--lime-soft);
		color: var(--accent);
		border-color: var(--lime);
	}
	.pill.sistema {
		color: var(--mist);
	}
	.empty {
		text-align: center;
		color: var(--mist);
		padding: 36px;
	}
	.pager {
		display: flex;
		justify-content: center;
		gap: 10px;
	}
</style>
