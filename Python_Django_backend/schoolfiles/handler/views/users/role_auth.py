from rest_framework.permissions import BasePermission

class IsStudent(BasePermission):
    def has_permission(self, request, view):
        return request.auth.get('role') == 'student'

class IsInstructor(BasePermission):
    def has_permission(self, request, view):
        return request.auth.get('role') == 'instructor'
    
class IsMe(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_admin)
