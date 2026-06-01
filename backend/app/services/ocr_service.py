# import pytesseract
# from pdf2image import convert_from_bytes
# from PIL import Image
# import io

# def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
#     text = ""
#     try:
#         if filename.lower().endswith(".pdf"):
#             images = convert_from_bytes(file_bytes)
#             for img in images:
#                 text += pytesseract.image_to_string(img) + "\n"
#         else:
#             image = Image.open(io.BytesIO(file_bytes))
#             text = pytesseract.image_to_string(image)
#     except Exception as e:
#         print(f"OCR Error: {e}")
#     return text.strip()


# app/services/ocr_service.py

def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    """
    Fallback service. PDF logic is now handled directly in chat.py 
    This prevents the pytesseract module crash on Render.
    """
    return "[File uploaded. Content processed via chat router.]"