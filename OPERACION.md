# Operación de la instancia

Runbook mínimo para quien administra la instancia (no es documentación para el cliente). Arranca con lo crítico — los dos procedimientos que hacen falta porque el registro está cerrado (ver README, sección "Seguridad") y no existe recuperación de contraseña por email. Se va a ir ampliando durante el piloto, a medida que aparezcan más situaciones reales (ver plan de piloto, grupo 2 — "Runbook completo de operación", deliberadamente no escrito por adelantado sobre problemas que todavía no pasaron).

## Crear la cuenta de un cliente nuevo

El registro está cerrado al público (Tarea 5 del plan de piloto) — `POST /auth/register` exige el header `X-Admin-Registration-Token`.

**Por curl** (reemplazar `<TOKEN>` por el valor de `ADMIN_REGISTRATION_TOKEN`, y los datos del cliente):

```bash
curl -X POST https://<tu-dominio>/api/auth/register \
  -H "Content-Type: application/json" \
  -H "X-Admin-Registration-Token: <TOKEN>" \
  -d '{
    "email": "contador@estudio.com",
    "nombre": "Nombre del contador",
    "password": "una-password-provisoria-de-al-menos-8-caracteres",
    "aceptaTerminos": true
  }'
```

**Por navegador**: entrar a `https://<tu-dominio>/register` (ya no está enlazado desde el login — hay que ir directo a la URL) y completar el formulario, incluido el campo "Token de administración".

Después de crear la cuenta, avisale al cliente su email y la password provisoria (por un canal que no sea el mismo email, si se puede — ej. WhatsApp) y sugerile cambiarla apenas entre. Todavía no hay pantalla de "cambiar mi contraseña" (ver README, grupo 2 del plan de piloto) — si quiere cambiarla, hacé el reseteo de abajo con la que elija.

## Resetear la contraseña de un usuario

No hay recuperación de contraseña por email (requeriría infraestructura de correo entera para un caso que se resuelve en 2 minutos así — ver plan de piloto). Si alguien queda afuera de su cuenta:

```bash
# Local / desarrollo:
cd backend
npm run reset-password -- "email@delusuario.com" "password-nueva-de-al-menos-8-caracteres"

# Con Docker Compose (producción):
docker compose exec backend node scripts/reset-password.mjs "email@delusuario.com" "password-nueva"
```

El script valida que el usuario exista (si no, no cambia nada y avisa) y que la password nueva tenga al menos 8 caracteres, y guarda el hash con el mismo algoritmo (argon2) que usa el login — no es un `UPDATE` de SQL a mano, que es fácil de hacer mal (un hash de argon2 no se escribe a mano de forma confiable).

**Verificado real (2026-07-22):** se reseteó la contraseña de una cuenta de prueba (`demo.pdfs.piloto@recibos.test`) y se confirmó que el login con la contraseña vieja pasó a rechazarse (`400`) y con la nueva funcionó (`200`, devuelve un token válido). Precedente real: `credenciales-prueba.md` (fuera de este repo) tiene registrada una cuenta cuya password quedó irrecuperable antes de que este procedimiento existiera — exactamente el problema que esto resuelve.

## Dónde corren estos scripts

Todos viven en `backend/scripts/` y necesitan `DATABASE_URL` apuntando a la base real (ya está seteada en el entorno del contenedor `backend` en producción; en local, la de `backend/.env`). Ninguno pasa por HTTP ni por el frontend — son scripts de servidor, para quien tiene acceso directo a la máquina donde corre la instancia.
