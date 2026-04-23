import os
from django.db import migrations


def crear_superusuario(apps, schema_editor):
    from django.contrib.auth.models import User
    username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
    password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'Admin2026@sigirl')
    email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@sigirl.com')
    if not User.objects.filter(username=username).exists():
        User.objects.create_superuser(username=username, email=email, password=password)


class Migration(migrations.Migration):

    dependencies = [
        ('inventario', '0008_add_entrega_fields_to_pedido'),
    ]

    operations = [
        migrations.RunPython(crear_superusuario, migrations.RunPython.noop),
    ]
