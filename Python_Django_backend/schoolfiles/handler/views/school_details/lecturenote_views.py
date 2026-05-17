from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from ...models import LectureNote, Topic
from ...serializers.school_details.lecturenote_serializer import LectureNoteSerializer
from ...permissions import IsAdminOrInstructor


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_lecture_note(request, topic_id):
    try:
        note = LectureNote.objects.get(topic__id=topic_id)
        return Response(LectureNoteSerializer(note).data)
    except LectureNote.DoesNotExist:
        return Response({'detail': 'No lecture note found.'}, status=404)


@api_view(['POST'])
@permission_classes([IsAdminOrInstructor])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def create_lecture_note(request, topic_id):
    try:
        topic = Topic.objects.get(id=topic_id)
    except Topic.DoesNotExist:
        return Response({'detail': 'Topic not found.'}, status=404)
    if hasattr(topic, 'lecture_note'):
        return Response({'detail': 'Note exists. Use update endpoint.'}, status=400)
    serializer = LectureNoteSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(topic=topic, created_by=request.user, updated_by=request.user)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAdminOrInstructor])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def update_lecture_note(request, topic_id):
    try:
        note = LectureNote.objects.get(topic__id=topic_id)
    except LectureNote.DoesNotExist:
        return Response({'detail': 'Note not found.'}, status=404)
    serializer = LectureNoteSerializer(note, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save(updated_by=request.user)
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@api_view(['DELETE'])
@permission_classes([IsAdminOrInstructor])
def delete_lecture_note(request, topic_id):
    try:
        LectureNote.objects.get(topic__id=topic_id).delete()
        return Response(status=204)
    except LectureNote.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)
