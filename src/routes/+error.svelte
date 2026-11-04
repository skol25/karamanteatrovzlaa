<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="wrap err">
	<span class="eyebrow">Error {page.status}</span>
	<h1 class="display">{page.error?.message ?? 'Algo salió mal'}</h1>
	<a class="btn btn-lime" href="/">Volver a la cartelera</a>
</div>

<style>
	.err {
		padding: 120px 0;
		display: grid;
		justify-items: start;
		gap: 18px;
	}
	h1 {
		font-size: clamp(22px, 4vw, 40px);
		margin: 0;
	}
</style>
