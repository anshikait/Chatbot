from utils import process_dataset_in_chunks
if __name__ == "__main__":
    process_dataset_in_chunks("medicine", "data/raw/clinical/drugbank.csv", "data/processed/medicine.csv")