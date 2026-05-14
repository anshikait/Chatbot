from gtts import gTTS
import base64
import io

def text_to_speech_base64(text: str, lang_pref: str) -> str:
    # Basic mapping
    lang_map = {"English": "en", "Hindi": "hi", "Bengali": "bn", "Tamil": "ta", "Telugu": "te", "Marathi": "mr"}
    lang_code = lang_map.get(lang_pref, "en")
    
    tts = gTTS(text=text, lang=lang_code, slow=False)
    fp = io.BytesIO()
    tts.write_to_fp(fp)
    fp.seek(0)
    audio_base64 = base64.b64encode(fp.read()).decode('utf-8')
    return audio_base64