<script lang="ts">
	import { enhance } from '$app/forms';
	import { bs, usd, rateFmt, fechaLarga, hora, fechaHora, fechaValor } from '#lib/format.ts';
	import AdminNav from './AdminNav.svelte';

	let { data, form } = $props();
	let filter = $state<'submitted' | 'held' | 'all'>('submitted');
	const rows = $derived(data.authed ? data.rows.filter((r: any) => filter === 'all' || r.status === filter) : []);
	let rejecting = $state<number | null>(null);

	const label: Record<string, string> = {
		held: 'Esperando pago',
		submitted: 'Por verificar',
		confirmed: 'Confirmada',
		rejected: 'Rechazada',
		expired: 'Vencida'
	};
</script>

<svelte:head><title>Administración · Karamantea Teatro</title></svelte:head>

{#if !data.authed}
	<div class="wrap login">
		<form method="POST" action="?/login" class="card" use:enhance>
			<img src="/logo.png" alt="" width="72" height="72" />
			<h1 class="display">Administración</h1>
			<div class="field">
				<label for="pw">Clave</label>
				<input class="input" id="pw" type="password" name="password" autocomplete="current-password" required />
			</div>
			{#if form?.loginError}<p class="err">{form.loginError}</p>{/if}
			<button class="btn btn-lime">Entrar</button>
		</form>
	</div>
{:else}
	<div class="wrap admin">
		<AdminNav />

		{#if form?.notice}<p class="notice">{form.notice}</p>{/if}
		{#if form?.error}<p class="err box">{form.error}</p>{/if}

		<div class="stats">
			<div class="card"><span>Por verificar</span><b class:hot={data.stats.pending > 0}>{data.stats.pending}</b></div>
			<div class="card"><span>Esperando pago</span><b>{data.stats.held}</b></div>
			<div class="card"><span>Entradas vendidas</span><b>{data.stats.tickets}</b></div>
			<div class="card"><span>Recaudado</span><b class="sm">{bs(data.stats.confirmedBs)}</b></div>
		</div>

		<section class="card rate">
			<div class="rhead">
				<div>
					<span class="eyebrow">Tasa oficial BCV</span>
					{#if data.current}
						<p class="big">{rateFmt(data.current.rate)} <small>Bs/USD</small></p>
						<p class="muted">
							Fecha valor {fechaValor(data.current.valid_date)} · origen <b>{data.current.source === 'bcv' ? 'BCV automático' : 'manual'}</b>
						</p>
					{:else}
						<p class="big warn">Sin tasa vigente</p>
						<p class="muted">No se puede vender hasta registrar la tasa de hoy ({data.today}).</p>
					{/if}
					<p class="muted sm">
						Última consulta automática: {data.lastFetch.at ? fechaHora(data.lastFetch.at) : '—'} ·
						<span class:ok={data.lastFetch.ok} class:bad={!data.lastFetch.ok}>{data.lastFetch.message}</span>
					</p>
				</div>
				<form method="POST" action="?/bcv" use:enhance><button class="btn btn-ghost">Consultar BCV ahora</button></form>
			</div>
			<form method="POST" action="?/tasa" class="manual" use:enhance>
				<span class="lbl">Respaldo manual</span>
				<input class="input" name="rate" placeholder="Ej. 36,5120" inputmode="decimal" required />
				<input class="input" name="valid_date" type="date" value={data.today} required />
				<button class="btn btn-lime">Registrar tasa</button>
			</form>
			<details>
				<summary>Historial de tasas</summary>
				<table>
					<tbody>
						{#each data.rates as t (t.id)}
							<tr><td>{t.valid_date}</td><td>{rateFmt(t.rate)}</td><td>{t.source}</td><td class="muted">{t.fetched_at} UTC</td></tr>
						{/each}
					</tbody>
				</table>
			</details>
		</section>

		<section>
			<div class="lhead">
				<h2 class="display">Reservas</h2>
				<div class="tabs">
					<button class:on={filter === 'submitted'} onclick={() => (filter = 'submitted')}>Por verificar</button>
					<button class:on={filter === 'held'} onclick={() => (filter = 'held')}>Esperando pago</button>
					<button class:on={filter === 'all'} onclick={() => (filter = 'all')}>Todas</button>
				</div>
			</div>

			<div class="list">
				{#each rows as r (r.id)}
					<article class="card res st-{r.status}">
						<div class="rmain">
							<div class="rtop">
								<span class="badge">{label[r.status]}</span>
								<span class="code">{r.token.slice(0, 8).toUpperCase()}</span>
								{#if r.expire_reason}<span class="muted sm">({r.expire_reason})</span>{/if}
							</div>
							<h3>{r.title}</h3>
							<p class="muted cap">{fechaLarga(r.starts_at)} · {hora(r.starts_at)} · {r.venue}</p>
							<p><b class="seats">{r.seats}</b> · {r.qty} entrada(s) · <b>{bs(r.total_bs)}</b> <span class="muted">({usd(r.total_usd)} × {rateFmt(r.rate)})</span></p>
							{#if r.buyer_name}
								<p class="buyer">
									{r.buyer_name} · C.I. {r.buyer_doc} · {r.email} · {r.phone}<br />
									{r.pay_method} · {r.pay_bank} · Ref. <b>{r.pay_ref}</b>
									{#if r.submitted_at}<span class="muted"> · enviado {fechaHora(r.submitted_at)}</span>{/if}
								</p>
							{/if}
							{#if r.admin_note}<p class="muted">Nota: {r.admin_note}</p>{/if}
						</div>
						<div class="ractions">
							{#if r.receipt_file}
								<a class="btn btn-ghost" href="/admin/comprobante/{r.id}" target="_blank">Ver comprobante</a>
							{/if}
							{#if r.status === 'submitted'}
								<form method="POST" action="?/confirmar" use:enhance>
									<input type="hidden" name="id" value={r.id} />
									<button class="btn btn-lime">Confirmar y enviar entradas</button>
								</form>
								{#if rejecting === r.id}
									<form method="POST" action="?/rechazar" class="rej" use:enhance={() => async ({ update }) => { rejecting = null; await update(); }}>
										<input type="hidden" name="id" value={r.id} />
										<input class="input" name="note" placeholder="Motivo (se envía al comprador)" />
										<button class="btn btn-ghost danger">Rechazar</button>
									</form>
								{:else}
									<button class="linkbtn" onclick={() => (rejecting = r.id)}>Rechazar pago…</button>
								{/if}
							{:else if r.status === 'held'}
								<span class="muted sm">Vence {fechaHora(r.expires_at)}</span>
							{/if}
						</div>
					</article>
				{:else}
					<p class="muted empty">No hay reservas en esta vista.</p>
				{/each}
			</div>
		</section>
	</div>
{/if}

<style>
	.login {
		display: grid;
		place-items: center;
		min-height: 60vh;
	}
	.login form {
		width: min(380px, 100%);
		padding: 32px;
		display: grid;
		gap: 18px;
		justify-items: center;
	}
	.login .field {
		width: 100%;
	}
	.login h1 {
		font-size: 20px;
		margin: 0;
	}
	.admin {
		padding-top: 28px;
		display: grid;
		gap: 24px;
	}
	.notice {
		background: var(--lime-soft);
		border: 1px solid #abce2666;
		color: var(--lime);
		padding: 12px 16px;
		border-radius: 12px;
		margin: 0;
	}
	.err {
		color: #ffb1a7;
		margin: 0;
	}
	.err.box {
		background: #ff6b5a1a;
		border: 1px solid #ff6b5a55;
		padding: 12px 16px;
		border-radius: 12px;
	}
	.stats {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 14px;
	}
	.stats .card {
		padding: 18px;
		display: grid;
		gap: 4px;
	}
	.stats span {
		font-size: 12px;
		color: var(--mist);
		text-transform: uppercase;
		letter-spacing: 0.12em;
	}
	.stats b {
		font-family: var(--display);
		font-weight: 400;
		font-size: 28px;
	}
	.stats b.sm {
		font-size: 18px;
		padding-top: 8px;
	}
	.stats b.hot {
		color: var(--lime);
	}
	.rate {
		padding: 22px;
		display: grid;
		gap: 18px;
	}
	.rhead {
		display: flex;
		justify-content: space-between;
		gap: 20px;
		flex-wrap: wrap;
		align-items: start;
	}
	.big {
		font-family: var(--display);
		font-size: 30px;
		margin: 8px 0 2px;
	}
	.big small {
		font-size: 13px;
		color: var(--mist);
	}
	.big.warn {
		color: #ffb547;
		font-size: 22px;
	}
	.muted {
		color: var(--mist);
		margin: 2px 0;
		font-size: 14px;
	}
	.sm {
		font-size: 12px;
	}
	.cap {
		text-transform: capitalize;
	}
	.ok {
		color: var(--lime);
	}
	.bad {
		color: #ffb547;
	}
	.manual {
		display: grid;
		grid-template-columns: auto 1fr 180px auto;
		gap: 10px;
		align-items: center;
		padding-top: 16px;
		border-top: 1px solid var(--line);
	}
	.lbl {
		font-size: 13px;
		font-weight: 700;
		color: var(--mist);
	}
	details {
		font-size: 13px;
		color: var(--mist);
	}
	summary {
		cursor: pointer;
	}
	table {
		width: 100%;
		margin-top: 10px;
		border-collapse: collapse;
	}
	td {
		padding: 6px 8px;
		border-top: 1px solid var(--line);
		color: var(--paper);
	}
	.lhead {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
		margin: 10px 0 16px;
	}
	h2 {
		font-size: 22px;
		margin: 0;
	}
	.tabs {
		display: flex;
		gap: 4px;
		background: var(--ink-2);
		border: 1px solid var(--line);
		padding: 4px;
		border-radius: 999px;
	}
	.tabs button {
		border: 0;
		background: none;
		padding: 8px 14px;
		border-radius: 999px;
		cursor: pointer;
		font-size: 13px;
		font-weight: 700;
		color: var(--mist);
	}
	.tabs button.on {
		background: var(--lime);
		color: var(--ink);
	}
	.list {
		display: grid;
		gap: 12px;
	}
	.res {
		padding: 18px 20px;
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 20px;
		border-left: 4px solid var(--line);
	}
	.st-submitted {
		border-left-color: var(--lime);
	}
	.st-held {
		border-left-color: #ffb547;
	}
	.st-expired,
	.st-rejected {
		opacity: 0.6;
	}
	.rtop {
		display: flex;
		gap: 10px;
		align-items: center;
	}
	.badge {
		font-size: 11px;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		padding: 4px 9px;
		border-radius: 999px;
		background: var(--ink-3);
	}
	.st-submitted .badge {
		background: var(--lime);
		color: var(--ink);
	}
	.code {
		font-family: var(--display);
		font-size: 12px;
		color: var(--mist);
	}
	.res h3 {
		margin: 8px 0 2px;
	}
	.res p {
		margin: 4px 0;
		font-size: 14px;
	}
	.seats {
		color: var(--lime);
	}
	.buyer {
		background: var(--ink);
		border-radius: 10px;
		padding: 10px 12px;
		line-height: 1.7;
	}
	.ractions {
		display: grid;
		gap: 8px;
		align-content: start;
		justify-items: stretch;
		min-width: 230px;
	}
	.ractions .btn {
		width: 100%;
		padding: 11px 18px;
		font-size: 14px;
	}
	.rej {
		display: grid;
		gap: 8px;
	}
	.danger:hover {
		border-color: var(--danger);
		color: var(--danger);
	}
	.linkbtn {
		background: none;
		border: 0;
		color: var(--mist);
		text-decoration: underline;
		cursor: pointer;
		font-size: 13px;
	}
	.empty {
		padding: 30px;
		text-align: center;
	}
	@media (max-width: 860px) {
		.stats {
			grid-template-columns: 1fr 1fr;
		}
		.manual {
			grid-template-columns: 1fr 1fr;
		}
		.manual .lbl {
			grid-column: 1 / -1;
		}
		.manual .btn {
			grid-column: 1 / -1;
		}
		.res {
			grid-template-columns: 1fr;
		}
	}
</style>
