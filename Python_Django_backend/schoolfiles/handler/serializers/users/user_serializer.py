from rest_framework import serializers
from handler.models import User


class UserSerializer(serializers.ModelSerializer):
    # write_only=True — password is accepted on input, NEVER returned in responses
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model  = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "password",
            "role",
            "profile_picture",
        ]
        # id and role are never set by the client directly.
        # role is injected by the view (create_student / create_instructor / create_admin).
        read_only_fields = ["id", "role"]

    # ── Validation ───────────────────────────────────────────────────────────

    def validate_username(self, value: str) -> str:
        value = value.strip()
        # On create, check for duplicates.
        # On update (partial), skip if username hasn't changed.
        instance = self.instance
        qs = User.objects.filter(username=value)
        if instance:
            qs = qs.exclude(pk=instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def validate_email(self, value: str) -> str:
        return value.strip().lower()

    # ── Create ───────────────────────────────────────────────────────────────

    def create(self, validated_data: dict) -> User:
        """
        Called only from API endpoints that use the serializer's .save().
        The registration views bypass this and call User.objects.create_user()
        directly so they have full control over the role field.
        This method is kept for completeness and admin-panel use.
        """
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)   # always hash — never store plain-text
        else:
            user.set_unusable_password()
        user.save()
        return user

    # ── Update ───────────────────────────────────────────────────────────────

    def update(self, instance: User, validated_data: dict) -> User:
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)   # re-hash on every password change
        instance.save()
        return instance