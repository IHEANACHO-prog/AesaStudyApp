from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from handler.models import Topic, Course, Progress
from handler.serializers.school_details.topic_serializer import TopicSerializer
from handler.views.users.role_auth import IsStudent


class TopicListView(generics.ListAPIView):
    serializer_class   = TopicSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs     = Topic.objects.all().order_by('order')
        course = self.request.query_params.get('course')
        if course:
            qs = qs.filter(course__code=course)
        return qs


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_topics(request, course_id):
    get_object_or_404(Course, id=course_id)
    topics     = Topic.objects.filter(course__id=course_id).order_by('order')
    serializer = TopicSerializer(topics, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_topic(request, course_id):
    get_object_or_404(Course, id=course_id)
    data           = request.data.copy()
    data['course'] = course_id
    serializer     = TopicSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_topic(request, course_id, tp_id):
    topic      = get_object_or_404(Topic, id=tp_id, course__id=course_id)
    serializer = TopicSerializer(topic)
    return Response(serializer.data)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_topic(request, course_id, tp_id):
    topic      = get_object_or_404(Topic, id=tp_id, course__id=course_id)
    serializer = TopicSerializer(topic, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_topic(request, course_id, tp_id):
    topic = get_object_or_404(Topic, id=tp_id, course__id=course_id)
    topic.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsStudent])
def completed_topic(request, course_id, tp_id):
    """
    POST /api/course/<course_id>/topics/<tp_id>/complete/
    Marks topic complete, persists to Progress model, recalculates percentage.
    """
    topic  = get_object_or_404(Topic,  id=tp_id,     course__id=course_id)
    course = get_object_or_404(Course, id=course_id)

    total_topics = Topic.objects.filter(course=course).count()

    progress, _ = Progress.objects.get_or_create(
        user=request.user,
        course=course,
        defaults={'total_topics': total_topics}
    )

    progress.completed_topics.add(topic)

    completed_count              = progress.completed_topics.count()
    progress.total_topics        = total_topics
    progress.progress_percentage = round(
        (completed_count / total_topics) * 100, 1
    ) if total_topics > 0 else 0.0
    progress.save()

    return Response({
        'message':             f'Topic "{topic.name}" marked as complete.',
        'progress_percentage': progress.progress_percentage,
        'completed_count':     completed_count,
        'total_topics':        total_topics,
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsStudent])
def get_completed_topics(request, course_id):
    """
    GET /api/course/<course_id>/topics/completed/
    Returns IDs of all topics the student has completed in this course.
    CourseDetailPage calls this on mount so progress survives navigation.
    """
    get_object_or_404(Course, id=course_id)
    try:
        progress      = Progress.objects.get(user=request.user, course_id=course_id)
        completed_ids = list(progress.completed_topics.values_list('id', flat=True))
    except Progress.DoesNotExist:
        completed_ids = []

    return Response({'completed_topic_ids': completed_ids})