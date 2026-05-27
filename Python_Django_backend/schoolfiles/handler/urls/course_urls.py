from django.urls import path
from ..views import school_details as school_views
from handler.views.school_details.assignment_views import (
    assign_course,
    unassign_course,
    my_assignments,
    enrolled_students,
    instructor_dashboard,          # ← ADD THIS IMPORT
)

urlpatterns = [
    # ── Instructor assignment routes (must come BEFORE <int:course_id> routes) ──
    path('courses/my-assignments/',                    my_assignments,       name='my-assignments'),
    path('courses/<int:course_id>/assign/',            assign_course,        name='assign-course'),
    path('courses/<int:course_id>/unassign/',          unassign_course,      name='unassign-course'),
    path('courses/<int:course_id>/enrolled-students/', enrolled_students,    name='enrolled-students'),

    # ── Instructor dashboard ──────────────────────────────────────────────────
    path('instructor/dashboard/',                      instructor_dashboard, name='instructor-dashboard'),  # ← ADD THIS LINE

    # ── Existing course routes ────────────────────────────────────────────────
    path('courses/<int:course_id>/', school_views.get_course_by_id),
    path('level/<int:level_id>/department/<int:department_id>/course/', school_views.get_courses),
    path('level/<int:level_id>/department/<int:department_id>/course/create/', school_views.create_course),
    path('level/<int:level_id>/department/<int:department_id>/course/<int:course_id>/', school_views.get_course),
    path('level/<int:level_id>/department/<int:department_id>/course/<int:course_id>/update/', school_views.update_course),
    path('level/<int:level_id>/department/<int:department_id>/course/<int:course_id>/delete/', school_views.delete_course),
    path('course/<int:course_id>/enroll/', school_views.enroll_in_course),
    path('enrollments/', school_views.get_enrollments),
    path('my-courses/count/', school_views.count_my_courses),
]