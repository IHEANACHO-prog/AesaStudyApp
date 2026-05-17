from django.contrib import admin
from import_export import resources, fields
from import_export.widgets import ForeignKeyWidget
from import_export.admin import ImportExportModelAdmin

from .models.school_details.topic import Topic
from .models.school_details.course import Course
from .models.school_details.department import Department
from .models.school_details.level import Level
from .models.school_details.enrollment import Enrollment
from .models.users.user import User
from .models.users.student import Student
from .models.users.instructor import Instructor
from .models import LectureNote, MediaResource, SelfAssessmentQuestion, SelfAssessmentOption, SelfAssessmentAttempt


# ============================================
# Department Admin
# ============================================

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display  = ('id', 'name', 'faculty')
    search_fields = ('name', 'faculty')
    ordering      = ('name',)


# ============================================
# Level Admin
# ============================================

@admin.register(Level)
class LevelAdmin(admin.ModelAdmin):
    list_display  = ('id', 'name')
    search_fields = ('name',)
    ordering      = ('name',)


# ============================================
# Course Admin
# ============================================

class CourseResource(resources.ModelResource):
    class Meta:
        model            = Course
        fields           = ('id', 'code', 'title', 'semester', 'level', 'department')
        import_id_fields = ('id',)
        skip_unchanged   = True
        report_skipped   = True


@admin.register(Course)
class CourseAdmin(ImportExportModelAdmin):
    resource_class = CourseResource
    list_display   = ('id', 'code', 'title', 'semester', 'level', 'department', 'instructor')
    list_filter    = ('semester', 'level', 'department')
    search_fields  = ('code', 'title')
    ordering       = ('code',)


# ============================================
# Topic Admin
# ============================================

class TopicResource(resources.ModelResource):
    course = fields.Field(
        column_name='course',
        attribute='course',
        widget=ForeignKeyWidget(Course, field='code')
    )

    class Meta:
        model            = Topic
        fields           = ('id', 'name', 'course', 'description', 'order')
        import_id_fields = ('id',)
        skip_unchanged   = True
        report_skipped   = True
        use_bulk         = True
        batch_size       = 100


@admin.register(Topic)
class TopicAdmin(ImportExportModelAdmin):
    resource_class = TopicResource
    list_display   = ('id', 'name', 'course', 'order')
    list_filter    = ('course',)
    search_fields  = ('name', 'course__code', 'description')
    ordering       = ('course', 'order')


# ============================================
# Enrollment Admin
# ============================================

@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display  = ('id', 'student', 'course', 'enrolled_at')
    list_filter   = ('course',)
    search_fields = ('student__username', 'course__code')
    ordering      = ('-enrolled_at',)


# ============================================
# Material Admin
# ===========================================


# ============================================
# Lecture Note Admin
# ============================================

@admin.register(LectureNote)
class LectureNoteAdmin(admin.ModelAdmin):
    list_display  = ('topic', 'created_by', 'updated_at')
    search_fields = ('topic__name',)


# ============================================
# Media Resource Admin
# ============================================

@admin.register(MediaResource)
class MediaResourceAdmin(admin.ModelAdmin):
    list_display  = ('title', 'topic', 'media_type', 'uploaded_by')
    list_filter   = ('media_type',)
    search_fields = ('title', 'topic__name')


# ============================================
# Self Assessment Admin
# ============================================

class SAQuestionResource(resources.ModelResource):
    class Meta:
        model            = SelfAssessmentQuestion
        fields           = ('id', 'course', 'question_text', 'question_type', 'order')
        import_id_fields = ('id',)
        skip_unchanged   = True


class SAOptionResource(resources.ModelResource):
    class Meta:
        model            = SelfAssessmentOption
        fields           = ('id', 'question', 'option_text', 'is_correct')
        import_id_fields = ('id',)
        skip_unchanged   = True


@admin.register(SelfAssessmentQuestion)
class SAQuestionAdmin(ImportExportModelAdmin):
    resource_class = SAQuestionResource
    list_display   = ('question_text', 'course', 'question_type', 'order')
    list_filter    = ('course', 'question_type')
    search_fields  = ('question_text',)


@admin.register(SelfAssessmentOption)
class SAOptionAdmin(ImportExportModelAdmin):
    resource_class = SAOptionResource
    list_display   = ('question', 'option_text', 'is_correct')
    list_filter    = ('is_correct',)


@admin.register(SelfAssessmentAttempt)
class SAAttemptAdmin(admin.ModelAdmin):
    list_display  = ('student', 'course', 'score', 'total', 'completed_at')
    list_filter   = ('course',)
    search_fields = ('student__username', 'course__code')
    ordering      = ('-completed_at',)


# ============================================
# User Admin
# ============================================

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display  = ('id', 'username', 'email', 'is_staff', 'is_active')
    list_filter   = ('is_staff', 'is_active')
    search_fields = ('username', 'email')
    ordering      = ('username',)


# ============================================
# Student Admin
# ============================================

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display  = ('id', 'user')
    search_fields = ('user__username', 'user__email')


# ============================================
# Instructor Admin
# ============================================

@admin.register(Instructor)
class InstructorAdmin(admin.ModelAdmin):
    list_display  = ('id', 'user')
    search_fields = ('user__username', 'user__email')