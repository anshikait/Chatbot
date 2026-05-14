from groq import Groq
from app.config import settings
import io

groq_client = Groq(api_key=settings.GROQ_API_KEY)

def transcribe_audio(audio_bytes: bytes, filename: str) -> str:
    # Groq Whisper API
    file_tuple = (filename, audio_bytes, "audio/mpeg")
    transcription = groq_client.audio.transcriptions.create(
        file=file_tuple,
        model="whisper-large-v3"
    )
    return transcription.text