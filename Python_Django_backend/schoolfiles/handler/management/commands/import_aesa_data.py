import os
import pandas as pd
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from handler.models.school_details.topic import Topic
from handler.models.school_details.course import Course
from handler.models.school_details.lecturenote import LectureNote
from handler.models.school_details.mediaresource import MediaResource
from handler.models.school_details.selfassessment import SelfAssessmentQuestion, SelfAssessmentOption
from handler.models.users.user import User


MEDIA_TYPE_MAP = {
    "youtube":    "video_link",
    "video_link": "video_link",
    "image":      "image",
    "pdf":        "pdf",
}


def nan_to_none(value):
    if value != value:
        return None
    return value or None


class Command(BaseCommand):
    help = "Import AESA course data from 5 CSVs into the Django database."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dir",
            type=str,
            required=True,
            help="Path to the folder containing the 5 CSV files.",
        )
        parser.add_argument(
            "--admin-user-id",
            type=int,
            default=1,
            help="PK of the User to set as created_by / uploaded_by (default: 1).",
        )

    def handle(self, *args, **options):
        csv_dir = options["dir"]
        admin_id = options["admin_user_id"]

        files = {
            "topics":    os.path.join(csv_dir, "FINAL_MASTER_TOPICS_FIXED.csv"),
            "questions": os.path.join(csv_dir, "AESA_FINAL_QUESTIONS_MASTER_FIXED.csv"),
            "options":   os.path.join(csv_dir, "AESA_FINAL_OPTIONS_MASTER_FIXED.csv"),
            "media":     os.path.join(csv_dir, "FINAL_MASTER_MEDIA.csv"),
            "notes":     os.path.join(csv_dir, "FINAL_MASTER_NOTES.csv"),
        }

        for key, path in files.items():
            if not os.path.exists(path):
                raise CommandError(f"Missing file: {path}")

        try:
            admin_user = User.objects.get(pk=admin_id)
        except User.DoesNotExist:
            raise CommandError(
                f"No User found with PK={admin_id}. "
                "Pass --admin-user-id with a valid user PK."
            )

        self.stdout.write(self.style.MIGRATE_HEADING("Starting AESA data import..."))

        with transaction.atomic():
            csv_topic_id_to_django_pk = self._import_topics(files["topics"])
            self._import_notes(files["notes"], csv_topic_id_to_django_pk, admin_user)
            self._import_media(files["media"], csv_topic_id_to_django_pk, admin_user)
            csv_question_id_to_django_pk = self._import_questions(files["questions"])
            self._import_options(files["options"], csv_question_id_to_django_pk)

        self.stdout.write(self.style.SUCCESS("Import complete."))

    def _import_topics(self, path):
        df = pd.read_csv(path)
        self.stdout.write(f"  Topics: {len(df)} rows")
        course_map = {c.code: c for c in Course.objects.all()}
        created = updated = skipped = 0
        csv_id_to_pk = {}

        for _, row in df.iterrows():
            course_code = str(row["course"]).strip()
            course = course_map.get(course_code)
            if course is None:
                self.stdout.write(self.style.WARNING(
                    f"    ! Course '{course_code}' not found - skipping topic '{row['name']}'"
                ))
                skipped += 1
                continue

            obj, was_created = Topic.objects.update_or_create(
                name=str(row["name"]).strip(),
                course=course,
                defaults={
                    "description": str(row["description"]).strip() if nan_to_none(row["description"]) else "",
                    "order": int(row["order"]),
                },
            )
            csv_id_to_pk[int(row["id"])] = obj.pk
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(f"     created={created}  updated={updated}  skipped={skipped}")
        return csv_id_to_pk

    def _import_notes(self, path, csv_topic_id_to_django_pk, admin_user):
        df = pd.read_csv(path)
        self.stdout.write(f"  Lecture notes: {len(df)} rows")
        created = updated = skipped = 0

        for _, row in df.iterrows():
            csv_topic_id = int(row["topic"])
            django_topic_pk = csv_topic_id_to_django_pk.get(csv_topic_id)
            if django_topic_pk is None:
                self.stdout.write(self.style.WARNING(
                    f"    ! CSV topic id={csv_topic_id} not mapped - skipping note"
                ))
                skipped += 1
                continue

            obj, was_created = LectureNote.objects.update_or_create(
                topic_id=django_topic_pk,
                defaults={
                    "content": str(row["content"]),
                    "created_by": admin_user,
                    "updated_by": admin_user,
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(f"     created={created}  updated={updated}  skipped={skipped}")

    def _import_media(self, path, csv_topic_id_to_django_pk, admin_user):
        df = pd.read_csv(path)
        self.stdout.write(f"  Media resources: {len(df)} rows")
        created = updated = skipped = 0

        for _, row in df.iterrows():
            csv_topic_id = int(row["topic"])
            django_topic_pk = csv_topic_id_to_django_pk.get(csv_topic_id)
            if django_topic_pk is None:
                self.stdout.write(self.style.WARNING(
                    f"    ! CSV topic id={csv_topic_id} not mapped - skipping media '{row['title']}'"
                ))
                skipped += 1
                continue

            raw_type = str(row["media_type"]).strip().lower()
            media_type = MEDIA_TYPE_MAP.get(raw_type)
            if media_type is None:
                self.stdout.write(self.style.WARNING(
                    f"    ! Unknown media_type '{raw_type}' - skipping '{row['title']}'"
                ))
                skipped += 1
                continue

            obj, was_created = MediaResource.objects.update_or_create(
                topic_id=django_topic_pk,
                title=str(row["title"]).strip(),
                defaults={
                    "media_type": media_type,
                    "url": nan_to_none(row["url"]),
                    "uploaded_by": admin_user,
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(f"     created={created}  updated={updated}  skipped={skipped}")

    def _import_questions(self, path):
        df = pd.read_csv(path)
        self.stdout.write(f"  Questions: {len(df)} rows")
        course_map = {c.code: c for c in Course.objects.all()}
        created = updated = skipped = 0
        csv_id_to_pk = {}

        for _, row in df.iterrows():
            course_code = str(row["course"]).strip()
            course = course_map.get(course_code)
            if course is None:
                self.stdout.write(self.style.WARNING(
                    f"    ! Course '{course_code}' not found - skipping question id={row['id']}"
                ))
                skipped += 1
                continue

            obj, was_created = SelfAssessmentQuestion.objects.update_or_create(
                course=course,
                order=int(row["order"]),
                defaults={
                    "question_text": str(row["question_text"]).strip(),
                    "question_type": str(row["question_type"]).strip(),
                },
            )
            csv_id_to_pk[int(row["id"])] = obj.pk
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(f"     created={created}  updated={updated}  skipped={skipped}")
        return csv_id_to_pk

    def _import_options(self, path, csv_question_id_to_django_pk):
        df = pd.read_csv(path)
        self.stdout.write(f"  Options: {len(df)} rows")
        created = updated = skipped = 0

        for _, row in df.iterrows():
            csv_q_id = int(row["question_id"])
            django_q_pk = csv_question_id_to_django_pk.get(csv_q_id)
            if django_q_pk is None:
                self.stdout.write(self.style.WARNING(
                    f"    ! CSV question id={csv_q_id} not mapped - skipping option"
                ))
                skipped += 1
                continue

            obj, was_created = SelfAssessmentOption.objects.update_or_create(
                question_id=django_q_pk,
                option_text=str(row["option_text"]).strip(),
                defaults={
                    "is_correct": bool(int(row["is_correct"])),
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(f"     created={created}  updated={updated}  skipped={skipped}")