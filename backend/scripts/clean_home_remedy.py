from utils import process_dataset_in_chunks
if __name__ == "__main__":
    process_dataset_in_chunks("home_remedy", "data/raw/wellness/remedies.csv", "data/processed/home_remedy.csv")