import pandas as pd
from backend.app.utils.scripts.utils import process_dataset_in_chunks

# Merge raw files first
train = pd.read_csv("data/raw/clinical/drugsComTrain_raw.csv")
test = pd.read_csv("data/raw/clinical/drugsComTest_raw.csv")
merged = pd.concat([train, test], ignore_index=True)
merged_path = "data/raw/clinical/drugsComMerged_raw.csv"
merged.to_csv(merged_path, index=False)

process_dataset_in_chunks("medicine", merged_path, "data/processed/medicine.csv")