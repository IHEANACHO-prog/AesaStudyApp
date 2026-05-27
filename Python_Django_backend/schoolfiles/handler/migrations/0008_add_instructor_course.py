from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('handler', '0007_delete_material'),
    ]

    operations = [
        migrations.CreateModel(
            name='InstructorCourse',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('assigned_at', models.DateTimeField(auto_now_add=True)),
                ('course', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='instructor_assignments',
                    to='handler.course',
                )),
                ('instructor', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='course_assignments',
                    to='handler.instructor',
                )),
            ],
            options={
                'ordering': ['-assigned_at'],
                'unique_together': {('instructor', 'course')},
            },
        ),
    ]