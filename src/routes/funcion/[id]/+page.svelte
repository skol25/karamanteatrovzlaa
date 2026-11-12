<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate, replaceState } from '$app/navigation';
	import { buildLayout, sortSeats } from '#lib/seats.ts';
	import { fechaLarga, hora } from '#lib/format.ts';

	let { data, form } = $props();
	const p = $derived(data.perf);
	const layout = $derived(buildLayout(p.capacity));
	const taken = $derived(new Set(data.taken));

	// svelte-ignore state_referenced_locally
	let n = $state(data.n);
	let picked = $state<string[]>([]);
	let sending = $state(false);

	// Si otra persona tomó un asiento que tenías marcado, se quita de tu selección
	$effect(() => {
		const clash = picked.filter((s) => taken.has(s));
		if (clash.length) picked = picked.filter((s) => !taken.has(s));
	});
	// Refresca la disponibilidad cada 15 s
	$effect(() => {
		const t = setInterval(() => invalidate('app:seats'), 15000);
		return () => clearInterval(t);
	});

	function toggle(id: string) {
		if (taken.has(id)) return;
		if (picked.includes(id)) picked = picked.filter((s) => s !== id);
		else if (picked.length < n) picked = [...picked, id];
		else if (n === 1) picked = [id];
		else picked = [...picked.slice(1), id]; // reemplaza el más antiguo
	}
	function setN(v: number) {
		n = Math.max(1, Math.min(v, data.maxTickets, data.left));
		if (picked.length > n) picked = picked.slice(picked.length - n);
		const u = new URL(location.href);
		u.searchParams.set('n', String(n));
		replaceState(u, {});
	}

	const rate = $derived(data.rate?.rate ?? null);
	const ready = $derived(picked.length === n);
</script>

<svelte:head><title>Asientos · {p.title} · Karamantea Teatro</title></svelte:head>

<div class="wrap page">
	<a class="back" href="/obra/{p.slug}#funciones">← {p.title}</a>
	<span class="eyebrow">Paso 2 de 3</span>
	<h1 class="display">Elige tus asientos</h1>
	<p class="sub">{fechaLarga(p.starts_at)} · {hora(p.starts_at)} · {p.venue}</p>

	{#if data.past}
		<p class="alert">Esta función ya pasó.</p>
	{:else if data.left <= 0}
		<p class="alert">Función agotada.</p>
	{:else}
		<div class="grid">
			<section class="hall card">
				<div class="stage"><span>Escenario</span></div>
				<div class="map" style="--cols:{layout.width}">
					{#each layout.rows as row (row.label)}
						<span class="rl">{row.label}</span>
						{#each row.cells as c, i (i)}
							{#if c}
								{@const isTaken = taken.has(c.id)}
								{@const isPicked = picked.includes(c.id)}
								<button
									class="seat"
									class:taken={isTaken}
									class:picked={isPicked}
									disabled={isTaken}
									aria-pressed={isPicked}
									aria-label="Asiento {c.id}{isTaken ? ', ocupado' : ''}"
									title={c.id}
									onclick={() => toggle(c.id)}
								>
									<span>{c.id.replace(row.label, '')}</span>
								</button>
							{:else}
								<span class="gap"></span>
							{/if}
						{/each}
						<span class="rl">{row.label}</span>
					{/each}
				</div>
				<div class="legend">
					<span><i class="seat sm"></i>Disponible</span>
					<span><i class="seat sm picked"></i>Tu selección</span>
					<span><i class="seat sm taken"></i>Ocupado</span>
				</div>
			</section>

			<aside class="side card">
				<div class="qty">
					<span>Entradas</span>
					<div class="stepper">
						<button onclick={() => setN(n - 1)} disabled={n <= 1} aria-label="Menos">−</button>
						<output>{n}</output>
						<button onclick={() => setN(n + 1)} disabled={n >= Math.min(data.maxTickets, data.left)} aria-label="Más">+</button>
					</div>
				</div>

				<div class="picked-list">
					<span class="lbl">Asientos ({picked.length}/{n})</span>
					<div class="tags">
						{#each sortSeats(picked) as s (s)}
							<button class="tag" onclick={() => toggle(s)} aria-label="Quitar {s}">{s} <span>×</span></button>
						{:else}
							<span class="hint">Toca los asientos en el plano.</span>
						{/each}
						{#each Array(Math.max(0, n - picked.length)) as _, i (i)}
							{#if picked.length}<span class="tag empty">—</span>{/if}
						{/each}
					</div>
				</div>

				<div class="sum">
					<small>Al continuar, tus asientos quedan apartados por {data.holdMinutes} minutos y se genera la cotización en bolívares con la tasa BCV vigente. Verás el monto a pagar en el siguiente paso.</small>
				</div>

				{#if form?.message}<p class="alert">{form.message}</p>{/if}

				<form
					method="POST"
					use:enhance={() => {
						sending = true;
						return async ({ update }) => {
							await update({ reset: false });
							sending = false;
						};
					}}
				>
					<input type="hidden" name="seats" value={picked.join(',')} />
					<button class="btn btn-lime full" disabled={!ready || !rate || sending}>
						{sending ? 'Apartando asientos…' : ready ? 'Continuar al pago' : `Elige ${n - picked.length} asiento${n - picked.length === 1 ? '' : 's'} más`}
					</button>
				</form>
			</aside>
		</div>
	{/if}
</div>

<style>
	.page {
		padding-top: 28px;
	}
	.back {
		display: block;
		font-size: 14px;
		color: var(--mist);
		font-weight: 600;
		margin-bottom: 24px;
	}
	.back:hover {
		color: var(--accent);
	}
	h1 {
		font-size: clamp(24px, 3.6vw, 40px);
		margin: 10px 0 6px;
	}
	.sub {
		color: var(--mist);
		margin: 0 0 32px;
		text-transform: capitalize;
	}
	.grid {
		display: grid;
		grid-template-columns: 1fr 360px;
		gap: 24px;
		align-items: start;
	}
	.hall {
		padding: 28px 20px 24px;
		overflow-x: auto;
	}
	.stage {
		position: relative;
		height: 54px;
		margin: 0 auto 36px;
		max-width: 520px;
		border-radius: 50% 50% 0 0 / 100% 100% 0 0;
		border-top: 3px solid var(--lime);
		background: radial-gradient(ellipse at 50% 0, #abce2633, transparent 70%);
		display: grid;
		place-items: center;
	}
	.stage span {
		font-family: var(--display);
		font-size: 11px;
		letter-spacing: 0.5em;
		color: var(--accent);
		text-transform: uppercase;
	}
	.map {
		display: grid;
		grid-template-columns: 22px repeat(var(--cols), minmax(26px, 38px)) 22px;
		gap: 8px 6px;
		justify-content: center;
		min-width: max-content;
		margin-inline: auto;
	}
	.rl {
		display: grid;
		place-items: center;
		font-size: 11px;
		color: var(--stone);
		font-weight: 700;
	}
	.gap {
		display: block;
	}
	.seat {
		aspect-ratio: 1;
		border: 1.5px solid #c9c3b8;
		background: var(--ink-3);
		border-radius: 9px 9px 5px 5px;
		cursor: pointer;
		display: grid;
		place-items: center;
		font-size: 10px;
		color: var(--mist);
		padding: 0;
		transition:
			transform 0.12s,
			background 0.15s,
			border-color 0.15s;
		position: relative;
	}
	.seat::after {
		content: '';
		position: absolute;
		inset: auto 18% -4px;
		height: 3px;
		border-radius: 2px;
		background: inherit;
		border: inherit;
		border-width: 0 0 1.5px;
	}
	.seat:hover:not(:disabled) {
		border-color: var(--accent);
		color: var(--paper);
		transform: translateY(-2px);
	}
	.seat.picked {
		background: var(--lime);
		border-color: var(--accent);
		color: var(--on-accent);
		font-weight: 800;
	}
	.seat.taken {
		background: repeating-linear-gradient(45deg, #d6d0c6 0 3px, #e2ddd4 3px 6px);
		border-color: #e2ddd4;
		color: transparent;
		cursor: not-allowed;
	}
	.legend {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 22px;
		margin-top: 32px;
		font-size: 13px;
		color: var(--mist);
	}
	.legend span {
		display: flex;
		gap: 8px;
		align-items: center;
	}
	.seat.sm {
		width: 18px;
		height: 18px;
		display: inline-block;
		cursor: default;
	}
	.side {
		padding: 22px;
		display: grid;
		gap: 20px;
		position: sticky;
		top: 92px;
	}
	.qty {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-weight: 700;
	}
	.stepper {
		display: flex;
		align-items: center;
		gap: 4px;
		background: var(--ink);
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 4px;
	}
	.stepper button {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		border: 0;
		background: var(--ink-3);
		font-size: 19px;
		cursor: pointer;
	}
	.stepper button:hover:not(:disabled) {
		background: var(--lime);
		color: var(--on-accent);
	}
	.stepper button:disabled {
		opacity: 0.3;
	}
	.stepper output {
		min-width: 30px;
		text-align: center;
		font-family: var(--display);
	}
	.lbl {
		font-size: 13px;
		color: var(--mist);
		font-weight: 600;
	}
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 10px;
	}
	.tag {
		border: 1px solid var(--lime);
		color: var(--accent);
		background: var(--lime-soft);
		border-radius: 8px;
		padding: 6px 10px;
		font-weight: 800;
		font-size: 14px;
		cursor: pointer;
	}
	.tag span {
		opacity: 0.6;
		margin-left: 4px;
	}
	.tag.empty {
		border-style: dashed;
		border-color: var(--line);
		background: none;
		color: var(--stone);
		cursor: default;
	}
	.hint {
		color: var(--stone);
		font-size: 14px;
	}
	.sum {
		display: grid;
		gap: 8px;
		padding-top: 16px;
		border-top: 1px solid var(--line);
	}
	.sum small {
		color: var(--mist);
		font-size: 12px;
		line-height: 1.5;
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
	@media (max-width: 960px) {
		.grid {
			grid-template-columns: 1fr;
		}
		.side {
			position: static;
		}
		.hall {
			padding-inline: 10px;
		}
		.map {
			grid-template-columns: 14px repeat(var(--cols), minmax(0, 30px)) 14px;
			gap: 6px 3px;
			min-width: 0;
		}
		.seat {
			font-size: 8px;
			border-radius: 6px 6px 4px 4px;
		}
	}
</style>
