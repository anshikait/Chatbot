import pandas as pd
import re
import yaml
import os

def load_config():
    with open("scripts/config.yaml", "r") as f:
        return yaml.safe_load(f)

def clean_medical_text(text):
    """Normalizes casing, strips spaces, and removes noisy characters safely."""
    if pd.isna(text):
        return ""
    text = str(text).strip()
    text = re.sub(r'\s+', ' ', text) # Remove extra spaces
    text = re.sub(r'[^\w\s.,;:()\-]', '', text) # Keep medical punctuation
    return text.lower().capitalize()

def process_dataset_in_chunks(dataset_key, input_path, output_path, chunksize=5000):
    """Reads large CSVs in chunks, cleans them, applies semantic transformation, and saves."""
    config = load_config()['datasets'][dataset_key]
    req_cols = config['required_cols']
    template = config['semantic_template']
    
    print(f"\n🚀 Starting processing for: {dataset_key.upper()}")
    
    total_before = 0
    total_after = 0
    first_chunk = True

    # Read in chunks to save memory
    for i, chunk in enumerate(pd.read_csv(input_path, chunksize=chunksize)):
        rows_before = len(chunk)
        total_before += rows_before
        
        if i == 0:
            print(f"📊 Columns detected: {list(chunk.columns)}")
            missing = chunk[req_cols].isnull().sum()
            print(f"⚠️ Missing values in critical columns:\n{missing[missing > 0]}\n")

        # 1. Drop Nulls in required columns
        chunk = chunk.dropna(subset=req_cols)
        
        # 2. Drop Duplicates
        chunk = chunk.drop_duplicates()
        
        # 3. Clean Text safely
        for col in req_cols:
            chunk[col] = chunk[col].apply(clean_medical_text)
            
        # Drop rows that became empty after regex cleaning
        chunk = chunk[chunk[req_cols[0]] != ""]
        
        # 4. Semantic Row Transformation
        # Dynamically inject row data into the YAML template
        def make_semantic(row):
            format_dict = {col: row[col] for col in req_cols}
            return template.format(**format_dict)
            
        chunk['semantic_text'] = chunk.apply(make_semantic, axis=1)
        
        # 5. Reset index and prepare for saving
        chunk = chunk.reset_index(drop=True)
        processed_chunk = chunk[['semantic_text']]
        total_after += len(processed_chunk)
        
        # Save to processed folder (Append mode for chunks)
        mode = 'w' if first_chunk else 'a'
        header = first_chunk
        processed_chunk.to_csv(output_path, mode=mode, header=header, index=False)
        first_chunk = False
        
        print(f"Processed chunk {i+1}... (Cleaned {len(processed_chunk)}/{rows_before} rows)")

    print(f"✅ Finished {dataset_key.upper()}. Total Rows: {total_before} -> {total_after} (Removed: {total_before - total_after})")