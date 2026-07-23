#!/bin/sh
# Backup programado (Tarea 6 del plan de piloto): corre backup.mjs una vez al
# arrancar (para tener siempre al menos un backup fresco después de un
# deploy) y después cada 24h. Pensado para correr como el comando del
# servicio `backup` de docker-compose.yml — no se instala en el host.
set -e

INTERVALO_SEGUNDOS=86400

while true; do
  echo "[backup-loop] $(date -Iseconds) — iniciando backup"
  node scripts/backup.mjs

  if [ -n "$RCLONE_REMOTE" ]; then
    if rclone sync backups/ "$RCLONE_REMOTE"; then
      echo "[backup-loop] copiado off-site a $RCLONE_REMOTE"
    else
      # No corta el loop: un backup local igual es mejor que ninguno. Pero
      # queda en el log de Docker, visible con `docker compose logs backup`
      # — nunca falla en silencio.
      echo "[backup-loop] ADVERTENCIA: falló la copia off-site a $RCLONE_REMOTE (el backup local sí se hizo)"
    fi
  else
    echo "[backup-loop] RCLONE_REMOTE no configurado — el backup queda solo en este servidor (ver README, sección Backups)"
  fi

  echo "[backup-loop] próximo backup en 24h"
  sleep "$INTERVALO_SEGUNDOS"
done
