# ============================================
# AESA Django — handler/urls/__init__.py
# PASTE TO: handler/urls/__init__.py
# ============================================
#
# This aggregator is kept in sync with mysite/urls.py.
# Both files must include the same set of url modules.
# ============================================

from handler.urls.user_urls          import urlpatterns as users_patterns
from handler.urls.level_urls         import urlpatterns as level_patterns
from handler.urls.department_urls    import urlpatterns as department_patterns
from handler.urls.course_urls        import urlpatterns as course_patterns
from handler.urls.exam_urls          import urlpatterns as exam_patterns
from handler.urls.options_urls       import urlpatterns as options_patterns
from handler.urls.submit_urls        import urlpatterns as submit_patterns
from handler.urls.topic_urls         import urlpatterns as topic_patterns
from handler.urls.analytics_urls     import urlpatterns as analytics_patterns
from handler.urls.enroll_urls        import urlpatterns as enroll_patterns
from handler.urls.lecturenote_urls   import urlpatterns as note_patterns
from handler.urls.mediaresource_urls import urlpatterns as media_patterns   # ✅ kept
from handler.urls.selfassessment_urls import urlpatterns as sa_patterns     # ✅ kept
from handler.urls.forum_urls         import urlpatterns as forum_patterns   # ✅ replaces q_and_a_urls

urlpatterns = (
    users_patterns      +
    level_patterns      +
    department_patterns +
    course_patterns     +
    exam_patterns       +
    options_patterns    +
    submit_patterns     +
    topic_patterns      +
    analytics_patterns  +
    enroll_patterns     +
    note_patterns       +
    media_patterns      +
    sa_patterns         +
    forum_patterns
)