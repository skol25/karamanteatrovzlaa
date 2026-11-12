<script lang="ts">
	import { enhance } from '$app/forms';
	import AdminNav from '../AdminNav.svelte';
	import { PAYMENT_TYPES, BANCOS_VE, type PaymentMethod } from '#lib/payments.ts';

	let { data, form } = $props();
	let editing = $state<PaymentMethod | null>(null);
	let creating = $state(false);
	const type = 'pago_movil';
	const fields = PAYMENT_TYPES[type].fields;
	const open = $derived(creating || !!editing);
	const close = () => {
		editing = null;
		creating = false;
	};
</script>

<svelte:head><title>Métodos de pago · Administración</title></svelte:head>

<div class="wrap admin">
	<AdminNav />
	{#if form?.notice}<p class="notice">{form.notice}</p>{/if}
	{#if form?.error}<p class="err">{form.error}</p>{/if}

	<div class="head">
		<div>
			<h1 class="display">Métodos de pago</h1>
			<p class="muted">Los métodos activos aparecen en la página de pago para que el cliente elija uno y vea los datos.</p>
		</div>
		{#if !open}
			<button class="btn btn-lime" onclick={() => (creating = true)}>+ Agregar Pago Móvil</button>
		{/if}
	</div>

	{#if open}
		{@const m = editing}
		<form
			class="card frm"
			method="POST"
			action="?/guardar"
			use:enhance={() =>
				async ({ result, update }) => {
					await update();
					if (result.type === 'success') close();
				}}
		>
			<h2>{m ? 'Editar método' : 'Nuevo Pago Móvil'}</h2>
			<input type="hidden" name="type" value={type} />
			{#if m}<input type="hidden" name="id" value={m.id} />{/if}
			<div class="grid">
				<div class="field wide">
					<label for="label">Nombre que verá el cliente</label>
					<input class="input" id="label" name="label" value={m?.label ?? 'Pago Móvil'} placeholder="Pago Móvil · Banesco" />
				</div>
				{#each fields as f (f.key)}
					<div class="field">
						<label for={'f_' + f.key}>{f.label}</label>
						<input
							class="input"
							id={'f_' + f.key}
							name={'f_' + f.key}
							required={f.required}
							placeholder={f.placeholder}
							value={m?.data[f.key] ?? ''}
							list={f.key === 'banco' ? 'bancos' : undefined}
						/>
					</div>
				{/each}
			</div>
			<datalist id="bancos">{#each BANCOS_VE as b (b)}<option value={b}></option>{/each}</datalist>
			<label class="check"><input type="checkbox" name="enabled" checked={m ? m.enabled : true} /> Activo (visible para los clientes)</label>
			<div class="actions">
				<button class="btn btn-lime">Guardar</button>
				<button type="button" class="btn btn-ghost" onclick={close}>Cancelar</button>
			</div>
		</form>
	{/if}

	<div class="list">
		{#each data.methods as m (m.id)}
			<article class="card item" class:off={!m.enabled}>
				<div class="info">
					<div class="top">
						<span class="badge">{PAYMENT_TYPES[m.type]?.name ?? m.type}</span>
						<b>{m.label}</b>
						<span class="state" class:on={m.enabled}>{m.enabled ? 'Activo' : 'Inactivo'}</span>
					</div>
					<dl>
						{#each PAYMENT_TYPES[m.type]?.fields ?? [] as f (f.key)}
							<div><dt>{f.label}</dt><dd>{m.data[f.key] || '—'}</dd></div>
						{/each}
					</dl>
				</div>
				<div class="acts">
					<button
						class="btn btn-ghost"
						onclick={() => {
							creating = false;
							editing = m;
							scrollTo({ top: 0, behavior: 'smooth' });
						}}>Editar</button
					>
					<form method="POST" action="?/activar" use:enhance>
						<input type="hidden" name="id" value={m.id} />
						<input type="hidden" name="enabled" value={m.enabled ? '0' : '1'} />
						<button class="btn btn-ghost">{m.enabled ? 'Desactivar' : 'Activar'}</button>
					</form>
					<form
						method="POST"
						action="?/borrar"
						use:enhance={({ cancel }) => {
							if (!confirm('¿Eliminar este método de pago?')) cancel();
						}}
					>
						<input type="hidden" name="id" value={m.id} />
						<button class="linkbtn">Eliminar</button>
					</form>
				</div>
			</article>
		{:else}
			<div class="card empty">
				<b>Aún no hay métodos de pago.</b>
				<p class="muted">Mientras no haya al menos uno activo, los clientes no podrán pagar.</p>
			</div>
		{/each}
	</div>
</div>

<style>
	.admin {
		padding-top: 28px;
		display: grid;
		gap: 22px;
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: end;
		gap: 16px;
		flex-wrap: wrap;
	}
	h1 {
		font-size: 28px;
		margin: 0 0 6px;
	}
	h2 {
		margin: 0;
		font-size: 18px;
	}
	.muted {
		color: var(--mist);
		margin: 0;
		font-size: 14px;
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
	.frm {
		padding: 22px;
		display: grid;
		gap: 16px;
		border-color: #abce2666;
	}
	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 14px;
	}
	.wide {
		grid-column: 1 / -1;
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
	.actions {
		display: flex;
		gap: 10px;
	}
	.list {
		display: grid;
		gap: 12px;
	}
	.item {
		padding: 18px 20px;
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 20px;
		border-left: 4px solid var(--lime);
	}
	.item.off {
		border-left-color: var(--line);
		opacity: 0.65;
	}
	.top {
		display: flex;
		gap: 10px;
		align-items: center;
		flex-wrap: wrap;
	}
	.badge {
		font-size: 11px;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		padding: 4px 9px;
		border-radius: 999px;
		background: var(--ink-3);
	}
	.state {
		font-size: 12px;
		color: var(--mist);
	}
	.state.on {
		color: var(--accent);
	}
	dl {
		display: grid;
		grid-template-columns: repeat(4, auto);
		gap: 6px 28px;
		margin: 14px 0 0;
		justify-content: start;
	}
	dt {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--mist);
	}
	dd {
		margin: 2px 0 0;
		font-weight: 600;
		font-size: 14px;
	}
	.acts {
		display: grid;
		gap: 8px;
		align-content: start;
		min-width: 150px;
	}
	.acts .btn {
		width: 100%;
		padding: 10px 16px;
		font-size: 14px;
	}
	.linkbtn {
		background: none;
		border: 0;
		color: var(--mist);
		text-decoration: underline;
		cursor: pointer;
		font-size: 13px;
		width: 100%;
	}
	.linkbtn:hover {
		color: var(--danger);
	}
	.empty {
		padding: 26px;
		display: grid;
		gap: 6px;
	}
	@media (max-width: 760px) {
		.grid,
		.item {
			grid-template-columns: 1fr;
		}
		dl {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
