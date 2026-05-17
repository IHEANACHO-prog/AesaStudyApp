# handler/serializers/school_details/topic_serializer.py

from rest_framework import serializers
from ...models import Topic


class TopicSerializer(serializers.ModelSerializer):
    """
    Used for:
      - listing topics by course  GET /api/course/<id>/topics/
      - getting a single topic    GET /api/course/<id>/topics/<tp_id>/
      - creating a topic          POST /api/course/<id>/topics/create/
      - updating a topic          PATCH /api/course/<id>/topics/<tp_id>/update/

    'course' is a writable integer FK field so create/update work correctly.
    'course_name' is a read-only convenience string so the frontend can
     display the course name without a second request.
    """

    # Read-only display helper — never breaks create/update
    course_name = serializers.CharField(
        source='course.code', read_only=True
    )

    class Meta:
        model  = Topic
        fields = [
            'id',
            'name',
            'description',
            'order',
            'course',        # writable integer FK — required for create
            'course_name',   # read-only string — safe for display
        ]