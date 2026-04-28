#!/usr/bin/env python
import os
import sys
import django
from django.utils import timezone

# Force this script to use the deployable Django project inside sigirl/sigirl.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.join(BASE_DIR, 'sigirl')
if PROJECT_DIR not in sys.path:
    sys.path.insert(0, PROJECT_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sigirl.settings')
django.setup()

from django.contrib.auth.models import User
from inventario.models import UserProfile

admin_password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'demo')
admin_email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@sigirl.com')
admin_username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
jefe_password = os.environ.get('DJANGO_JEFE_PASSWORD', 'Jefe2026!')
user_password = os.environ.get('DJANGO_USER_PASSWORD', 'User2026!')

usuarios = [
    {'username': admin_username, 'password': admin_password, 'email': admin_email, 'is_staff': True, 'is_superuser': True},
    {'username': 'jefe', 'password': jefe_password, 'email': 'jefe@sigirl.com', 'is_staff': True, 'is_superuser': False},
    {'username': 'user', 'password': user_password, 'email': 'user@sigirl.com', 'is_staff': False, 'is_superuser': False},
]

for usuario in usuarios:
    db_user, created = User.objects.get_or_create(
        username=usuario['username'],
        defaults={
            'email': usuario['email'],
            'is_staff': usuario['is_staff'],
            'is_superuser': usuario['is_superuser'],
        }
    )

    # Mantener credenciales sincronizadas en deploy para evitar bloqueo de acceso.
    db_user.email = usuario['email']
    db_user.is_staff = usuario['is_staff']
    db_user.is_superuser = usuario['is_superuser']
    db_user.is_active = True
    db_user.set_password(usuario['password'])
    db_user.save()

    # Use explicit defaults to avoid NULL inserts when the profile schema evolves.
    UserProfile.objects.update_or_create(
        user=db_user,
        defaults={
            'email_verified': True,
            'email_verified_at': timezone.now(),
            'email_verification_code_hash': '',
            'email_verification_code_expires_at': None,
            'email_verification_attempts': 0,
        },
    )

    if created:
        print(f"✅ Usuario '{usuario['username']}' creado")
    else:
        print(f"🔄 Usuario '{usuario['username']}' actualizado")

print("\n🎉 ¡Listo!")
