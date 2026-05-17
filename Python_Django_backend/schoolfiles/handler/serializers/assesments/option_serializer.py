from rest_framework import serializers
from ...models import Option

class OptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Option
        fields = ['id', 'option_value', 'is_answer']
    
