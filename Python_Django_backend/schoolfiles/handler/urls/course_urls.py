# handler/urls/course_urls.py

from django.urls import path
from ..views import school_details as school_views

urlpatterns = [
    # ── NEW: simple course-by-id lookup ──────────────────────────────────────
    # Frontend: courseApi.getById(id) → GET /api/courses/<id>/
    # Used by CourseDetailPage and TopicsPage — no level/dept needed
    path('courses/<int:course_id>/', school_views.get_course_by_id),

    # ── Existing routes — do not change these ────────────────────────────────
    path('level/<int:level_id>/department/<int:department_id>/course/', school_views.get_courses),
    path('level/<int:level_id>/department/<int:department_id>/course/create/', school_views.create_course),
    path('level/<int:level_id>/department/<int:department_id>/course/<int:course_id>/', school_views.get_course),
    path('level/<int:level_id>/department/<int:department_id>/course/<int:course_id>/update/', school_views.update_course),
    path('level/<int:level_id>/department/<int:department_id>/course/<int:course_id>/delete/', school_views.delete_course),
    path('course/<int:course_id>/enroll/', school_views.enroll_in_course),
    path('enrollments/', school_views.get_enrollments),
    path('my-courses/count/', school_views.count_my_courses),
]