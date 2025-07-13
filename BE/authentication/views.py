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

        user_message = Message.objects.create(
            conversation=conversation,
            role='user',
            content=content
        )

        messages = conversation.messages.all()
        message_list = MessageSerializer(messages, many=True).data

        chat_handler = ChatHandler()
        ai_response = chat_handler.get_response(message_list)

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
    try:
        content = request.data.get('message', '')
        chatbot_type = request.data.get('chatType', 'general')
        context = request.data.get('context', [])
        
        print("Received message:", content)
        print("Context:", context)
        
        if not content:
            return Response({'error': 'Message is required'}, 
                          status=status.HTTP_400_BAD_REQUEST)

        try:
            chat_handler = ChatHandler(chatbot_type=chatbot_type)
        except Exception as e:
            print("Failed to initialize ChatHandler:", str(e))
            return Response(
                {'error': 'Failed to initialize chat service. Please try again.'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        messages = []
        
        messages.append({
            'role': 'system',
            'content': f"""You are a helpful AI assistant. Remember these key points:
1. The user's name and personal details are important - use them naturally in conversation
2. Maintain context from the entire conversation history
3. If the user mentioned something earlier, refer back to it appropriately
4. Be consistent with previously shared information
5. Personalize your responses based on what you know about the user"""
        })
        
        messages.extend(context)
        
        messages.append({
            'role': 'user',
            'content': content
        })

        print("Sending to OpenAI with full context:", messages)
        
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
                'created_at': timezone.now(),
                'chatbot_type': chatbot_type
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
    try:
        conversations = Conversation.objects.filter(user=request.user).order_by('-created_at')
        
        history = []
        for conv in conversations:
            messages = conv.messages.all().order_by('created_at')
            for i in range(0, len(messages), 2):
                if i + 1 < len(messages):
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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_conversations(request):
    try:
        conversations = Conversation.objects.filter(
            user=request.user,
            is_visible=True
        ).order_by('-updated_at')
        
        conversation_list = []
        
        for conv in conversations:
            last_message = conv.messages.last()
            last_message_content = last_message.content if last_message else ""
            
            conversation_list.append({
                'id': conv.id,
                'title': conv.title,
                'lastMessage': last_message_content[:100] + '...' if len(last_message_content) > 100 else last_message_content,
                'timestamp': conv.updated_at
            })
        
        return Response(conversation_list, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_conversation(request):
    try:
        messages = request.data.get('messages', [])
        chatbot_type = request.data.get('chatType', 'general')

        if not messages:
            return Response({
                'message': 'No messages to save',
                'status': 'success'
            }, status=status.HTTP_200_OK)

        conversation = Conversation.objects.create(
            user=request.user,
            title="Temporary Title",  
            is_visible=True,
            chatbot_type=chatbot_type
        )

        for msg in messages:
            Message.objects.create(
                conversation=conversation,
                role=msg['role'],
                content=msg['content']
            )

        try:
            chat_handler = ChatHandler()
            conversation_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages[:3]])
            title_prompt = f"Based on this conversation, generate a short, descriptive title (max 50 chars):\n{conversation_text}"
            title = chat_handler.get_response([{'role': 'user', 'content': title_prompt}])
            
            title = title.strip('"').strip()
            if len(title) > 50:
                title = title[:47] + "..."
        except Exception as e:
            print("Error generating title:", str(e))
            title = messages[0]['content'][:47] + "..." if len(messages[0]['content']) > 50 else messages[0]['content']

        conversation.title = title
        conversation.save()

        return Response({
            'id': conversation.id,
            'title': conversation.title,
            'status': 'success'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print("Error in save_conversation:", str(e))
        return Response({
            'error': str(e),
            'status': 'error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_conversation_history(request, conversation_id):
    try:
        conversation = Conversation.objects.get(id=conversation_id, user=request.user)
        messages = conversation.messages.all().order_by('created_at')
        
        history = []
        for msg in messages:
            if msg.content.strip():
                history.append({
                    'id': msg.id,
                    'message': msg.content if msg.role == 'user' else '',
                    'response': msg.content if msg.role == 'assistant' else '',
                    'created_at': msg.created_at
                })
            
        return Response(history, status=status.HTTP_200_OK)
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clear_history(request):
    """Delete all conversations for the user"""
    try:
        Conversation.objects.filter(user=request.user).delete()
        return Response({'message': 'Chat history cleared successfully'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 