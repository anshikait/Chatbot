import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.pinecone_service import upsert_embedding

medical_data =[
    "Anemia is characterized by a lack of healthy red blood cells. Symptoms include fatigue, weakness, pale skin, and irregular heartbeats. Treatment often involves iron supplements.",
    "Hypertension, or high blood pressure, often has no symptoms but can lead to heart disease and stroke. Lifestyle changes and medication are common treatments.",
    "Type 2 Diabetes occurs when the body becomes resistant to insulin. Symptoms include increased thirst, frequent urination, and fatigue. Management includes diet, exercise, and insulin therapy.",
    "Chest pain accompanied by shortness of breath and left arm pain is a HIGH medical risk and indicates a possible heart attack. Immediate emergency care is required."
]

def run_ingestion():
    print("Starting ingestion...")
    for idx, text in enumerate(medical_data):
        print(f"Ingesting doc {idx+1}/{len(medical_data)}...")
        # Note: user_id="general" means this is accessible to everyone
        upsert_embedding(user_id="general", doc_type="medical", text=text)
    print("Ingestion complete!")

if __name__ == "__main__":
    run_ingestion()