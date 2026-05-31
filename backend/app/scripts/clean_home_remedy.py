from backend.app.utils.scripts.utils import process_dataset_in_chunks
rename_map = {"Symptom": "issue", "Remedy": "remedy"}
process_dataset_in_chunks("home_remedy", "data/raw/wellness/ayurvedic_remedies.csv", "data/processed/home_remedy.csv", rename_cols=rename_map)