from utils import process_dataset_in_chunks
if __name__ == "__main__":
    process_dataset_in_chunks("ayurveda", "data/raw/wellness/ayush.csv", "data/processed/ayurveda.csv")