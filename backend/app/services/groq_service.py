# app/services/groq_service.py
import json
import re
from groq import Groq
from app.config import settings

client = Groq(api_key=settings.GROQ_API_KEY)

# ─────────────────────────────────────────────
# Model constants
# ─────────────────────────────────────────────
TEXT_MODEL   = "llama-3.3-70b-versatile"
VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"  # Using Groq's official vision model name


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
You are an expert dermatologist AI with 20+ years of experience.

Analyze the skin image in EXTREME DETAIL and provide a COMPREHENSIVE response:

1. **DETAILED VISUAL OBSERVATIONS**
   - Describe exact color (erythema level 1-5, pigmentation, blanching)
   - Texture (smooth, scaly, rough, hyperkeratotic, maceration, etc.)
   - Shape & borders (well-defined, irregular, serpiginous, linear, etc.)
   - Size measurements if visible
   - Distribution pattern (localized, widespread, flexural, extensor, etc.)
   - Associated features (exudate, crust, erosion, excoriation, lichenification)

2. **DIFFERENTIAL DIAGNOSIS** - List TOP 5 most likely conditions
   - For each: likelihood %, key differentiating features
   - Include: eczema, psoriasis, ringworm, acne, seborrheic keratosis, melanoma, contact dermatitis, urticaria, vitiligo, lichen planus, etc.
   - Explain why you think it's this vs. that

3. **SEVERITY ASSESSMENT**
   - Mild / Moderate / Severe / Critical
   - Surface area affected (% of body)
   - Impact on function/quality of life
   - Risk of secondary infection

4. **RED FLAGS FOR MALIGNANCY** (ABCDE criteria if applicable)
   - Asymmetry
   - Border irregularity
   - Color variation
   - Diameter > 6mm
   - Evolution / change over time

5. **IMMEDIATE MANAGEMENT**
   - OTC treatments (which specific creams, ointments, dosages)
   - Hygiene measures
   - What to AVOID (soap types, fabrics, triggers)
   - When to seek care urgently

6. **WHEN TO SEE DERMATOLOGIST**
   - URGENT (same day): if present
   - Within days: if present
   - Routine (within 2 weeks): if present
   - Or monitor at home

7. **SUPPORTIVE LIFESTYLE MEASURES**
   - Diet modifications
   - Environmental triggers to avoid
   - Sleep, stress, and lifestyle factors
   - Products recommended

Be SPECIFIC and THOROUGH. Do NOT say "I cannot diagnose" — give your best clinical assessment with appropriate caveats about needing in-person examination.
""",

    "LAB_REPORT": """
You are an expert clinical pathologist and laboratory medicine specialist.

Analyze the lab report image with EXTREME DETAIL and provide a COMPREHENSIVE, STRUCTURED response:

====================================================
SECTION 1: COMPLETE VALUE EXTRACTION
====================================================
Extract EVERY value visible. For each value list:
  - Name of test/parameter
  - Patient's value
  - Normal range (min-max)
  - Unit of measurement
  - Status: ✅ NORMAL or ⚠️ ABNORMAL (with how much above/below range)

====================================================
SECTION 2: ABNORMAL VALUES ANALYSIS
====================================================
For EACH abnormal value, provide:
  1. **What it measures** (in simple terms)
  2. **Patient's result vs Normal range** (show percentage above/below)
  3. **Clinical significance** (what does this mean medically?)
  4. **Possible causes** (at least 5-10 causes listed with brief explanation)
  5. **Affected systems/organs** (which body system does this indicate?)
  6. **Associated symptoms** patient might experience (if any)
  7. **Urgency level** (requires immediate action? or routine follow-up?)

====================================================
SECTION 3: NORMAL VALUES CONFIRMATION
====================================================
Briefly list which values are within normal range — this is reassuring for the patient.

====================================================
SECTION 4: PATTERN & SYNDROME ANALYSIS
====================================================
Look for patterns across multiple values:
- Do they suggest anemia? Explain what kind and severity.
- Do they suggest infection? What type (bacterial, viral)?
- Do they suggest metabolic disorder? Which one?
- Do they suggest organ dysfunction? Which organs?
- Any dangerous combinations or concerning trends?

====================================================
SECTION 5: RISK LEVEL ASSESSMENT
====================================================
Provide a detailed risk level:
  - LOW: All values normal, routine check-up
  - MEDIUM: Some abnormalities, needs attention but not emergency
  - HIGH: Serious abnormalities requiring urgent medical evaluation
  - CRITICAL: Life-threatening values, needs emergency care

Explain WHY you assigned this risk level (specific values that drove the decision).

====================================================
SECTION 6: RECOMMENDED INVESTIGATIONS
====================================================
List SPECIFIC follow-up tests that should be done:
  - Repeat this test in (how many weeks/months)
  - Additional tests needed to clarify findings (e.g., if low hemoglobin → do iron panel, B12, folate, reticulocyte count)
  - Specialist consultations (hematologist? endocrinologist? etc.)
  - Imaging if indicated

====================================================
SECTION 7: ACTIONABLE RECOMMENDATIONS
====================================================
Provide SPECIFIC, DETAILED recommendations:

IMMEDIATE (today):
  - Should they go to ER? Or can wait for appointment?
  - Any dietary changes needed urgently?
  - Any medicines to avoid?

SHORT-TERM (days-weeks):
  - Dietary modifications (specific foods: spinach, red meat, legumes for iron, etc.)
  - Lifestyle changes (rest, hydration, exercise level)
  - Monitoring (symptoms to watch for)
  - When to call doctor if worsening

LONG-TERM (weeks-months):
  - Ongoing monitoring plan
  - Prevention of recurrence
  - Follow-up labs schedule

====================================================
SECTION 8: PATIENT-FRIENDLY SUMMARY
====================================================
Explain in simple, non-technical language:
  - What the abnormal results mean in everyday terms
  - Why it happened (most likely cause)
  - What they need to do about it
  - Timeline for improvement
  - When to expect to feel better

====================================================
INSTRUCTIONS
====================================================
- Extract ALL numbers visible in the image accurately
- Be COMPREHENSIVE — this is not a quick summary
- Be SPECIFIC — avoid generic statements
- Show YOUR REASONING — explain how you concluded each point
- Connect findings to patient's profile (age, conditions, medications)
- Use structured formatting with bullet points and headers
- Estimate severity based on lab thresholds (not guessing)

This response should be detailed enough for patient to understand AND for their doctor to use in follow-up.
""",

    "XRAY_SCAN": """
You are an expert radiologist with 20+ years of experience reading medical imaging.

Analyze the medical scan image with EXTREME DETAIL and provide a COMPREHENSIVE response:

1. **SCAN IDENTIFICATION**
   - Type: X-ray / CT / MRI / Ultrasound / Other
   - Body part imaged
   - Quality of image (good, adequate, poor)
   - Orientation (AP/PA, lateral, oblique, etc.)

2. **NORMAL ANATOMY CONFIRMATION**
   - What you see that's normal and reassuring
   - Normal structures and their appearance
   - Proper alignment (if spine/bones)

3. **DETAILED FINDINGS**
   - Every abnormality noted with location, size, and characteristics
   - Fractures (if present): location, type (simple, compound, greenstick, comminuted), angulation, displacement
   - Shadows or opacities: location, size (measure if possible), density, borders
   - Masses: size, shape, margins (well-defined or infiltrative), density
   - Fluid collections: location, volume estimate, character
   - Misalignment or subluxation: degree of displacement
   - Soft tissue swelling: location, extent

4. **DIFFERENTIAL DIAGNOSIS**
   - Top 5 most likely diagnoses
   - For each: likelihood percentage and reasoning

5. **SEVERITY ASSESSMENT**
   - Mild / Moderate / Severe / Life-threatening

6. **URGENT RED FLAGS**
   - Does this require immediate intervention?
   - STAT CT/MRI needed?
   - Emergency surgery indicated?
   - Signs of infection, bleeding, or compartment syndrome?

7. **RECOMMENDED NEXT STEPS**
   - Additional imaging needed (type, urgency)
   - Specialist consultation (orthopedic, neurosurgeon, etc.)
   - Timeline for follow-up
   - Monitoring for complications

Be precise and thorough. This is a detailed radiological analysis, not a quick summary.
""",

    "PRESCRIPTION": """
You are an expert clinical pharmacist AI.

Analyze the prescription/medical document image with COMPLETE DETAIL:

1. **MEDICINE LIST EXTRACTION** (Exact as shown)
   - Medicine name (generic and brand if both shown)
   - Strength/dosage per unit
   - Form (tablet, capsule, injection, ointment, etc.)
   - Frequency (1x daily, 2x daily, every 6 hours, as needed, etc.)
   - Duration (how many days/weeks prescribed)
   - Instructions on container

2. **DETAILED MEDICINE INFORMATION**
   For each medicine:
   a) Primary indication (what it's used for)
   b) How it works (mechanism of action in simple terms)
   c) Common dosing (verify if this dose is standard or unusual)
   d) When to take it (with food? before bed? on empty stomach?)
   e) Common side effects (what patient might expect)
   f) Serious side effects (red flags to watch for)
   g) Monitoring needed (blood tests, check-ups while taking)

3. **DRUG INTERACTION ANALYSIS**
   - Check each combination of medicines for interactions
   - List any significant interactions found
   - Severity of each interaction (minor, moderate, severe)
   - Management (adjust dose? take at different times? switch medicine?)

4. **DIETARY & LIFESTYLE INTERACTIONS**
   - Foods to avoid (grapefruit, dairy, iron-rich foods, etc.)
   - Alcohol interactions
   - Caffeine interactions
   - Supplements to avoid

5. **MISSING OR UNCLEAR INFORMATION**
   - Illegible handwriting? What could it be?
   - Missing strength/dosage?
   - Unclear frequency?
   - No duration specified?

6. **COMPLIANCE TIPS**
   - Best way to remember to take these
   - Storage conditions
   - How to refill/continue medication
   - What to do if dose missed

7. **RED FLAGS & WHEN TO STOP**
   - Stop immediately if: (list any serious symptoms)
   - Stop if: (list moderate side effects patient shouldn't tolerate)
   - Adjust dose if: (certain conditions present)

8. **PATIENT-FRIENDLY SUMMARY**
   - Simple explanation of each medicine
   - Why they're being prescribed
   - What patient can expect
   - When to call doctor with concerns

Be COMPREHENSIVE and DETAILED. This is a detailed pharmacology review, not a quick read.
""",

    "OTHER_MEDICAL": """
You are a medical AI assistant with broad clinical knowledge.

Analyze this medical image/document with COMPLETE DETAIL:

1. **DOCUMENT IDENTIFICATION**
   - What type of document is this?
   - What medical information does it contain?
   - Who is it from (hospital, clinic, lab)?

2. **KEY INFORMATION EXTRACTION**
   - Extract ALL medical data visible
   - Dates, values, findings, recommendations
   - Patient information if visible

3. **CLINICAL INTERPRETATION**
   - What does this document mean medically?
   - Are there abnormal findings?
   - What conditions might this suggest?

4. **SIGNIFICANCE & URGENCY**
   - How important is this information?
   - Does it require urgent action?
   - What follow-up is needed?

5. **RECOMMENDATIONS**
   - Next steps for patient
   - Specialist referrals if needed
   - Further testing indicated
   - Timeline for follow-up

Be thorough and extract all visible information with clinical interpretation.
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
    language: str = "English",  # 🆕 ADDED THIS PARAMETER to fix the TypeError
) -> dict:
    """
    Generates a structured medical response.
    Includes bulletproof JSON parsing, language enforcement, and ultimate text fallback.
    """

    # 🆕 UPDATED: Added strict Language and Double Quotes enforcement
    json_format_instruction = f"""
CRITICAL INSTRUCTIONS:
1. You MUST respond STRICTLY in this language: {language.upper()}
2. You must output ONLY valid JSON.
3. You MUST use DOUBLE QUOTES (") for keys and string values.

Format exactly like this:
{{
  "response": "Your detailed medical answer (SHOULD BE COMPREHENSIVE AND DETAILED, NOT SHORT)",
  "risk_level": "LOW, MEDIUM, or HIGH",
  "explainability": "Sources and reasoning behind your answer",
  "needs_map": true or false,
  "image_type": "SKIN_DISEASE | LAB_REPORT | XRAY_SCAN | PRESCRIPTION | OTHER_MEDICAL | NON_MEDICAL | NONE"
}}
Set needs_map to true ONLY if user asks for nearby clinics/hospitals/doctors or it is a medical emergency.
Set image_type to NONE if no image was provided.

IMPORTANT: Your response field should be DETAILED, COMPREHENSIVE, and THOROUGH.
Use multiple paragraphs, bullet points, and structured formatting.
Do NOT provide short, generic responses. Do NOT add any conversational text outside the JSON block.
"""

    # ─────────────────────────────────────────
    # VISION FLOW — image was uploaded
    # ─────────────────────────────────────────
    if base64_image:
        image_type = detect_image_type(base64_image)
        print(f"[Image Classification] Detected type: {image_type}")

        image_system_prompt = IMAGE_PROMPTS.get(image_type, IMAGE_PROMPTS["OTHER_MEDICAL"])

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
        user_text = user_query or f"Please analyze this {image_type.replace('_', ' ').lower()} image in complete detail."

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
        temperature = 0.5  # 🆕 LOWERED to prevent language drifting
        max_tokens = 3000  

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
        temperature = 0.5  # 🆕 LOWERED to prevent language drifting
        max_tokens = 2000  

    # ─────────────────────────────────────────
    # Call Groq API & Robust JSON Parsing
    # ─────────────────────────────────────────
    try:
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        result_text = completion.choices[0].message.content.strip()
        parsed = None

        # 1. Clean up markdown wrappers if model used them (e.g., ```json)
        clean_text = result_text
        if clean_text.startswith("```json"): clean_text = clean_text[7:]
        if clean_text.startswith("```"): clean_text = clean_text[3:]
        if clean_text.endswith("```"): clean_text = clean_text[:-3]
        clean_text = clean_text.strip()

        # 2. Isolate the JSON block using RegEx
        json_match = re.search(r'\{[\s\S]*\}', clean_text)
        extracted_json = json_match.group(0) if json_match else clean_text

        # 3. Bulletproof Parsing Logic
        try:
            # First attempt: strict=False allows basic control characters
            parsed = json.loads(extracted_json, strict=False)
        except json.JSONDecodeError:
            print("⚠️ Standard JSON parse failed. Attempting string repair...")
            try:
                # Fix unescaped control characters
                repaired_json = extracted_json.replace('\n', '\\n').replace('\t', '\\t').replace('\r', '')
                parsed = json.loads(repaired_json, strict=False)
            except Exception as e:
                print(f"⚠️ JSON repair failed: {e}")
                pass

        # 4. 🆕 ULTIMATE FALLBACK: If JSON is totally broken, rescue the text!
        if not parsed or not isinstance(parsed, dict) or "response" not in parsed:
            print("⚠️ ULTIMATE FALLBACK: Model returned plain text instead of JSON. Wrapping text manually.")
            
            # Quickly scan the text to assign a pseudo risk level
            risk = "MEDIUM"
            if "CRITICAL" in result_text.upper() or "HIGH RISK" in result_text.upper(): risk = "HIGH"
            elif "LOW RISK" in result_text.upper() or "NORMAL" in result_text.upper(): risk = "LOW"
            
            # Manually build the JSON dictionary so React doesn't crash
            parsed = {
                "response": result_text, 
                "risk_level": risk,
                "explainability": "Analysis generated directly from model.",
                "needs_map": False,
                "image_type": image_type
            }

        # 5. Ensure image_type is present
        if "image_type" not in parsed:
            parsed["image_type"] = image_type

        return parsed

    except Exception as e:
        print(f"LLM Error: {e}")
        return {
            "response": f"I'm sorry, I encountered an error processing your detailed request. Please try asking again in {language}.",
            "risk_level": "LOW",
            "explainability": f"System parsing error: {str(e)}",
            "needs_map": False,
            "image_type": image_type if 'image_type' in locals() else "NONE",
        }