@echo off
REM Script de despliegue para Windows

REM 1. Instalar dependencias del frontend
echo Instalando dependencias del frontend...
cd frontend
call npm install

REM 2. Generar build de producción del frontend
echo Generando build de producción del frontend...
call npm run build
cd ..

REM 3. Copiar build del frontend a la carpeta de estáticos del backend
echo Copiando build del frontend a la carpeta de estáticos del backend...
xcopy /E /Y frontend\dist\* sigirl\staticfiles\

REM 4. Aplicar migraciones de Django
echo Aplicando migraciones de Django...
call .venv\Scripts\activate
python manage.py makemigrations
python manage.py migrate

REM 5. (Opcional) Crear superusuario manualmente si es necesario
REM python manage.py createsuperuser

REM 6. Recolectar archivos estáticos
echo Recolectando archivos estáticos...
python manage.py collectstatic --noinput

echo.
echo ====== DESPLIEGUE COMPLETO ======
echo Ahora puedes iniciar el servidor con:
echo python manage.py runserver 0.0.0.0:8000
echo o en producción con Gunicorn:
echo gunicorn sigirl.wsgi:application --bind 0.0.0.0:8000
