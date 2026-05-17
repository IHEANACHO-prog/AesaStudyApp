from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser, AllowAny
from rest_framework.response import Response
from rest_framework import status
from ...models import Department
from ...serializers import DepartmentSerializer

@api_view(['POST'])
def create_department(request):
    serialize_department = DepartmentSerializer(data=request.data)
    if serialize_department.is_valid():
        serialize_department.save()
        return Response(serialize_department.data, status=status.HTTP_201_CREATED)
    return Response(serialize_department.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_departments(request):
    departments = Department.objects.all()
    serialize_department = DepartmentSerializer(departments, many=True)
    return Response(serialize_department.data)

@api_view(['GET'])
def department_detail(request, department_id):
    try:
        department = Department.objects.get(id=department_id)
    except Department.DoesNotExist:
        return Response({'error': 'Department not found'}, status=status.HTTP_404_NOT_FOUND)
    
    serialize_department = DepartmentSerializer(department)
    return Response(serialize_department.data)
    
@api_view(["PATCH"])
@permission_classes([IsAdminUser])
def update_department(request, department_id):
    try:
        department = Department.objects.get(id=department_id)
    except Department.DoesNotExist:
        return Response({'error': 'Department not found'}, status=status.HTTP_404_NOT_FOUND)
    
    serialize_department = DepartmentSerializer(department, data=request.data, partial=True)
    if serialize_department.is_valid():
        serialize_department.save()
        return Response(serialize_department.data)
    return Response(serialize_department.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["DELETE"])
@permission_classes([IsAdminUser])
def delete_department(request, department_id):
    try:
        department = Department.objects.get(id=department_id)
    except Department.DoesNotExist:
        return Response({'error': 'Department not found'}, status=status.HTTP_404_NOT_FOUND)

    department.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)

