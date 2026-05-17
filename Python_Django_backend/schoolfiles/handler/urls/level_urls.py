from django.urls import path, include
from ..views import school_details as school_views

urlpatterns = [
    path('levels/', school_views.get_levels),
    path('level/create/', school_views.create_level),
    path('level/<int:level_id>/', school_views.level_detail),
    path('level/<int:level_id>/update/', school_views.update_level),
    path('level/<int:level_id>/delete/', school_views.delete_level)
]
