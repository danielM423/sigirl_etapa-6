from django.db import migrations


def set_userprofile_attempts_default(apps, schema_editor):
    connection = schema_editor.connection
    table_name = 'inventario_userprofile'
    column_name = 'email_verification_attempts'

    existing_tables = connection.introspection.table_names()
    if table_name not in existing_tables:
        return

    with connection.cursor() as cursor:
        cursor.execute(
            f"UPDATE {table_name} "
            f"SET {column_name} = 0 "
            f"WHERE {column_name} IS NULL"
        )

        if connection.vendor == 'postgresql':
            cursor.execute(
                f"ALTER TABLE {table_name} "
                f"ALTER COLUMN {column_name} SET DEFAULT 0"
            )


def noop_reverse(apps, schema_editor):
    # Keep the DB-side default in place for deploy stability.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('inventario', '0011_userprofile_email_verification_code_fields'),
    ]

    operations = [
        migrations.RunPython(set_userprofile_attempts_default, noop_reverse),
    ]
