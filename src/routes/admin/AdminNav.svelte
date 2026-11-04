<script lang="ts">
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
</script>

<div class="anav">
	<div class="links">
		<a href="/admin" class:on={page.url.pathname === '/admin'}>Pagos y tasa</a>
		<a href="/admin/obras" class:on={page.url.pathname === '/admin/obras'}>Obras y funciones</a>
		<a href="/admin/correos" class:on={page.url.pathname === '/admin/correos'}>Correos</a>
	</div>
	<form method="POST" action="/admin?/logout" use:enhance><button>Cerrar sesión</button></form>
</div>

<style>
	.anav {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		border-bottom: 1px solid var(--line);
		padding-bottom: 14px;
		flex-wrap: wrap;
	}
	.links {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}
	a {
		padding: 9px 16px;
		border-radius: 999px;
		font-weight: 700;
		font-size: 14px;
		color: var(--mist);
	}
	a.on {
		background: var(--ink-3);
		color: var(--lime);
	}
	button {
		background: none;
		border: 0;
		color: var(--mist);
		cursor: pointer;
		font-size: 13px;
	}
	button:hover {
		color: var(--danger);
	}
</style>
