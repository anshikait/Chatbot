from utils import process_dataset_in_chunks
if __name__ == "__main__":
    process_dataset_in_chunks("doctorqa", "data/raw/clinical/meddialog.csv", "data/processed/doctorqa.csv")