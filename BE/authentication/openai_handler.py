import openai
from django.conf import settings
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

class ChatHandler:
    def __init__(self):
        self.model = "gpt-3.5-turbo"
        self.system_prompt = """You are a helpful AI assistant. Respond concisely and accurately to user queries."""
        api_key = settings.OPENAI_API_KEY
        print("Using API key:", api_key[:10] + "..." if api_key else "None")
        if not api_key:
            logger.error("OpenAI API key is not set!")
            raise ValueError("OpenAI API key is not set in environment variables")
        
        try:
            # Use the configured API base URL
            openai.api_base = settings.OPENAI_API_BASE
            openai.api_key = api_key
            print(f"Using API base URL: {openai.api_base}")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {str(e)}")
            raise

    def format_messages(self, messages: List[Dict]) -> List[Dict]:
        """Format messages for OpenAI API"""
        formatted_messages = [
            {"role": "system", "content": self.system_prompt}
        ]
        
        for message in messages:
            if message['role'] in ['user', 'assistant']:
                formatted_messages.append({
                    "role": message['role'],
                    "content": message['content']
                })
        
        return formatted_messages

    def get_response(self, messages: List[Dict]) -> str:
        """Get response from OpenAI API"""
        try:
            formatted_messages = self.format_messages(messages)
            logger.info(f"Sending request to OpenAI with {len(formatted_messages)} messages")
            print("Sending to OpenAI:", formatted_messages)
            
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=formatted_messages,
                temperature=0.7,
                max_tokens=1000
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