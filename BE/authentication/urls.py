from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

router = DefaultRouter()
router.register(r'conversations', views.ConversationViewSet, basename='conversation')

urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('chat/message/', views.chat_message, name='chat_message'),  # Authenticated chat endpoint
    path('chat/history/', views.chat_history, name='chat_history'),
    path('chat/conversations/', views.get_conversations, name='get_conversations'),
    path('chat/save/', views.save_conversation, name='save_conversation'),
    path('chat/clear/', views.clear_history, name='clear_history'),
    path('chat/history/<int:conversation_id>/', views.get_conversation_history, name='get_conversation_history'),
    path('conversations/<int:conversation_id>/send/', views.send_message, name='send_message'),
    path('', include(router.urls)),
] 