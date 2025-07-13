from django.db import models
from django.contrib.auth.models import User

class Conversation(models.Model):
    CHATBOT_TYPES = [
        ('general', 'General Assistant'),
        ('travel', 'Travel Assistant'),
        ('learning', 'Learning Assistant'),
        ('coding', 'Coding Assistant'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_visible = models.BooleanField(default=False)
    chatbot_type = models.CharField(
        max_length=50,
        choices=CHATBOT_TYPES,
        default='general'
    )

    def __str__(self):
        return f"{self.title} - {self.user.username}"

class Message(models.Model):
    conversation = models.ForeignKey(Conversation, related_name='messages', on_delete=models.CASCADE)
    role = models.CharField(max_length=50)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.role}: {self.content[:50]}..." 