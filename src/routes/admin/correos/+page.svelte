<script lang="ts">
	import AdminNav from '../AdminNav.svelte';
	import { fechaHora } from '#lib/format.ts';
	let { data } = $props();
</script>

<svelte:head><title>Correos · Administración</title></svelte:head>

<div class="wrap admin">
	<AdminNav />
	<p class="muted">
		Todos los correos que envía el sistema quedan registrados aquí. Si el SMTP todavía no está configurado, solo se registran
		(ideal para la demo).
	</p>
	<div class="grid">
		<ul class="list card">
			{#each data.mails as m (m.id)}
				<li>
					<a href="?id={m.id}" class:on={data.selected?.id === m.id} data-sveltekit-noscroll>
						<span class="to">{m.to_addr}</span>
						<b>{m.subject}</b>
						<span class="meta">
							{fechaHora(m.created_at)} ·
							{#if m.delivered}<span class="ok">enviado</span>{:else}<span class="bad">{m.error}</span>{/if}
							{#if m.attachments}· 📎 {m.attachments}{/if}
						</span>
					</a>
				</li>
			{:else}
				<li class="muted empty">Aún no se ha enviado ningún correo.</li>
			{/each}
		</ul>
		<div class="preview card">
			{#if data.selected}
				<iframe title="Vista previa" srcdoc={data.selected.html} sandbox=""></iframe>
			{/if}
		</div>
	</div>
</div>

<style>
	.admin {
		padding-top: 28px;
		display: grid;
		gap: 20px;
	}
	.muted {
		color: var(--mist);
		font-size: 14px;
		margin: 0;
	}
	.grid {
		display: grid;
		grid-template-columns: 380px 1fr;
		gap: 16px;
		align-items: start;
	}
	.list {
		list-style: none;
		margin: 0;
		padding: 6px;
		max-height: 75vh;
		overflow: auto;
	}
	.list a {
		display: grid;
		gap: 2px;
		padding: 12px;
		border-radius: 10px;
	}
	.list a:hover {
		background: var(--ink-3);
	}
	.list a.on {
		background: var(--ink-3);
		box-shadow: inset 3px 0 0 var(--lime);
	}
	.to {
		font-size: 12px;
		color: var(--lime);
	}
	b {
		font-size: 14px;
	}
	.meta {
		font-size: 12px;
		color: var(--mist);
	}
	.ok {
		color: var(--lime);
	}
	.bad {
		color: #ffb547;
	}
	.empty {
		padding: 20px;
	}
	.preview {
		overflow: hidden;
		min-height: 75vh;
	}
	iframe {
		width: 100%;
		height: 75vh;
		border: 0;
		background: #0b0b0b;
	}
	@media (max-width: 900px) {
		.grid {
			grid-template-columns: 1fr;
		}
		.list {
			max-height: 40vh;
		}
	}
</style>
