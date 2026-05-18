from utils import process_dataset_in_chunks
# Mappings: input -> patient_query, output -> doctor_response
rename_map = {"input": "patient_query", "output": "doctor_response"}
process_dataset_in_chunks("doctorqa", "data/raw/clinical/chatdoctor.csv", "data/processed/doctorqa.csv", rename_cols=rename_map)