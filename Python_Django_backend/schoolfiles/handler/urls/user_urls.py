from django.urls import path
from ..views import users as user_views
from ..serializers import MyTokenObtainPairView
from rest_framework_simplejwt.views import TokenRefreshView

# User urls
urlpatterns = [
    # User registration and login
    path('users/register/admin/', user_views.create_admin, name='create_admin'),
    path('users/register/student/', user_views.create_student, name='create_student'),
    path('users/register/instructor/', user_views.create_instructor, name='create_instructor'),
    path('user/login/', MyTokenObtainPairView.as_view(), name='login'),
    path('user/token/refresh/', TokenRefreshView.as_view(), name='refresh-token'),
    
    # User details and management
    path('users/me/', user_views.get_user_details, name='get_user_details'),
    
    # NEW: Core profile update (Handles Profile Pictures & Basic Info)
    path('users/profile/update/', user_views.update_user_profile, name='update_user_profile'),
    
    # Role-specific updates (Profile details for students/instructors)
    path('users/update/student/', user_views.update_student, name='update_student'),
    path('users/update/instructor/', user_views.update_instructor, name='update_instructor'),
    path('users/delete/student/', user_views.delete_student, name='delete_student'),
    path('users/delete/instructor/', user_views.delete_instructor, name='delete_instructor'),

    # Admin management
    path('users/makeadmin/', user_views.make_admin, name='make_admin')
]