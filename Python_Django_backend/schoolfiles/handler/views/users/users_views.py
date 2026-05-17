from django.db import IntegrityError

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from ...models.users.user import User
from ...models.users.student import Student
from ...models.users.instructor import Instructor
from ...serializers.users.user_serializer import UserSerializer
from ...serializers.users.student_serializer import StudentSerializer
from ...serializers.users.instructor_serializer import InstructorSerializer


# ─────────────────────────────────────────────────────────────────────────────
# Internal helper — consistent error shape across every endpoint
# ─────────────────────────────────────────────────────────────────────────────

def _err(msg: str, detail=None, code=status.HTTP_400_BAD_REQUEST) -> Response:
    body = {"error": msg}
    if detail is not None:
        body["detail"] = detail
    return Response(body, status=code)


# ─────────────────────────────────────────────────────────────────────────────
# REGISTRATION — Admin
# POST /api/users/register/admin/
# ─────────────────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([AllowAny])
def create_admin(request):
    data = request.data.copy()
    data["role"] = "admin"

    serializer = UserSerializer(data=data)
    if not serializer.is_valid():
        return _err("Admin registration failed.", detail=serializer.errors)

    try:
        user = User.objects.create_user(
            username   = data["username"],
            password   = data["password"],
            email      = data.get("email", "").strip().lower(),
            first_name = data.get("first_name", "").strip(),
            last_name  = data.get("last_name", "").strip(),
            role       = "admin",
        )
    except IntegrityError:
        return _err(
            "A user with that username already exists.",
            code=status.HTTP_409_CONFLICT,
        )

    return Response(
        {"message": "Admin account created.", "user": UserSerializer(user).data},
        status=status.HTTP_201_CREATED,
    )


# ─────────────────────────────────────────────────────────────────────────────
# REGISTRATION — Student
# POST /api/users/register/student/
# ─────────────────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([AllowAny])
def create_student(request):
    data = request.data.copy()

    student_payload = {
        "user":          0,
        "department":    data.get("department"),
        "level":         data.get("level"),
        "matric_number": data.get("matric_number", ""),
    }
    student_serializer = StudentSerializer(data=student_payload)
    if not student_serializer.is_valid():
        errors = {k: v for k, v in student_serializer.errors.items() if k != "user"}
        if errors:
            return _err("Student profile data is invalid.", detail=errors)

    user_serializer = UserSerializer(data=data)
    if not user_serializer.is_valid():
        return _err("Registration failed.", detail=user_serializer.errors)

    try:
        user = User.objects.create_user(
            username   = data["username"],
            password   = data["password"],
            email      = data.get("email", "").strip().lower(),
            first_name = data.get("first_name", "").strip(),
            last_name  = data.get("last_name", "").strip(),
            role       = "student",
        )
    except IntegrityError:
        return _err(
            "A user with that username already exists.",
            code=status.HTTP_409_CONFLICT,
        )
    except KeyError:
        return _err("'username' and 'password' are required fields.")

    try:
        Student.objects.create(
            user          = user,
            department_id = data["department"],
            level_id      = data["level"],
            matric_number = data["matric_number"],
        )
    except Exception as exc:
        user.delete()
        return _err("Student profile could not be saved.", detail=str(exc))

    return Response(
        {
            "message": "Student account created successfully.",
            "user":    UserSerializer(user).data,
        },
        status=status.HTTP_201_CREATED,
    )


# ─────────────────────────────────────────────────────────────────────────────
# REGISTRATION — Instructor
# POST /api/users/register/instructor/
# ─────────────────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([AllowAny])
def create_instructor(request):
    data = request.data.copy()

    user_serializer = UserSerializer(data=data)
    if not user_serializer.is_valid():
        return _err("Registration failed.", detail=user_serializer.errors)

    try:
        user = User.objects.create_user(
            username   = data["username"],
            password   = data["password"],
            email      = data.get("email", "").strip().lower(),
            first_name = data.get("first_name", "").strip(),
            last_name  = data.get("last_name", "").strip(),
            role       = "instructor",
        )
    except IntegrityError:
        return _err(
            "A user with that username already exists.",
            code=status.HTTP_409_CONFLICT,
        )
    except KeyError:
        return _err("'username' and 'password' are required fields.")

    try:
        instructor = Instructor.objects.create(
            user          = user,
            department_id = data["department"],
            staff_id      = data["staff_id"],
        )
        levels = data.get("level", [])
        if isinstance(levels, (list, tuple)) and levels:
            instructor.level.set(levels)
    except Exception as exc:
        user.delete()
        return _err("Instructor profile could not be saved.", detail=str(exc))

    return Response(
        {
            "message": "Instructor account created successfully.",
            "user":    UserSerializer(user).data,
        },
        status=status.HTTP_201_CREATED,
    )


# ─────────────────────────────────────────────────────────────────────────────
# CURRENT USER
# GET /api/users/me/
# ─────────────────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_details(request):
    """
    Returns the authenticated user's profile.
    Injects role-specific profile fields into the flat response so the
    frontend can detect studentProfile / instructorProfile without a
    separate API call.
    """
    user = request.user
    data = dict(UserSerializer(user).data)

    if user.role == 'student':
        try:
            student = user.student_profile
            data['student_id']    = student.id
            data['department']    = student.department_id
            data['level']         = student.level_id
            data['matric_number'] = student.matric_number
        except Exception:
            pass

    elif user.role == 'instructor':
        try:
            instructor = user.instructor_profile
            data['instructor_id'] = instructor.id
            data['department']    = instructor.department_id
            data['staff_id']      = instructor.staff_id
        except Exception:
            pass

    return Response(data, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────────────────────
# PROFILE UPDATE (picture + basic info)
# PATCH /api/users/profile/update/
# ─────────────────────────────────────────────────────────────────────────────

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_user_profile(request):
    serializer = UserSerializer(
        request.user,
        data=request.data,
        partial=True,
    )
    if not serializer.is_valid():
        return _err("Profile update failed.", detail=serializer.errors)

    serializer.save()
    return Response(
        {"message": "Profile updated.", "user": serializer.data},
        status=status.HTTP_200_OK,
    )


# ─────────────────────────────────────────────────────────────────────────────
# STUDENT PROFILE UPDATE
# PATCH /api/users/update/student/
# ─────────────────────────────────────────────────────────────────────────────

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_student(request):
    try:
        profile = request.user.student_profile
    except Student.DoesNotExist:
        return _err("No student profile found for this user.", code=status.HTTP_404_NOT_FOUND)

    serializer = StudentSerializer(profile, data=request.data, partial=True)
    if not serializer.is_valid():
        return _err("Update failed.", detail=serializer.errors)

    serializer.save()
    return Response({"message": "Student profile updated.", "profile": serializer.data})


# ─────────────────────────────────────────────────────────────────────────────
# INSTRUCTOR PROFILE UPDATE
# PATCH /api/users/update/instructor/
# ─────────────────────────────────────────────────────────────────────────────

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_instructor(request):
    try:
        profile = request.user.instructor_profile
    except Instructor.DoesNotExist:
        return _err("No instructor profile found for this user.", code=status.HTTP_404_NOT_FOUND)

    serializer = InstructorSerializer(profile, data=request.data, partial=True)
    if not serializer.is_valid():
        return _err("Update failed.", detail=serializer.errors)

    serializer.save()
    return Response({"message": "Instructor profile updated.", "profile": serializer.data})


# ─────────────────────────────────────────────────────────────────────────────
# DELETE STUDENT
# DELETE /api/users/delete/student/
# ─────────────────────────────────────────────────────────────────────────────

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_student(request):
    try:
        profile = request.user.student_profile
    except Student.DoesNotExist:
        return _err("No student profile found.", code=status.HTTP_404_NOT_FOUND)

    request.user.delete()
    return Response({"message": "Student account deleted."}, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────────────────────
# DELETE INSTRUCTOR
# DELETE /api/users/delete/instructor/
# ─────────────────────────────────────────────────────────────────────────────

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_instructor(request):
    try:
        profile = request.user.instructor_profile
    except Instructor.DoesNotExist:
        return _err("No instructor profile found.", code=status.HTTP_404_NOT_FOUND)

    request.user.delete()
    return Response({"message": "Instructor account deleted."}, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────────────────────
# MAKE ADMIN
# POST /api/users/makeadmin/
# ─────────────────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def make_admin(request):
    if request.user.role != "admin":
        return _err("Only admins can perform this action.", code=status.HTTP_403_FORBIDDEN)

    target_username = request.data.get("username", "").strip()
    if not target_username:
        return _err("'username' is required.")

    try:
        target = User.objects.get(username=target_username)
    except User.DoesNotExist:
        return _err("User not found.", code=status.HTTP_404_NOT_FOUND)

    target.role = "admin"
    target.save(update_fields=["role"])
    return Response(
        {"message": f"{target.username} has been promoted to admin."},
        status=status.HTTP_200_OK,
    )