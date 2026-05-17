from django.urls import path
from ..views.school_details.lecturenote_views import (
    get_lecture_note, create_lecture_note, update_lecture_note, delete_lecture_note
)

urlpatterns = [
    path('topic/<int:topic_id>/note/',        get_lecture_note,    name='get-note'),
    path('topic/<int:topic_id>/note/create/', create_lecture_note, name='create-note'),
    path('topic/<int:topic_id>/note/update/', update_lecture_note, name='update-note'),
    path('topic/<int:topic_id>/note/delete/', delete_lecture_note, name='delete-note'),
]
