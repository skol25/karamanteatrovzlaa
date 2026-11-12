<script lang="ts">
	import { enhance } from '$app/forms';
	import AdminNav from '../AdminNav.svelte';
	import { fechaHora } from '#lib/format.ts';

	let { data, form } = $props();
	const MODE = { smtp: 'SMTP', sendmail: 'servidor de correo del hosting', none: 'sin configurar (solo se registran)' } as const;
</script>

<svelte:head><title>Ajustes · Administración</title></svelte:head>

<div class="wrap admin">
	<AdminNav />
	{#if form?.notice}<p class="notice">{form.notice}</p>{/if}
	{#if form?.error}<p class="err">{form.error}</p>{/if}

	<div>
		<h1 class="display">Ajustes</h1>
		<p class="muted">Configura a dónde llegan los avisos de pago.</p>
	</div>

	<section class="card box">
		<h2>Correos que reciben los comprobantes</h2>
		<p class="muted">Cada vez que un cliente reporte un pago, se envía un aviso con el comprobante adjunto a estos correos. Puedes poner hasta 5, uno por línea.</p>
		{#if !data.emails.length}
			<p class="warn">Todavía no hay ningún correo: los avisos de pago no le llegan a nadie (los pagos igual se ven en «Pagos y tasa»).</p>
		{/if}
		<form method="POST" action="?/correos" use:enhance={() => async ({ update }) => update({ reset: false })}>
			<label for="emails" class="sr-only">Correos</label>
			<textarea class="input" id="emails" name="emails" rows="3" placeholder="pagos@karamantea.com">{form?.raw ?? data.emails.join('\n')}</textarea>
			<div class="row">
				<button class="btn btn-lime">Guardar correos</button>
			</div>
		</form>
		<form method="POST" action="?/prueba" use:enhance class="test">
			<button class="btn btn-ghost" disabled={!data.emails.length}>Enviar correo de prueba</button>
			<span class="muted">Salida: {MODE[data.mail.mode as keyof typeof MODE]} · Remitente: {data.mail.from}</span>
		</form>
		{#if data.lastTests.length}
			<ul class="tests">
				{#each data.lastTests as t (t.created_at)}
					<li>
						<span class:okd={t.delivered} class:bad={!t.delivered}>{t.delivered ? 'Enviado' : 'No enviado'}</span>
						{fechaHora(t.created_at)} · {t.to_addr}{t.error ? ` · ${t.error}` : ''}
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>

<style>
	.admin {
		padding-top: 28px;
		display: grid;
		gap: 22px;
	}
	h1 {
		font-size: clamp(24px, 3vw, 32px);
		margin: 0 0 6px;
	}
	h2 {
		font-size: 18px;
		margin: 0;
	}
	.muted {
		color: var(--mist);
		font-size: 13px;
		margin: 0;
	}
	.box {
		padding: 24px;
		display: grid;
		gap: 14px;
		max-width: 720px;
	}
	textarea {
		width: 100%;
		resize: vertical;
		font-family: inherit;
	}
	.row {
		margin-top: 10px;
	}
	.test {
		display: flex;
		gap: 14px;
		align-items: center;
		flex-wrap: wrap;
		padding-top: 14px;
		border-top: 1px solid var(--line);
	}
	.warn {
		margin: 0;
		background: #a15c0014;
		border: 1px solid #a15c0055;
		color: var(--warn);
		padding: 10px 14px;
		font-size: 14px;
	}
	.notice {
		background: var(--lime-soft);
		border: 1px solid #abce2666;
		color: var(--accent);
		padding: 12px 16px;
		margin: 0;
	}
	.err {
		background: #ff6b5a1a;
		border: 1px solid #ff6b5a55;
		color: var(--danger);
		padding: 12px 16px;
		margin: 0;
	}
	.tests {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 6px;
		font-size: 13px;
		color: var(--text-2);
	}
	.tests span {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin-right: 8px;
	}
	.okd {
		color: var(--accent);
	}
	.bad {
		color: var(--danger);
	}
</style>
