from django.urls import path, include
from ..views import school_details as school_views

urlpatterns = [
    path('department/create/', school_views.create_department),
    path('departments/', school_views.get_departments),
    path('department/<int:department_id>/', school_views.department_detail),
    path('department/<int:department_id>/update/', school_views.update_department),
    path('department/<int:department_id>/delete/', school_views.delete_department)
]
