import os
import django
import pandas as pd

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()

from handler.models import Course, Topic, LectureNote, User

ADMIN_USER = User.objects.get(id=1)
CSV_DIR = r"E:\AESA-STUDY\Aesa Course Database"

# ── STEP 1: Delete all existing notes ──────────────────────
print("=== STEP 1: Deleting all existing lecture notes ===")
deleted = LectureNote.objects.all().delete()
print(f"Deleted: {deleted}")

# ── STEP 2: Define all course loads ────────────────────────
# Format: (csv_filename, course_code, topic_id_offset)
# offset = DB_first_topic_id - CSV_first_topic_id
LOADS = [
    ('AESA_MASTER_NOTES_EDA105.csv', 'EDA 105', 0),   # CSV 1-7,  DB 1-7
    ('AESA_MASTER_NOTES_EDA106.csv', 'EDA 106', 0),   # CSV 8-14, DB 8-14
    ('AESA_MASTER_NOTES_EDA222.csv', 'EDA 222', 0),   # CSV 15-21, DB 15-21
    ('AESA_MASTER_NOTES_EDA226.csv', 'EDA 226', 0),   # CSV 22-28, DB 22-28
    ('AESA_MASTER_NOTES_EDA316.csv', 'EDA 316', 0),   # CSV 29-35, DB 29-35
    ('AESA_MASTER_NOTES_EDA325.csv', 'EDA 325', 0),   # CSV 36-42, DB 36-42
    ('AESA_MASTER_NOTES_EDA433.csv', 'EDA 447', 0),   # CSV 43-49, DB 43-49 ✓
    ('AESA_MASTER_NOTES_EDA424.csv', 'EDA 424', -7),  # CSV 57-63, DB 50-56 (offset -7)
    ('AESA_MASTER_NOTES_EDA425.csv', 'EDA 425', 0),
    ('AESA_MASTER_NOTES_EDA490.csv', 'EDA 490', 0),
]

# ── STEP 3: Load each CSV ───────────────────────────────────
print("\n=== STEP 2: Loading lecture notes ===")
total_created = 0
total_errors = 0

for filename, course_code, offset in LOADS:
    filepath = os.path.join(CSV_DIR, filename)

    if not os.path.exists(filepath):
        print(f"  [MISSING] {filename}")
        continue

    try:
        course = Course.objects.get(code=course_code)
    except Course.DoesNotExist:
        print(f"  [NO COURSE] {course_code}")
        continue

    df = pd.read_csv(filepath)
    created = 0
    errors = 0

    for _, row in df.iterrows():
        csv_topic_id = int(row['topic'])
        db_topic_id = csv_topic_id + offset  # apply offset correction

        try:
            topic = Topic.objects.get(id=db_topic_id, course=course)
        except Topic.DoesNotExist:
            print(f"  [ERROR] Topic id={db_topic_id} not found in {course_code}")
            errors += 1
            total_errors += 1
            continue

        LectureNote.objects.create(
            topic=topic,
            content=row['content'] if pd.notna(row['content']) else '',
            created_by=ADMIN_USER,
            updated_by=ADMIN_USER,
        )
        created += 1
        total_created += 1

    print(f"  [{course_code}] {filename}: {created} notes loaded, {errors} errors")

print(f"""
=== DONE ===
Total notes created : {total_created}
Total errors        : {total_errors}
Notes in DB now     : {LectureNote.objects.count()}
""")