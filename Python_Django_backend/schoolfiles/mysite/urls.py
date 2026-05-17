# ============================================
# AESA Django — mysite/urls.py
# PASTE TO: mysite/urls.py
# ============================================

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

urlpatterns = [
    path('admin/', admin.site.urls),

    # ── JWT ───────────────────────────────────────────────────────────────────
    path('api/token/',         TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(),   name='token_refresh'),
    path('api/token/verify/',  TokenVerifyView.as_view(),    name='token_verify'),

    # ── App modules ───────────────────────────────────────────────────────────
    path('api/', include('handler.urls.user_urls')),
    path('api/', include('handler.urls.course_urls')),
    path('api/', include('handler.urls.department_urls')),
    path('api/', include('handler.urls.level_urls')),
    path('api/', include('handler.urls.enroll_urls')),
    path('api/', include('handler.urls.exam_urls')),
    path('api/', include('handler.urls.options_urls')),
    path('api/', include('handler.urls.topic_urls')),
    path('api/', include('handler.urls.submit_urls')),
    path('api/', include('handler.urls.analytics_urls')),
    path('api/', include('handler.urls.lecturenote_urls')),
    path('api/', include('handler.urls.mediaresource_urls')),   # ✅ was missing
    path('api/', include('handler.urls.selfassessment_urls')),  # ✅ was missing
    path('api/', include('handler.urls.forum_urls')),           # ✅ single canonical forum (replaces q_and_a_urls duplicate)
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)