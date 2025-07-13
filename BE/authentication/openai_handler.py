import openai
from django.conf import settings
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

class ChatHandler:
    CHATBOT_TYPES = {
        'general': {
            'prompt': """You are a helpful AI assistant. Your responses should be natural and conversational.
            Important:
                1. Remember and maintain context from the conversation history
                2. Remember personal details shared by the user (names, preferences, etc.)
                3. Use remembered information to provide personalized responses
                4. Be consistent with previously shared information
                5. If asked about something mentioned earlier in the conversation, refer back to it accurately""",
            'temperature': 0.7,
            'presence_penalty': 0.6,
            'frequency_penalty': 0.3
        },
        'travel': {
            'prompt': """You are a knowledgeable travel assistant. Help users plan their trips and provide detailed travel advice.
            Important:
                1. Remember user's travel preferences, constraints, and past trips
                2. Provide specific recommendations based on user's interests
                3. Consider seasonal factors and current travel conditions
                4. Maintain context of the travel planning discussion
                5. Offer practical tips and local insights
                6. Keep track of the trip itinerary being discussed""",
            'temperature': 0.7,
            'presence_penalty': 0.6,
            'frequency_penalty': 0.3
        },
        'learning': {
            'prompt': """You are an educational assistant focused on helping users learn and understand new concepts.
Important:
1. Remember user's learning goals and progress
2. Adapt explanations based on user's understanding level
3. Build upon previously discussed concepts
4. Provide examples that relate to user's interests
5. Break down complex topics into manageable parts
6. Encourage critical thinking and deeper understanding""",
            'temperature': 0.5,  # More focused responses
            'presence_penalty': 0.3,
            'frequency_penalty': 0.3
        },
        'coding': {
            'prompt': """You are a coding assistant helping users with programming and development.
Important:
1. Remember the programming languages and technologies being discussed
2. Maintain context of the codebase and architecture
3. Provide explanations along with code examples
4. Follow best practices and coding standards
5. Consider performance and security implications
6. Help debug issues by analyzing error messages and code context""",
            'temperature': 0.3, 
            'presence_penalty': 0.2,
            'frequency_penalty': 0.3
        }
    }

    def __init__(self, chatbot_type='general'):
        self.model = "gpt-3.5-turbo"
        
        if chatbot_type not in self.CHATBOT_TYPES:
            logger.warning(f"Unknown chatbot type '{chatbot_type}', falling back to 'general'")
            chatbot_type = 'general'
        
        config = self.CHATBOT_TYPES[chatbot_type]
        self.system_prompt = config['prompt']
        self.temperature = config['temperature']
        self.presence_penalty = config['presence_penalty']
        self.frequency_penalty = config['frequency_penalty']

        api_key = settings.OPENAI_API_KEY
        print("Using API key:", api_key[:10] + "..." if api_key else "None")
        if not api_key:
            logger.error("OpenAI API key is not set!")
            raise ValueError("OpenAI API key is not set in environment variables")
        
        try:
            openai.api_base = settings.OPENAI_API_BASE
            openai.api_key = api_key
            print(f"Using API base URL: {openai.api_base}")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {str(e)}")
            raise

    def format_messages(self, messages: List[Dict]) -> List[Dict]:
        formatted_messages = []
        
        if not messages or messages[0]['role'] != 'system':
            formatted_messages.append({
                "role": "system", 
                "content": f"{self.system_prompt}\n\nAdditional Instructions:\n1. Always use the user's name if they've shared it\n2. Refer back to previous parts of the conversation when relevant\n3. Build upon previously shared information\n4. Keep track of user preferences and details\n5. Be consistent with how you address the user"
            })
        
        for message in messages:
            if message['role'] in ['user', 'assistant', 'system']:
                if message['role'] == 'user' and any(intro in message['content'].lower() for intro in ['my name is', 'i am', "i'm", 'call me']):
                    formatted_messages.append({
                        "role": "system",
                        "content": "Remember this user's name and use it appropriately in future responses."
                    })
                
                formatted_messages.append({
                    "role": message['role'],
                    "content": message['content']
                })
        
        return formatted_messages

    def get_response(self, messages: List[Dict]) -> str:
        try:
            formatted_messages = self.format_messages(messages)
            logger.info(f"Sending request to OpenAI with {len(formatted_messages)} messages")
            print("Sending to OpenAI:", formatted_messages)
            
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=formatted_messages,
                temperature=self.temperature,
                max_tokens=1000,
                presence_penalty=self.presence_penalty,
                frequency_penalty=self.frequency_penalty
            )
            
            if not response.choices:
                raise ValueError("No response from OpenAI")
            
            print("Got response from OpenAI:", response.choices[0].message.content)    
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error in OpenAI API call: {str(e)}")
            print("OpenAI API Error:", str(e))
            if "api_key" in str(e).lower():
                return "Error: OpenAI API key is invalid or not properly configured."
            return f"Error: {str(e)}" 