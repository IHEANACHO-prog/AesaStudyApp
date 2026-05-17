from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, AllowAny
from rest_framework import status
from ...models import Level
from ...serializers import LevelSerializer

@api_view(['GET'])
@permission_classes([AllowAny])
def get_levels(request):
    levels = Level.objects.all()
    serialize_level = LevelSerializer(levels, many=True)
    return Response(serialize_level.data)
    
@api_view(['POST'])
def create_level(request):
    serialize_level = LevelSerializer(data=request.data)
    if serialize_level.is_valid():
        serialize_level.save()
        return Response(serialize_level.data, status=status.HTTP_201_CREATED)
    return Response(serialize_level.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def level_detail(request, level_id):
    try:
        level = Level.objects.get(id=level_id)
    except Level.DoesNotExist:
        return Response({'error': 'Level not found'}, status=status.HTTP_404_NOT_FOUND)

    serialize_level = LevelSerializer(level)
    return Response(serialize_level.data)

@api_view(["PATCH"])
@permission_classes([IsAdminUser])
def update_level(request, level_id):
    try:
        level = Level.objects.get(id=level_id)
    except Level.DoesNotExist:
        return Response({'error': 'Level not found'}, status=status.HTTP_404_NOT_FOUND)
    
    serialize_level = LevelSerializer(level, data=request.data, partial=True)    
    if serialize_level.is_valid():
        serialize_level.save()
        return Response(serialize_level.data)
    return Response(serialize_level.errors, status=status.HTTP_400_BAD_REQUEST)
    
@api_view(["DELETE"])
@permission_classes([IsAdminUser])
def delete_level(request, level_id):
    try:
        level = Level.objects.get(id=level_id)
    except Level.DoesNotExist:
        return Response({'error': 'Level not found'}, status=status.HTTP_404_NOT_FOUND)
    level.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)

