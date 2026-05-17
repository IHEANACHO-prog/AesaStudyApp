from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

# Absolute Imports for stability
from handler.models import Option, Question
from handler.serializers import OptionSerializer
from handler.views.users.role_auth import IsInstructor

@api_view(['GET', 'POST'])
def option_list_create(request, exam_id, question_id, course_id):
    # Ensure the question exists within the specific exam and course
    question = get_object_or_404(
        Question,
        id=question_id,
        exam_id=exam_id,
        exam__course_id=course_id
    )

    if request.method == 'GET':
        options = Option.objects.filter(question=question)
        serializer = OptionSerializer(options, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        # Verify instructor permission manually or via decorator
        if not request.user.is_authenticated or request.user.role != 'instructor':
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = OptionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(question=question)  
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PATCH', 'DELETE'])
def option_detail(request, question_id, option_id, exam_id, course_id):
    # Complex lookup to ensure data integrity across the hierarchy
    option = get_object_or_404(
        Option,
        id=option_id,
        question_id=question_id,
        question__exam_id=exam_id,
        question__exam__course_id=course_id
    )

    if request.method == 'GET':
        serializer = OptionSerializer(option)
        return Response(serializer.data)

    # Check for Instructor role for modifications
    if request.user.role != 'instructor':
        return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'PATCH':
        serializer = OptionSerializer(option, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        option.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)