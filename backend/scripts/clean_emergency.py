from utils import process_dataset_in_chunks
if __name__ == "__main__":
    process_dataset_in_chunks("emergency", "data/raw/clinical/mimic_triage.csv", "data/processed/emergency.csv")