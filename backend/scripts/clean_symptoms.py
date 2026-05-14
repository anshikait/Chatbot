from utils import process_dataset_in_chunks
if __name__ == "__main__":
    process_dataset_in_chunks("symptoms", "data/raw/clinical/symptoms.csv", "data/processed/symptoms.csv")