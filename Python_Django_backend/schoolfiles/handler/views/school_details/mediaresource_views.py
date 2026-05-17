from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from ...models import MediaResource, Topic
from ...serializers.school_details.mediaresource_serializer import MediaResourceSerializer
from ...permissions import IsAdminOrInstructor


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_media_resources(request, topic_id):
    resources = MediaResource.objects.filter(topic__id=topic_id)
    return Response(MediaResourceSerializer(resources, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdminOrInstructor])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def create_media_resource(request, topic_id):
    try:
        topic = Topic.objects.get(id=topic_id)
    except Topic.DoesNotExist:
        return Response({'detail': 'Topic not found.'}, status=404)
    serializer = MediaResourceSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(topic=topic, uploaded_by=request.user)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAdminOrInstructor])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def update_media_resource(request, topic_id, resource_id):
    try:
        resource = MediaResource.objects.get(id=resource_id, topic__id=topic_id)
    except MediaResource.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)
    serializer = MediaResourceSerializer(resource, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@api_view(['DELETE'])
@permission_classes([IsAdminOrInstructor])
def delete_media_resource(request, topic_id, resource_id):
    try:
        MediaResource.objects.get(id=resource_id, topic__id=topic_id).delete()
        return Response(status=204)
    except MediaResource.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)
