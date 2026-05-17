from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from ...models import SelfAssessmentQuestion, SelfAssessmentAttempt
from ...serializers.school_details.selfassessment_serializer import SAQuestionSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_sa_questions(request, course_id):
    questions = SelfAssessmentQuestion.objects.filter(
        course__id=course_id
    ).prefetch_related('options')
    return Response(SAQuestionSerializer(questions, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_self_assessment(request, course_id):
    answers = request.data.get('answers', {})
    questions = SelfAssessmentQuestion.objects.filter(
        course__id=course_id
    ).prefetch_related('options')
    score = 0
    for q in questions:
        selected_id = answers.get(str(q.id))
        if selected_id:
            correct = q.options.filter(id=selected_id, is_correct=True).exists()
            if correct:
                score += 1
    total = questions.count()
    SelfAssessmentAttempt.objects.create(
        student=request.user,
        course_id=course_id,
        score=score,
        total=total
    )
    return Response({
        'score':      score,
        'total':      total,
        'percentage': round(score / total * 100, 1) if total > 0 else 0
    })
