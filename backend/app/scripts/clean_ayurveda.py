import pandas as pd
from backend.app.utils.scripts.utils import process_dataset_in_chunks

ayur1 = pd.read_csv("data/raw/wellness/Ayurved1.csv")
ayur2 = pd.read_csv("data/raw/wellness/Ayurved2.csv")
merged = pd.concat([ayur1, ayur2], ignore_index=True)
merged_path = "data/raw/wellness/AyurvedaMerged.csv"
merged.to_csv(merged_path, index=False)

# Mappings: human -> condition, ai -> treatment
rename_map = {"human": "condition", "ai": "treatment"}
process_dataset_in_chunks("ayurveda", merged_path, "data/processed/ayurveda.csv", rename_cols=rename_map)