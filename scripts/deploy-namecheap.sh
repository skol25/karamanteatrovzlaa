#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Recibe un archivo generado por CI. Nunca sincroniza ni reemplaza data/, .env o la configuración de cPanel.
sha="${1:?Indica el SHA del commit}"
[[ "$sha" =~ ^[a-f0-9]{40}$ ]] || { echo 'SHA no válido' >&2; exit 1; }
app=/home/karapuwa/karamantea
releases=/home/karapuwa/karamantea-releases
archive="/home/karapuwa/karamantea-upload-${sha}.tgz"
release="$releases/$sha"
source /home/karapuwa/nodevenv/karamantea/22/bin/activate
mkdir -p "$releases" "$app/data/backups" "$app/tmp"
exec 9>"$app/tmp/deploy.lock"
flock -w 300 9
[[ -f "$archive" ]] || { echo 'No se encontró el paquete' >&2; exit 1; }
[[ ! -e "$release" ]] || { echo 'Esta versión ya existe; usa un nuevo commit para desplegar.' >&2; exit 1; }
mkdir "$release"
tar -xzf "$archive" -C "$release" --no-same-owner
[[ -f "$release/build/index.js" && -f "$release/package.json" ]] || { echo 'Paquete incompleto' >&2; exit 1; }
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
cp -p "$app/package.json" "$app/data/backups/package-${stamp}.json"
cp -p "$app/app.cjs" "$app/data/backups/app-${stamp}.cjs"
# libSQL crea una copia consistente, aunque haya visitas durante el respaldo.
if [[ -f "$app/data/karamantea.db" ]]; then
  (cd "$app" && BACKUP_PATH="$app/data/backups/before-deploy-${stamp}.db" node --input-type=module -e 'import {createClient} from "@libsql/client";const c=createClient({url:"file:"+process.cwd()+"/data/karamantea.db"});try{await c.execute({sql:"VACUUM INTO ?",args:[process.env.BACKUP_PATH]});}finally{c.close();}')
fi
cp "$release/package.json" "$app/package.json"
if ! (cd "$app" && npm install --omit=dev --ignore-scripts --no-audit --no-fund); then
  cp "$app/data/backups/package-${stamp}.json" "$app/package.json"
  echo 'Falló la instalación; no se cambió el build activo.' >&2
  exit 1
fi
ln -s "$app/node_modules" "$release/node_modules"
# Mantiene el build anterior para volver atrás si la comprobación HTTP falla.
if [[ -L "$app/build" ]]; then
  previous="$(readlink "$app/build")"
else
  previous="$app/build-before-${stamp}"
  mv "$app/build" "$previous"
fi
ln -s "$release/build" "$app/build-next"
mv -Tf "$app/build-next" "$app/build"
cp "$release/app.cjs" "$app/app.cjs"
touch "$app/tmp/restart.txt"
healthy=0
for attempt in {1..12}; do
  if curl --fail --silent --show-error --max-time 20 "https://karamantea.com/deployment.json?deploy_check=$sha" | grep -Fq "\"sha\":\"$sha\""; then healthy=1; break; fi
  sleep 5
done
if [[ "$healthy" != 1 ]]; then
  ln -s "$previous" "$app/build-rollback"
  mv -Tf "$app/build-rollback" "$app/build"
  cp "$app/data/backups/package-${stamp}.json" "$app/package.json"
  cp "$app/data/backups/app-${stamp}.cjs" "$app/app.cjs"
  touch "$app/tmp/restart.txt"
  echo 'Falló HTTP; se restauró el build anterior.' >&2
  exit 1
fi
printf '%s\n' "$sha" > "$app/tmp/deployed-sha"
echo "Desplegado $sha. Datos y configuración conservados."

