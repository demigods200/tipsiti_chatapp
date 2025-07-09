from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserSerializer, ConversationSerializer, MessageSerializer
from .models import Conversation, Message
from .openai_handler import ChatHandler
from django.utils import timezone

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': serializer.data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    email = request.data.get('email')
    password = request.data.get('password')
    
    # Try to find user by email
    from django.contrib.auth.models import User
    try:
        username = User.objects.get(email=email).username
    except User.DoesNotExist:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
    
    user = authenticate(username=username, password=password)
    
    if user:
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_message(request, conversation_id):
    try:
        conversation = Conversation.objects.get(id=conversation_id, user=request.user)
        content = request.data.get('content')
        
        if not content:
            return Response({'error': 'Message content is required'}, 
                          status=status.HTTP_400_BAD_REQUEST)

        # Save user message
        user_message = Message.objects.create(
            conversation=conversation,
            role='user',
            content=content
        )

        # Get conversation history
        messages = conversation.messages.all()
        message_list = MessageSerializer(messages, many=True).data

        # Get AI response
        chat_handler = ChatHandler()
        ai_response = chat_handler.get_response(message_list)

        # Save AI response
        ai_message = Message.objects.create(
            conversation=conversation,
            role='assistant',
            content=ai_response
        )

        return Response({
            'user_message': MessageSerializer(user_message).data,
            'ai_message': MessageSerializer(ai_message).data
        }, status=status.HTTP_201_CREATED)

    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, 
                      status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, 
                      status=status.HTTP_500_INTERNAL_SERVER_ERROR) 

@api_view(['POST'])
@permission_classes([AllowAny])
def test_chat(request):
    """Public endpoint for OpenAI chat"""
    try:
        content = request.data.get('message', '')
        print("Received message:", content)
        if not content:
            return Response({'error': 'Message is required'}, 
                          status=status.HTTP_400_BAD_REQUEST)

        try:
            chat_handler = ChatHandler()
        except Exception as e:
            print("Failed to initialize ChatHandler:", str(e))
            return Response(
                {'error': 'Failed to initialize chat service. Please try again.'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        messages = [{'role': 'user', 'content': content}]
        print("Sending to OpenAI:", messages)
        
        try:
            ai_response = chat_handler.get_response(messages)
            print("Got response from OpenAI:", ai_response)
            
            if ai_response.startswith('Error:'):
                return Response(
                    {'error': ai_response}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
            return Response({
                'message': content,
                'response': ai_response,
                'created_at': timezone.now()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print("Error getting response:", str(e))
            return Response(
                {'error': 'Failed to get response from chat service'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    except Exception as e:
        print("Unexpected error in test_chat:", str(e))
        import traceback
        traceback.print_exc()
        return Response(
            {'error': 'An unexpected error occurred'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_message(request):
    """Handle chat messages for authenticated users"""
    try:
        content = request.data.get('message', '')
        print("Received message:", content)
        if not content:
            return Response({'error': 'Message is required'}, 
                          status=status.HTTP_400_BAD_REQUEST)

        try:
            chat_handler = ChatHandler()
        except Exception as e:
            print("Failed to initialize ChatHandler:", str(e))
            return Response(
                {'error': 'Failed to initialize chat service. Please try again.'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Create a new conversation
        conversation = Conversation.objects.create(
            user=request.user,
            title=content[:50]  # Use first 50 chars of message as title
        )

        # Save user message
        user_message = Message.objects.create(
            conversation=conversation,
            role='user',
            content=content
        )

        messages = [{'role': 'user', 'content': content}]
        print("Sending to OpenAI:", messages)
        
        try:
            ai_response = chat_handler.get_response(messages)
            print("Got response from OpenAI:", ai_response)
            
            if ai_response.startswith('Error:'):
                return Response(
                    {'error': ai_response}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Save AI response
            ai_message = Message.objects.create(
                conversation=conversation,
                role='assistant',
                content=ai_response
            )

            return Response({
                'message': content,
                'response': ai_response,
                'created_at': user_message.created_at
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print("Error getting response:", str(e))
            return Response(
                {'error': 'Failed to get response from chat service'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    except Exception as e:
        print("Unexpected error in chat_message:", str(e))
        import traceback
        traceback.print_exc()
        return Response(
            {'error': 'An unexpected error occurred'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def chat_history(request):
    """Get chat history"""
    try:
        # Get all conversations for the user
        conversations = Conversation.objects.filter(user=request.user).order_by('-created_at')
        
        history = []
        for conv in conversations:
            messages = conv.messages.all().order_by('created_at')
            for i in range(0, len(messages), 2):
                if i + 1 < len(messages):  # If we have a pair of messages
                    history.append({
                        'id': messages[i].id,
                        'message': messages[i].content,
                        'response': messages[i+1].content,
                        'created_at': messages[i].created_at
                    })

        return Response(history, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': str(e)}, 
                      status=status.HTTP_500_INTERNAL_SERVER_ERROR) 