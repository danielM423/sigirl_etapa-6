import datetime

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('inventario', '0005_alter_alerta_options_alter_auditoria_options_and_more'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='pedido',
            options={'ordering': ['-fecha_solicitud', '-id']},
        ),
        migrations.AddField(
            model_name='pedido',
            name='codigo',
            field=models.CharField(blank=True, max_length=30, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='pedido',
            name='creado_por',
            field=models.CharField(blank=True, max_length=150, null=True),
        ),
        migrations.AddField(
            model_name='pedido',
            name='departamento',
            field=models.CharField(blank=True, max_length=150),
        ),
        migrations.AddField(
            model_name='pedido',
            name='evaluacion_seguridad',
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='pedido',
            name='fecha_respuesta',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='pedido',
            name='fecha_solicitud',
            field=models.DateField(default=datetime.date.today),
        ),
        migrations.AddField(
            model_name='pedido',
            name='motivo_rechazo',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='pedido',
            name='observaciones',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='pedido',
            name='prioridad',
            field=models.CharField(choices=[('baja', 'Baja'), ('media', 'Media'), ('alta', 'Alta')], default='media', max_length=10),
        ),
        migrations.AddField(
            model_name='pedido',
            name='solicitante',
            field=models.CharField(blank=True, max_length=150),
        ),
        migrations.AlterField(
            model_name='pedido',
            name='cantidad',
            field=models.IntegerField(default=1),
        ),
        migrations.AlterField(
            model_name='pedido',
            name='estado',
            field=models.CharField(choices=[('pendiente', 'Pendiente'), ('aprobado', 'Aprobado'), ('rechazado', 'Rechazado')], default='pendiente', max_length=20),
        ),
        migrations.AlterField(
            model_name='pedido',
            name='producto',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='pedidos', to='inventario.producto'),
        ),
    ]