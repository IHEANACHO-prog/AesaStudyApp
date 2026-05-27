from .course_views import (
    get_courses,
    count_my_courses,
    enroll_in_course,
    get_enrollments,
    create_course,
    get_course,
    update_course,
    delete_course,
    get_course_by_id,
)
from .department_views import (
    create_department,
    get_departments,
    department_detail,
    update_department,
    delete_department,
)
from .level_view import (
    get_levels,
    create_level,
    level_detail,
    update_level,
    delete_level,
)
from .topic_views import (
    TopicListView,
    all_topics,
    create_topic,
    get_topic,
    update_topic,
    delete_topic,
    completed_topic,
    get_completed_topics,
)
from .lecturenote_views import (
    get_lecture_note,
    create_lecture_note,
    update_lecture_note,
    delete_lecture_note,
)
from .mediaresource_views import (
    get_media_resources,
    create_media_resource,
    update_media_resource,
    delete_media_resource,
)
from .selfassessment_views import (
    get_sa_questions,
    submit_self_assessment,
)
from .assignment_views import (
    assign_course,
    unassign_course,
    my_assignments,
    enrolled_students,
    instructor_dashboard,
)