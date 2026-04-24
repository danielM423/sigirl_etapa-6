#!/usr/bin/env python
import os
import sys
import django

# Force this script to use the deployable Django project inside sigirl/sigirl.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.join(BASE_DIR, 'sigirl')
if PROJECT_DIR not in sys.path:
    sys.path.insert(0, PROJECT_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sigirl.settings')
django.setup()

from django.contrib.auth.models import User

usuarios = [
    {'username': 'admin', 'password': 'demo', 'email': 'admin@sigirl.com', 'is_staff': True, 'is_superuser': True},
    {'username': 'jefe', 'password': 'demo', 'email': 'jefe@sigirl.com', 'is_staff': True, 'is_superuser': False},
    {'username': 'user', 'password': 'demo', 'email': 'user@sigirl.com', 'is_staff': False, 'is_superuser': False},
]

for usuario in usuarios:
    if not User.objects.filter(username=usuario['username']).exists():
        User.objects.create_user(
            username=usuario['username'],
            password=usuario['password'],
            email=usuario['email'],
            is_staff=usuario['is_staff'],
            is_superuser=usuario['is_superuser'],
        )
        print(f"✅ Usuario '{usuario['username']}' creado")
    else:
        print(f"⚠️ Usuario '{usuario['username']}' ya existe")

print("\n🎉 ¡Listo!")
