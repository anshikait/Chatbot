from backend.app.utils.scripts.utils import process_dataset_in_chunks
process_dataset_in_chunks("medquad", "data/raw/clinical/medquad.csv", "data/processed/medquad.csv")