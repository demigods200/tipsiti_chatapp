from django.contrib import admin
from django.urls import path, include
from authentication import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('authentication.urls')),  # All authenticated endpoints
    path('api/chat/message/', views.test_chat, name='public_chat'),  # Public chat endpoint
] 