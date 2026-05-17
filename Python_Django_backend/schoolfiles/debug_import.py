"""
Run this from your schoolfiles folder to see the real error:
    python debug_import.py
"""
import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()

# Now try importing exactly what the command imports
print("Testing imports...")

try:
    from handler.models.school_details.topic import Topic
    print("  OK: Topic")
except Exception as e:
    print(f"  FAIL Topic: {e}")

try:
    from handler.models.school_details.course import Course
    print("  OK: Course")
except Exception as e:
    print(f"  FAIL Course: {e}")

try:
    from handler.models.lecturenote import LectureNote
    print("  OK: LectureNote")
except Exception as e:
    print(f"  FAIL LectureNote: {e}")

try:
    from handler.models.mediaresource import MediaResource
    print("  OK: MediaResource")
except Exception as e:
    print(f"  FAIL MediaResource: {e}")

try:
    from handler.models.selfassessment import SelfAssessmentQuestion, SelfAssessmentOption
    print("  OK: SelfAssessmentQuestion, SelfAssessmentOption")
except Exception as e:
    print(f"  FAIL SelfAssessment: {e}")

try:
    from handler.models.users.user import User
    print("  OK: User")
except Exception as e:
    print(f"  FAIL User: {e}")

print("\nDone.")