import json
import re
from groq import Groq
from app.config import settings

client = Groq(api_key=settings.GROQ_API_KEY)

# ─────────────────────────────────────────────
# Model constants
# ─────────────────────────────────────────────
TEXT_MODEL   = "llama-3.3-70b-versatile"
VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"  # Groq vision model that actually supports images


# ─────────────────────────────────────────────
# Image-type detection prompt
# ─────────────────────────────────────────────
IMAGE_CLASSIFIER_PROMPT = """
You are a medical image triage assistant.
Look at the image and respond with ONLY one of these exact labels (no extra text):
  SKIN_DISEASE   - photo of skin, rash, wound, lesion, acne, mole, burn, etc.
  LAB_REPORT     - blood test, urine report, pathology report, CBC, lipid panel, etc.
  XRAY_SCAN      - X-ray, CT scan, MRI, ultrasound image
  PRESCRIPTION   - doctor's prescription, medicine list, discharge summary
  OTHER_MEDICAL  - any other medical document or image
  NON_MEDICAL    - not related to medicine at all
"""

# ─────────────────────────────────────────────
# Specialised system prompts per image type
# ─────────────────────────────────────────────
IMAGE_PROMPTS = {
    "SKIN_DISEASE": """
You are an expert dermatologist AI. Analyze the skin image carefully and provide:
1. **Possible Condition(s)** – list the most likely skin conditions (e.g., eczema, psoriasis, ringworm, acne, melanoma risk, contact dermatitis, etc.)
2. **Visual Observations** – describe what you see (color, texture, shape, distribution, size if estimable)
3. **Severity Assessment** – Mild / Moderate / Severe and why
4. **Immediate Care** – first-aid or OTC treatment advice
5. **Urgency Flag** – should they see a dermatologist urgently, within days, or routine?
6. **Red Flags** – any features that suggest malignancy or urgent referral
Be specific. Do NOT say "I cannot diagnose" — give your best clinical assessment with appropriate caveats.
""",

    "LAB_REPORT": """
You are an expert clinical pathologist AI. Analyze the lab report image and provide:
1. **Report Summary** – what type of test is this and what was measured
2. **Abnormal Values** – list every value that is outside the normal range, with the normal range shown
3. **Normal Values** – briefly confirm what is within range
4. **Clinical Interpretation** – what do the abnormal values suggest medically?
5. **Risk Level** – LOW / MEDIUM / HIGH with explanation
6. **Recommended Actions** – lifestyle changes, follow-up tests, or specialist referral
7. **Patient-Friendly Summary** – explain in simple language what this report means
Extract ALL numbers and values visible in the image. Be thorough.
""",

    "XRAY_SCAN": """
You are an expert radiologist AI. Analyze the medical scan image and provide:
1. **Scan Type** – identify if it is X-ray, CT, MRI, ultrasound, etc. and the body part
2. **Key Findings** – describe what you observe (density, shadows, fractures, masses, fluid, etc.)
3. **Abnormalities** – flag anything that appears abnormal and describe it precisely
4. **Possible Diagnosis** – list likely conditions based on the imaging findings
5. **Severity** – LOW / MEDIUM / HIGH
6. **Recommended Next Steps** – further imaging, specialist referral, or urgent care
Be precise and clinically detailed.
""",

    "PRESCRIPTION": """
You are an expert clinical pharmacist AI. Analyze the prescription/document image and provide:
1. **Medicines Listed** – extract every medicine name, dosage, and frequency visible
2. **Drug Purpose** – explain what each medicine is typically used for
3. **Important Instructions** – highlight any special instructions (with food, avoid alcohol, etc.)
4. **Drug Interactions** – flag any known interactions between the listed medicines
5. **Missing Information** – note if any critical information is missing or unclear
6. **Patient Summary** – explain the prescription in simple language
Extract all text visible in the image accurately.
""",

    "OTHER_MEDICAL": """
You are a medical AI assistant. Analyze this medical image/document and provide:
1. **Document Type** – identify what this image/document is
2. **Key Information** – extract and summarize all important medical information visible
3. **Clinical Relevance** – explain the medical significance
4. **Recommendations** – suggest appropriate next steps
Be thorough and extract all visible information.
""",

    "NON_MEDICAL": """
This image does not appear to be medical in nature. 
Politely inform the user that this image doesn't seem to be a medical image or document,
and ask them to upload a relevant medical image (skin photo, lab report, X-ray, prescription, etc.)
for proper analysis.
"""
}


def detect_image_type(base64_image: str) -> str:
    """
    Uses the vision model to classify what type of medical image was uploaded.
    Returns one of: SKIN_DISEASE, LAB_REPORT, XRAY_SCAN, PRESCRIPTION, OTHER_MEDICAL, NON_MEDICAL
    """
    try:
        completion = client.chat.completions.create(
            model=VISION_MODEL,
            messages=[
                {"role": "system", "content": IMAGE_CLASSIFIER_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "What type of medical image is this? Reply with only the label."},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}},
                    ]
                }
            ],
            temperature=0.1,
            max_tokens=20,
        )
        label = completion.choices[0].message.content.strip().upper()
        # Sanitize — pick the first matching known label
        for known in ["SKIN_DISEASE", "LAB_REPORT", "XRAY_SCAN", "PRESCRIPTION", "OTHER_MEDICAL", "NON_MEDICAL"]:
            if known in label:
                return known
        return "OTHER_MEDICAL"
    except Exception as e:
        print(f"Image type detection error: {e}")
        return "OTHER_MEDICAL"


def generate_medical_response(
    system_prompt: str,
    user_query: str,
    base64_image: str = None,
    image_mime: str = "image/jpeg",
) -> dict:
    """
    Generates a structured medical response.
    - If image is provided: detects image type → uses specialised vision prompt → VISION_MODEL
    - If text only: uses existing RAG system prompt → TEXT_MODEL
    """

    json_format_instruction = """
You must output ONLY valid JSON with these exact keys:
{
  "response": "Your detailed medical answer",
  "risk_level": "LOW, MEDIUM, or HIGH",
  "explainability": "Sources and reasoning behind your answer",
  "needs_map": true or false,
  "image_type": "SKIN_DISEASE | LAB_REPORT | XRAY_SCAN | PRESCRIPTION | OTHER_MEDICAL | NON_MEDICAL | NONE"
}
Set needs_map to true ONLY if user asks for nearby clinics/hospitals/doctors or it is a medical emergency.
Set image_type to NONE if no image was provided.
"""

    # ─────────────────────────────────────────
    # VISION FLOW — image was uploaded
    # ─────────────────────────────────────────
    if base64_image:
        # Step 1: Detect what kind of image this is
        image_type = detect_image_type(base64_image)
        print(f"[Image Classification] Detected type: {image_type}")

        # Step 2: Pick the specialised image analysis prompt
        image_system_prompt = IMAGE_PROMPTS.get(image_type, IMAGE_PROMPTS["OTHER_MEDICAL"])

        # Step 3: Combine with user profile/RAG context + JSON format
        combined_prompt = f"""
{image_system_prompt}

====================================================
ADDITIONAL PATIENT CONTEXT (from profile & history)
====================================================
{system_prompt}

====================================================
OUTPUT FORMAT
====================================================
{json_format_instruction}
"""
        # Step 4: Add image_type hint to user query
        user_text = user_query or f"Please analyze this {image_type.replace('_', ' ').lower()} image."

        messages = [
            {"role": "system", "content": combined_prompt},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_text},
                    {"type": "image_url", "image_url": {"url": f"data:{image_mime};base64,{base64_image}"}},
                ]
            }
        ]
        model = VISION_MODEL

    # ─────────────────────────────────────────
    # TEXT FLOW — no image
    # ─────────────────────────────────────────
    else:
        image_type = "NONE"
        enhanced_prompt = system_prompt + "\n\n" + json_format_instruction
        messages = [
            {"role": "system", "content": enhanced_prompt},
            {"role": "user", "content": user_query}
        ]
        model = TEXT_MODEL

    # ─────────────────────────────────────────
    # Call Groq API
    # ─────────────────────────────────────────
    try:
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.3,
        )

        result_text = completion.choices[0].message.content

        # Safely extract JSON even if model adds conversational wrapping
        json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group(0))
        else:
            parsed = json.loads(result_text)

        # Ensure image_type is always present in response
        if "image_type" not in parsed:
            parsed["image_type"] = image_type

        return parsed

    except Exception as e:
        print(f"LLM Error: {e}")
        return {
            "response": "I'm sorry, I couldn't process that request properly. Please try again.",
            "risk_level": "LOW",
            "explainability": str(e),
            "needs_map": False,
            "image_type": image_type,
        }
