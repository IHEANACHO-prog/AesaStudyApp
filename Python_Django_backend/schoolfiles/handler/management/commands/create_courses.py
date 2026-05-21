from django.core.management.base import BaseCommand
from handler.models import Course, Level, Department
class Command(BaseCommand):
    help = 'Create Levels, Department and all 10 EDA Courses'
    def handle(self, *args, **kwargs):
        levels = {}
        for name in ['100 Level', '200 Level', '300 Level', '400 Level']:
            obj, _ = Level.objects.get_or_create(name=name)
            levels[name] = obj
            self.stdout.write(f"  Level: {name}")
        dept, _ = Department.objects.get_or_create(
            name='Arts Education',
            defaults={'faculty': 'Faculty of Education'}
        )
        self.stdout.write(f"  Department: {dept.name}")
        courses = [
            ('EDA 105', 'Introduction to Arts Education',              'FIRST',  '100 Level'),
            ('EDA 106', 'Arts Education and Culture',                  'SECOND', '100 Level'),
            ('EDA 222', 'Special Methods',                             'SECOND', '200 Level'),
            ('EDA 226', 'Language Skills',                             'SECOND', '200 Level'),
            ('EDA 316', 'Language Education',                          'SECOND', '300 Level'),
            ('EDA 325', 'Teaching Practice I',                         'FIRST',  '300 Level'),
            ('EDA 424', 'Theories of Language Teaching and Learning',  'SECOND', '400 Level'),
            ('EDA 425', 'Teaching Practice II',                        'FIRST',  '400 Level'),
            ('EDA 447', 'Moral Education',                             'FIRST',  '400 Level'),
            ('EDA 490', 'Projects',                                    'SECOND', '400 Level'),
        ]
        for code, title, semester, level_name in courses:
            obj, created = Course.objects.get_or_create(
                code=code,
                defaults={
                    'title':      title,
                    'semester':   semester,
                    'level':      levels[level_name],
                    'department': dept,
                }
            )
            status = 'created' if created else 'exists'
            self.stdout.write(f"  Course {code} ({title}): {status}")
        self.stdout.write(self.style.SUCCESS('All courses ready!'))
