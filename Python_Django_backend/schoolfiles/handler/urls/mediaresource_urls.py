from django.urls import path
from ..views.school_details.mediaresource_views import (
    get_media_resources, create_media_resource, update_media_resource, delete_media_resource
)

urlpatterns = [
    path('topic/<int:topic_id>/media/',                          get_media_resources,    name='get-media'),
    path('topic/<int:topic_id>/media/create/',                   create_media_resource,  name='create-media'),
    path('topic/<int:topic_id>/media/<int:resource_id>/update/', update_media_resource,  name='update-media'),
    path('topic/<int:topic_id>/media/<int:resource_id>/delete/', delete_media_resource,  name='delete-media'),
]
