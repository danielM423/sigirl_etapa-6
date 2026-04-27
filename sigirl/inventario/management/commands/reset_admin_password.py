import os
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Resetea la contraseña del superusuario admin usando DJANGO_SUPERUSER_PASSWORD'

    def handle(self, *args, **options):
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')
        if not password:
            self.stderr.write('❌ DJANGO_SUPERUSER_PASSWORD no definida.')
            return

        try:
            user = User.objects.get(username='admin')
            user.set_password(password)
            user.save()
            self.stdout.write('✅ Contraseña de admin actualizada correctamente.')
        except User.DoesNotExist:
            self.stderr.write('❌ Usuario admin no existe.')
