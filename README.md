# SIGIRL - Despliegue y Prueba en Produccion

## Variables de entorno obligatorias

Configura estas variables en Render o Railway:

- SECRET_KEY
- DEBUG=False
- ALLOWED_HOSTS=.onrender.com,<tu-dominio>
- CSRF_TRUSTED_ORIGINS=https://*.onrender.com,https://<tu-dominio>
- CORS_ALLOW_ALL_ORIGINS=False
- DATABASE_URL

## Variables para verificacion de correo

- EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
- EMAIL_HOST=smtp.gmail.com
- EMAIL_PORT=587
- EMAIL_USE_TLS=True
- EMAIL_HOST_USER=<tu-correo>
- EMAIL_HOST_PASSWORD=<app-password>
- DEFAULT_FROM_EMAIL=<tu-correo>
- FRONTEND_APP_URL=https://<tu-dominio>

Nota: Si FRONTEND_APP_URL queda vacia, SIGIRL usa automaticamente el dominio actual de la peticion para el enlace de verificacion.

## Flujo para probar ya desplegado

1. Publica con el comando de arranque definido en Procfile/render.yaml.
2. Abre https://<tu-dominio>/register.
3. Registra un usuario con correo real.
4. Revisa bandeja de entrada y confirma con el enlace.
5. Inicia sesion en https://<tu-dominio>/login.
6. Valida reportes:

- https://<tu-dominio>/api/reportes/plantilla-inventario/
- https://<tu-dominio>/api/reportes/inventario-excel/
- https://<tu-dominio>/api/reportes/inventario-pdf/

## Semillas (opcional)

Si quieres cargar datos demo una sola vez, ejecuta manualmente:

- python crear_usuarios.py
- cd sigirl && python manage.py importar_reactivos_masivo --dir seed_data

No se ejecuta automaticamente en cada arranque para evitar reinicios lentos o fallos en produccion.
