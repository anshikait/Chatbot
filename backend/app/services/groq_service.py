import json
import re
from groq import Groq
from app.config import settings

client = Groq(api_key=settings.GROQ_API_KEY)

def generate_medical_response(system_prompt: str, user_query: str, base64_image: str = None) -> dict:
    # Update prompt to ask for 'needs_map' flag
    enhanced_prompt = system_prompt + """
    You must output ONLY valid JSON containing:
    {
      "response": "Your medical answer or skincare guidance",
      "risk_level": "LOW, MEDIUM, or HIGH",
      "explainability": "Sources and reasoning",
      "needs_map": true or false (Set to true ONLY if user asks for nearby clinics, hospitals, or doctors)
    }
    """

    # If image is uploaded, use Groq Vision model
    if base64_image:
        messages =[
            {"role": "system", "content": enhanced_prompt},
            {
                "role": "user",
                "content":[
                    {"type": "text", "text": user_query or "Analyze this image and explain possible causes and skincare guidance."},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}},
                ]
            }
        ]
        model = "llama-3.2-11b-vision-preview" # Groq vision model
    else:
        messages =[
            {"role": "system", "content": enhanced_prompt},
            {"role": "user", "content": user_query}
        ]
        model = "llama-3.3-70b-versatile"

    try:
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.3,
            # Note: Vision models sometimes reject JSON mode flag, so we manually parse
        )
        
        result_text = completion.choices[0].message.content
        
        # Regex to safely extract JSON if the model includes conversational text
        json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(0))
        return json.loads(result_text)
    
    except Exception as e:
        print(f"LLM Error: {e}")
        return {
            "response": "I'm sorry, I couldn't process that request properly.",
            "risk_level": "LOW",
            "explainability": str(e),
            "needs_map": False
        }