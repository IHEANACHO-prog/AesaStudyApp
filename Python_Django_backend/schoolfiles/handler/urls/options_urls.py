from django.urls import path
from ..views.assessments import option_list_create, option_detail

urlpatterns = [
    path('', option_list_create),
    path('create/', option_list_create),
    path('<int:option_id>/', option_detail),
    path('<int:option_id>/update/', option_detail),
    path('<int:option_id>/delete/', option_detail),
]