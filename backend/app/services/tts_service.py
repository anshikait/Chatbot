from gtts import gTTS
"""
app/services/tts_service.py — Text-to-Speech with controls
Improved: Markdown cleaning, proper audio handling, unlimited length
"""

import io
import base64
import re

# ─────────────────────────────────────────────────────────────
# Markdown Cleaning
# ─────────────────────────────────────────────────────────────

def clean_markdown_for_tts(text: str) -> str:
    """
    Remove markdown formatting characters before TTS.
    
    Removes:
    - **bold** → bold
    - __italic__ → italic
    - ***bold italic*** → bold italic
    - `code` → code
    - # Headings → Headings
    - - Bullets → Bullets
    - > Quotes → Quotes
    - [links](url) → links
    - ![images](url) → images
    
    BUT KEEPS the actual words for TTS to read
    """
    
    # Remove bold (**text**)
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    
    # Remove italic (__text__)
    text = re.sub(r'__(.+?)__', r'\1', text)
    
    # Remove italic (*text*)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    
    # Remove code backticks (`code`)
    text = re.sub(r'`(.+?)`', r'\1', text)
    
    # Remove headings (# Heading → Heading)
    text = re.sub(r'^#+\s+', '', text, flags=re.MULTILINE)
    
    # Remove bullet points (- item → item)
    text = re.sub(r'^\s*[-*]\s+', '', text, flags=re.MULTILINE)
    
    # Remove numbered lists (1. item → item)
    text = re.sub(r'^\s*\d+\.\s+', '', text, flags=re.MULTILINE)
    
    # Remove blockquotes (> text → text)
    text = re.sub(r'^>\s+', '', text, flags=re.MULTILINE)
    
    # Remove link syntax ([text](url) → text)
    text = re.sub(r'\[(.+?)\]\(.+?\)', r'\1', text)
    
    # Remove image syntax (![alt](url) → alt)
    text = re.sub(r'!\[(.+?)\]\(.+?\)', r'\1', text)
    
    # Remove horizontal rules (---, ***, ___)
    text = re.sub(r'^\s*[-*_]{3,}\s*$', '', text, flags=re.MULTILINE)
    
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    
    # Remove extra whitespace
    text = re.sub(r'\n\n+', '\n', text)  # Multiple newlines → single
    text = re.sub(r'\s+', ' ', text)     # Multiple spaces → single
    text = text.strip()
    
    return text


# ─────────────────────────────────────────────────────────────
# Text-to-Speech Generation
# ─────────────────────────────────────────────────────────────

def text_to_speech_base64(text: str, language: str = "en") -> str:
    """
    Convert text to speech and return as base64 audio.
    
    ✅ Cleans markdown before TTS
    ✅ Handles full-length text (Truncation removed)
    ✅ Returns playable audio in browser
    
    Args:
        text: Text to convert to speech
        language: Language code (e.g., "en", "es", "fr", "hi")
    
    Returns:
        Base64 encoded MP3 audio data
    """
    
    try:
        # ✅ Clean markdown formatting
        clean_text = clean_markdown_for_tts(text)
        
        # Log that we are processing the FULL length
        print(f"🔊 Processing full TTS generation for {len(clean_text)} characters...")
        
        # Map language names to codes
        language_map = {
            "English": "en",
            "Spanish": "es",
            "French": "fr",
            "German": "de",
            "Italian": "it",
            "Portuguese": "pt",
            "Russian": "ru",
            "Japanese": "ja",
            "Korean": "ko",
            "Chinese": "zh",
            "Hindi": "hi",
            "Arabic": "ar",
        }
        
        # Use language code if provided, otherwise try to map
        lang_code = language_map.get(language, language)
        
        # Generate speech (gTTS will automatically chunk large texts internally to avoid API limits)
        tts = gTTS(text=clean_text, lang=lang_code, slow=False)
        
        # Save to bytes
        audio_fp = io.BytesIO()
        tts.write_to_fp(audio_fp)
        audio_fp.seek(0)
        
        # Encode to base64
        audio_base64 = base64.b64encode(audio_fp.getvalue()).decode('utf-8')
        
        print(f"✅ TTS successfully generated for full text: {len(clean_text)} chars")
        
        return audio_base64
    
    except Exception as e:
        print(f"❌ TTS Error: {e}")
        return ""  # Return empty string on error, won't play audio


# ─────────────────────────────────────────────────────────────
# Alternative: Silent mode (if gTTS fails)
# ─────────────────────────────────────────────────────────────

def is_tts_enabled() -> bool:
    """
    Check if TTS is enabled.
    Can be controlled via environment variable.
    """
    import os
    return os.getenv("ENABLE_TTS", "true").lower() == "true"