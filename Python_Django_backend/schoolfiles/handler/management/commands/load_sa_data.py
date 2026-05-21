import csv
from django.core.management.base import BaseCommand
from django.db import transaction
from handler.models import SelfAssessmentQuestion, SelfAssessmentOption, Course
class Command(BaseCommand):
    help = 'Load SelfAssessmentOptions in bulk batches'
    def handle(self, *args, **kwargs):
        options_csv = r"E:\Aesa Course Database\AESA_FINAL_OPTIONS_MASTER_FIXED.csv"
        # Build question map from existing DB records
        self.stdout.write("Building question map...")
        question_map = {q.id: q for q in SelfAssessmentQuestion.objects.all()}
        # Map CSV question_id to DB question
        # We need csv_id -> db_question mapping
        questions_csv = r"E:\Aesa Course Database\AESA_FINAL_QUESTIONS_MASTER_FIXED.csv"
        csv_to_db = {}
        with open(questions_csv, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                csv_id = int(row['id'])
                text = row['question_text'].strip()
                for q in question_map.values():
                    if q.question_text == text:
                        csv_to_db[csv_id] = q
                        break
        self.stdout.write(f"Mapped {len(csv_to_db)} questions. Loading options in batches...")
        options_to_create = []
        with open(options_csv, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                csv_q_id = int(row['question_id'])
                if csv_q_id not in csv_to_db:
                    continue
                options_to_create.append(SelfAssessmentOption(
                    question=csv_to_db[csv_q_id],
                    option_text=row['option_text'].strip(),
                    is_correct=row['is_correct'].strip() in ('1', 'true', 'True', 'TRUE')
                ))
        # Delete existing options first to avoid duplicates
        self.stdout.write(f"Inserting {len(options_to_create)} options in batches of 100...")
        BATCH = 100
        for i in range(0, len(options_to_create), BATCH):
            with transaction.atomic():
                SelfAssessmentOption.objects.bulk_create(options_to_create[i:i+BATCH], ignore_conflicts=True)
            self.stdout.write(f"  Batch {i//BATCH + 1} done")
        self.stdout.write(self.style.SUCCESS("All options loaded!"))
