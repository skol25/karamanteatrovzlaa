<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { bs, usd, rateFmt, fechaLarga, hora, fechaValor, fechaHora } from '#lib/format.ts';
	import { PAYMENT_TYPES } from '#lib/payments.ts';

	let { data, form } = $props();
	const r = $derived(data.r);
	const p = $derived(r.perf);

	// --- temporizador sincronizado con el reloj del servidor
	let offset = $derived(data.serverNow - Date.now());
	let now = $state(Date.now());
	$effect(() => {
		const t = setInterval(() => (now = Date.now()), 250);
		return () => clearInterval(t);
	});
	const remaining = $derived(Math.max(0, r.expires_at - (now + offset)));
	const mm = $derived(String(Math.floor(remaining / 60000)).padStart(2, '0'));
	const ss = $derived(String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0'));
	const totalMs = $derived(r.expires_at - r.created_at);
	const pct = $derived(Math.max(0, Math.min(100, (remaining / totalMs) * 100)));

	$effect(() => {
		if (r.status === 'held' && remaining <= 0) invalidate('app:reserva');
	});
	// Revisa cada 20 s si la cotización sigue vigente (por ejemplo, si cambió la tasa BCV)
	$effect(() => {
		if (r.status !== 'held') return;
		const t = setInterval(() => invalidate('app:reserva'), 20000);
		return () => clearInterval(t);
	});

	let sending = $state(false);
	let fileName = $state('');
	let dragging = $state(false);
	let fileInput = $state<HTMLInputElement>();
	let copied = $state('');
	async function copy(key: string, text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copied = key;
			setTimeout(() => (copied = ''), 1500);
		} catch {}
	}
	const amountPlain = $derived(r.total_bs.toFixed(2).replace('.', ','));

	const values = $derived((form as any)?.values ?? {});
	const errors = $derived(((form as any)?.errors ?? {}) as Record<string, string>);

	// --- métodos de pago: llegan como array desde el servidor; el cliente elige uno
	const methods = $derived(data.paymentMethods);
	let methodId = $state<number | null>(null);
	$effect.pre(() => {
		const fromForm = Number(values.pay_method_id);
		if (methodId == null || !methods.some((m) => m.id === methodId))
			methodId = methods.find((m) => m.id === fromForm)?.id ?? methods[0]?.id ?? null;
	});
	const method = $derived(methods.find((m) => m.id === methodId) ?? null);
	const methodFields = $derived(method ? (PAYMENT_TYPES[method.type]?.fields ?? []) : []);

	const banks = [
		'Banco de Venezuela',
		'Banesco',
		'Mercantil',
		'BBVA Provincial',
		'Banco Nacional de Crédito (BNC)',
		'Bancamiga',
		'Banco del Tesoro',
		'Banco Bicentenario',
		'Banplus',
		'Bancaribe',
		'Banco Exterior',
		'Venezolano de Crédito',
		'Banco Plaza',
		'Banco Activo',
		'100% Banco',
		'Sofitasa',
		'Otro'
	];
</script>

<svelte:head><title>Pago · {p.title} · Karamantea Teatro</title></svelte:head>

<div class="wrap page">
	{#if r.status === 'held'}
		<div class="head">
			<div>
				<span class="eyebrow">Paso 3 de 3</span>
				<h1 class="display">Pago</h1>
			</div>
			<div class="timer" class:low={remaining < 5 * 60000} role="timer" aria-live="off">
				<svg viewBox="0 0 44 44" width="52" height="52" aria-hidden="true">
					<circle cx="22" cy="22" r="19" fill="none" stroke="var(--line)" stroke-width="4" />
					<circle
						cx="22"
						cy="22"
						r="19"
						fill="none"
						stroke="currentColor"
						stroke-width="4"
						stroke-linecap="round"
						stroke-dasharray={2 * Math.PI * 19}
						stroke-dashoffset={2 * Math.PI * 19 * (1 - pct / 100)}
						transform="rotate(-90 22 22)"
					/>
				</svg>
				<div>
					<b>{mm}:{ss}</b>
					<span>para completar el pago</span>
				</div>
			</div>
		</div>

		<div class="grid">
			<!-- Cotización -->
			<section class="quote">
				<div class="qhead">
					<div>
						<span class="qlbl">Cotización</span>
						<span class="qcode">N° {r.code}</span>
					</div>
					<img src="/logo.png" alt="" width="52" height="52" />
				</div>
				<h2>{p.title}</h2>
				<p class="qwhen">{fechaLarga(p.starts_at)} · {hora(p.starts_at)}<br />{p.venue}</p>
				<div class="seats">
					{#each r.seats as s (s)}<span>{s}</span>{/each}
				</div>
				<div class="perfor"></div>
				<dl class="lines">
					<div><dt>{r.qty} entrada{r.qty > 1 ? 's' : ''} × {usd(r.unit_usd)}</dt><dd>{usd(r.total_usd)}</dd></div>
					<div><dt>Tasa oficial BCV</dt><dd>{rateFmt(r.rate)} Bs/USD</dd></div>
					<div class="fv"><dt>Fecha valor</dt><dd>{fechaValor(r.rate_date)}</dd></div>
				</dl>
				<div class="total">
					<span>Total a pagar</span>
					<b>{bs(r.total_bs)}</b>
					<button class="copy" onclick={() => copy('monto', amountPlain)}>{copied === 'monto' ? '¡Copiado!' : 'Copiar monto'}</button>
				</div>
				<p class="fine">
					Emitida {fechaHora(r.created_at)} · Válida hasta {fechaHora(r.expires_at)} o hasta que el BCV publique una nueva tasa, lo
					que ocurra primero. Al vencer, los asientos se liberan y esta cotización deja de ser válida.
				</p>
			</section>

			<!-- Datos de pago + formulario -->
			<section class="pay">
				<div class="card bank">
					<h3>1 · Realiza el pago</h3>
					{#if methods.length === 0}
						<p class="alert">
							En este momento no hay métodos de pago disponibles. Escríbenos por WhatsApp al 0424 939 27 84 para completar tu compra.
						</p>
					{:else}
						<p class="muted">Elige cómo vas a pagar y transfiere el monto exacto en bolívares:</p>
						{#if methods.length > 1}
							<div class="methods" role="radiogroup" aria-label="Método de pago">
								{#each methods as m (m.id)}
									<button
										type="button"
										role="radio"
										aria-checked={m.id === methodId}
										class="mopt"
										class:on={m.id === methodId}
										onclick={() => (methodId = m.id)}
									>
										<span class="dot"></span>
										<span class="mname">{m.label}</span>
										<small>{PAYMENT_TYPES[m.type]?.name ?? m.type}</small>
									</button>
								{/each}
							</div>
						{:else}
							<div class="msingle"><span class="dot on"></span><b>{methods[0].label}</b></div>
						{/if}
						{#if method}
							<ul>
								{#each methodFields as f (f.key)}
									{@const v = method.data[f.key] ?? ''}
									<li>
										<span>{f.label}</span><b>{v}</b>
										{#if f.copy && v}
											<button class="copy sm" onclick={() => copy(f.key, f.key === 'banco' ? (v.match(/^\d{4}/)?.[0] ?? v) : v.replace(/[\s.-]/g, ''))}
												>{copied === f.key ? '✓' : 'Copiar'}</button
											>
										{:else}<span></span>{/if}
									</li>
								{/each}
								<li class="amt"><span>Monto</span><b>{bs(r.total_bs)}</b>
									<button class="copy sm" onclick={() => copy('monto2', amountPlain)}>{copied === 'monto2' ? '✓' : 'Copiar'}</button>
								</li>
							</ul>
						{/if}
					{/if}
				</div>

				<form
					class="card frm"
					method="POST"
					action="?/pagar"
					enctype="multipart/form-data"
					use:enhance={() => {
						sending = true;
						return async ({ update }) => {
							await update({ reset: false });
							sending = false;
						};
					}}
				>
					<h3>2 · Envía tu comprobante</h3>
					<div class="two">
						<div class="field">
							<label for="buyer_name">Nombre y apellido</label>
							<input class="input" id="buyer_name" name="buyer_name" autocomplete="name" required value={values.buyer_name ?? ''} />
							{#if errors.buyer_name}<small class="err">{errors.buyer_name}</small>{/if}
						</div>
						<div class="field">
							<label for="buyer_doc">Cédula</label>
							<input class="input" id="buyer_doc" name="buyer_doc" placeholder="V-12345678" required value={values.buyer_doc ?? ''} />
							{#if errors.buyer_doc}<small class="err">{errors.buyer_doc}</small>{/if}
						</div>
						<div class="field">
							<label for="email">Correo (aquí recibirás tus entradas)</label>
							<input class="input" id="email" name="email" type="email" autocomplete="email" required value={values.email ?? ''} />
							{#if errors.email}<small class="err">{errors.email}</small>{/if}
						</div>
						<div class="field">
							<label for="phone">Teléfono</label>
							<input class="input" id="phone" name="phone" type="tel" autocomplete="tel" placeholder="0414-1234567" required value={values.phone ?? ''} />
							{#if errors.phone}<small class="err">{errors.phone}</small>{/if}
						</div>
						<input type="hidden" name="pay_method_id" value={methodId ?? ''} />
						<div class="field">
							<label for="pay_bank">Banco desde el que pagaste</label>
							<select class="input" id="pay_bank" name="pay_bank" required value={values.pay_bank ?? ''}>
								<option value="" disabled>Selecciona…</option>
								{#each banks as b (b)}<option>{b}</option>{/each}
							</select>
							{#if errors.pay_bank}<small class="err">{errors.pay_bank}</small>{/if}
						</div>
						<div class="field wide">
							<label for="pay_ref">Número de referencia</label>
							<input class="input" id="pay_ref" name="pay_ref" inputmode="numeric" required value={values.pay_ref ?? ''} />
							{#if errors.pay_ref}<small class="err">{errors.pay_ref}</small>{/if}
						</div>
					</div>

					<label
						class="drop"
						class:drag={dragging}
						class:has={fileName}
						ondragover={(e) => {
							e.preventDefault();
							dragging = true;
						}}
						ondragleave={() => (dragging = false)}
						ondrop={(e) => {
							e.preventDefault();
							dragging = false;
							if (e.dataTransfer?.files.length) {
								fileInput!.files = e.dataTransfer.files;
								fileName = e.dataTransfer.files[0].name;
							}
						}}
					>
						<input
							bind:this={fileInput}
							class="sr-only"
							type="file"
							name="receipt"
							accept="image/jpeg,image/png,image/webp,application/pdf"
							required
							onchange={(e) => (fileName = (e.currentTarget as HTMLInputElement).files?.[0]?.name ?? '')}
						/>
						<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 16V4m0 0l-5 5m5-5l5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>
						{#if fileName}
							<b>{fileName}</b><span>Toca para cambiar el archivo</span>
						{:else}
							<b>Sube tu comprobante</b><span>Captura o PDF · máx. 4 MB</span>
						{/if}
					</label>
					{#if errors.receipt}<small class="err">{errors.receipt}</small>{/if}
					{#if errors.pay_method}<small class="err">{errors.pay_method}</small>{/if}
					{#if (form as any)?.message}<p class="alert">{(form as any).message}</p>{/if}

					<button class="btn btn-lime full" disabled={sending || remaining <= 0 || !method}>
						{sending ? 'Enviando comprobante…' : `Enviar comprobante · ${bs(r.total_bs)}`}
					</button>
				</form>

				<form method="POST" action="?/cancelar" use:enhance class="cancel">
					<button class="linkbtn">Cancelar y liberar mis asientos</button>
				</form>
			</section>
		</div>
	{:else}
		<section class="state card">
			{#if r.status === 'submitted'}
				<div class="icon ok">
					<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
				</div>
				<span class="eyebrow">Reserva {r.code}</span>
				<h1 class="display">Hemos registrado tu pago</h1>
				<p>
					Gracias, {r.buyer_name?.split(' ')[0]}. Estamos verificando tu comprobante y en unos momentos recibirás tus entradas en
					<b>{r.email}</b>.
				</p>
			{:else if r.status === 'confirmed'}
				<div class="icon ok">
					<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
				</div>
				<span class="eyebrow">Reserva {r.code}</span>
				<h1 class="display">¡Tus entradas fueron enviadas!</h1>
				<p>Revisa tu correo <b>{r.email}</b>. ¡Nos vemos en el teatro!</p>
			{:else if r.status === 'rejected'}
				<div class="icon bad">!</div>
				<h1 class="display">No pudimos verificar el pago</h1>
				<p>Te enviamos un correo con los detalles. Los asientos fueron liberados.</p>
			{:else}
				<div class="icon bad">
					<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
				</div>
				<h1 class="display">Cotización vencida</h1>
				<p>
					{#if r.expire_reason === 'tasa'}
						El BCV publicó una nueva tasa oficial, así que esta cotización ya no es válida. Tus asientos fueron liberados.
					{:else if r.expire_reason === 'cancelada'}
						Cancelaste esta reserva y los asientos quedaron libres.
					{:else}
						Pasaron los 20 minutos para completar el pago y los asientos fueron liberados.
					{/if}
					Puedes volver a elegirlos con la tasa vigente.
				</p>
				<a class="btn btn-lime" href="/funcion/{p.id}?n={r.qty}">Elegir asientos de nuevo</a>
			{/if}
			<div class="mini">
				<b>{p.title}</b>
				<span>{fechaLarga(p.starts_at)} · {hora(p.starts_at)} · {p.venue}</span>
				<span>Asientos {r.seats.join(', ')} · {bs(r.total_bs)}</span>
			</div>
			<a class="lnk" href="/">Volver a la cartelera</a>
		</section>
	{/if}
</div>

<style>
	.page {
		padding-top: 36px;
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: end;
		gap: 20px;
		flex-wrap: wrap;
		margin-bottom: 30px;
	}
	h1 {
		font-size: clamp(24px, 3.6vw, 40px);
		margin: 10px 0 0;
	}
	.timer {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 18px 10px 10px;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: var(--ink-2);
		color: var(--accent);
	}
	.timer div {
		display: grid;
		line-height: 1.2;
	}
	.timer b {
		font-family: var(--display);
		font-size: 22px;
		color: var(--paper);
		font-variant-numeric: tabular-nums;
	}
	.timer span {
		font-size: 12px;
		color: var(--mist);
	}
	.timer.low {
		color: var(--warn);
		border-color: var(--warn)66;
	}
	.grid {
		display: grid;
		grid-template-columns: 400px 1fr;
		gap: 28px;
		align-items: start;
	}

	/* --- cotización tipo boleto */
	.quote {
		position: sticky;
		top: 92px;
		background: var(--ink-2);
		color: var(--paper);
		border: 1px solid var(--line);
		border-radius: 4px;
		padding: 24px;
		--notch: radial-gradient(circle at 0 50%, var(--ink) 12px, transparent 12.5px);
	}
	.qhead {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.qhead div {
		display: grid;
	}
	.qlbl {
		font-family: var(--display);
		font-size: 11px;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: #555;
	}
	.qcode {
		font-weight: 800;
		font-size: 18px;
	}
	.quote h2 {
		font-family: var(--display);
		font-weight: 400;
		text-transform: uppercase;
		font-size: 19px;
		line-height: 1.25;
		margin: 18px 0 6px;
	}
	.qwhen {
		margin: 0;
		color: #444;
		font-size: 14px;
		text-transform: capitalize;
	}
	.seats {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 14px;
	}
	.seats span {
		background: var(--ink);
		color: var(--accent);
		font-weight: 800;
		font-size: 13px;
		border-radius: 7px;
		padding: 4px 9px;
	}
	.perfor {
		position: relative;
		margin: 22px -24px;
		border-top: 2px dashed #c9c9c2;
	}
	.perfor::before,
	.perfor::after {
		content: '';
		position: absolute;
		top: -13px;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--ink);
	}
	.perfor::before {
		left: -12px;
	}
	.perfor::after {
		right: -12px;
	}
	.lines {
		margin: 0;
		display: grid;
		gap: 8px;
		font-size: 14px;
	}
	.lines div {
		display: flex;
		justify-content: space-between;
		gap: 10px;
	}
	.lines dt {
		color: #555;
	}
	.lines dd {
		margin: 0;
		font-weight: 700;
		text-align: right;
	}
	.lines .fv dd {
		text-transform: capitalize;
		font-weight: 600;
		font-size: 13px;
	}
	.total {
		margin-top: 18px;
		background: var(--ink);
		color: var(--paper);
		border-radius: 14px;
		padding: 16px 18px;
		display: grid;
		gap: 2px;
	}
	.total span {
		font-size: 12px;
		color: var(--mist);
		text-transform: uppercase;
		letter-spacing: 0.15em;
	}
	.total b {
		font-family: var(--display);
		font-weight: 400;
		font-size: clamp(22px, 2.6vw, 28px);
		color: var(--accent);
	}
	.copy {
		justify-self: start;
		margin-top: 6px;
		background: none;
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 4px 12px;
		font-size: 12px;
		cursor: pointer;
		color: var(--paper);
	}
	.copy:hover {
		border-color: var(--accent);
		color: var(--accent);
	}
	.fine {
		font-size: 12px;
		color: #555;
		margin: 14px 0 0;
		line-height: 1.5;
	}

	.pay {
		display: grid;
		gap: 20px;
	}
	h3 {
		margin: 0 0 6px;
		font-size: 17px;
	}
	.bank {
		padding: 22px;
	}
	.muted {
		color: var(--mist);
		margin: 0 0 14px;
		font-size: 14px;
	}
	.methods {
		display: grid;
		gap: 8px;
		margin-bottom: 14px;
	}
	.mopt {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 12px;
		text-align: left;
		padding: 14px 16px;
		border-radius: 12px;
		border: 1px solid var(--line);
		background: var(--ink);
		cursor: pointer;
	}
	.mopt.on {
		border-color: var(--accent);
		background: linear-gradient(90deg, var(--lime-soft), var(--ink) 70%);
	}
	.mopt small {
		color: var(--mist);
		font-size: 12px;
	}
	.mname {
		font-weight: 700;
	}
	.dot {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		border: 2px solid #555;
		display: inline-block;
	}
	.mopt.on .dot,
	.dot.on {
		border-color: var(--accent);
		background: radial-gradient(circle, var(--lime) 45%, transparent 50%);
	}
	.msingle {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 10px;
	}
	.bank ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
	}
	.bank li {
		display: grid;
		grid-template-columns: 90px 1fr auto;
		align-items: center;
		gap: 10px;
		padding: 10px 0;
		border-top: 1px solid var(--line);
		font-size: 14px;
	}
	.bank li span {
		color: var(--mist);
	}
	.bank li.amt b {
		color: var(--accent);
		font-size: 16px;
	}
	.copy.sm {
		margin: 0;
	}
	.frm {
		padding: 22px;
		display: grid;
		gap: 16px;
	}
	.two {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 14px;
	}
	.wide {
		grid-column: 1 / -1;
	}
	select.input {
		appearance: none;
		background-image: linear-gradient(45deg, transparent 50%, var(--mist) 50%), linear-gradient(135deg, var(--mist) 50%, transparent 50%);
		background-position:
			calc(100% - 18px) 55%,
			calc(100% - 13px) 55%;
		background-size: 5px 5px;
		background-repeat: no-repeat;
	}
	.err {
		color: var(--danger);
		font-size: 12px;
	}
	.drop {
		display: grid;
		justify-items: center;
		gap: 4px;
		padding: 26px;
		border: 1.5px dashed #444;
		border-radius: 14px;
		cursor: pointer;
		text-align: center;
		color: var(--accent);
		transition: 0.2s;
	}
	.drop b {
		color: var(--paper);
		word-break: break-all;
	}
	.drop span {
		font-size: 13px;
		color: var(--mist);
	}
	.drop:hover,
	.drop.drag {
		border-color: var(--accent);
		background: var(--lime-soft);
	}
	.drop.has {
		border-style: solid;
		border-color: var(--accent);
	}
	.full {
		width: 100%;
	}
	.alert {
		background: #ff6b5a1a;
		border: 1px solid #ff6b5a55;
		color: var(--danger);
		padding: 12px 14px;
		border-radius: 12px;
		margin: 0;
		font-size: 14px;
	}
	.cancel {
		text-align: center;
	}
	.linkbtn {
		background: none;
		border: 0;
		color: var(--mist);
		text-decoration: underline;
		cursor: pointer;
		font-size: 13px;
	}
	.linkbtn:hover {
		color: var(--danger);
	}

	.state {
		max-width: 620px;
		margin: 30px auto 0;
		padding: 44px 32px;
		text-align: center;
		display: grid;
		justify-items: center;
		gap: 14px;
	}
	.state p {
		color: var(--text-2);
		margin: 0;
		line-height: 1.7;
	}
	.icon {
		width: 72px;
		height: 72px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-size: 32px;
		font-weight: 800;
	}
	.icon.ok {
		background: var(--lime);
		color: var(--on-accent);
		box-shadow: 0 0 0 10px var(--lime-soft);
	}
	.icon.bad {
		background: var(--line);
		color: var(--warn);
	}
	.mini {
		display: grid;
		gap: 2px;
		margin-top: 10px;
		padding: 16px 20px;
		border-radius: 12px;
		background: var(--ink);
		border: 1px solid var(--line);
		font-size: 13px;
		color: var(--mist);
		width: 100%;
	}
	.mini b {
		color: var(--paper);
		font-size: 15px;
	}
	.mini span:first-of-type {
		text-transform: capitalize;
	}
	.lnk {
		color: var(--accent);
		font-weight: 700;
		font-size: 14px;
	}
	@media (max-width: 960px) {
		.grid {
			grid-template-columns: 1fr;
		}
		.quote {
			position: static;
		}
	}
	@media (max-width: 560px) {
		.two {
			grid-template-columns: 1fr;
		}
		.bank li {
			grid-template-columns: 70px 1fr auto;
		}
	}
</style>
