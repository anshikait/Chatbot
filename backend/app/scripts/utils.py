import pandas as pd
import re
import html
import yaml
import os

def load_config():
    with open("scripts/config.yaml", "r") as f:
        return yaml.safe_load(f)

def clean_medical_text(text):
    """Normalizes medical text, decodes HTML entities, removes noise."""
    if pd.isna(text): return ""
    text = str(text).strip()
    text = html.unescape(text) # Vital for drug reviews (e.g., &#039; to ')
    text = re.sub(r'\s+', ' ', text) # Normalize whitespaces
    text = re.sub(r'[^\w\s.,;:()\-/%+]', '', text) # Keep clinical symbols
    return text

def process_dataset_in_chunks(dataset_key, input_path, output_path, rename_cols=None, chunksize=5000):
    config = load_config()['datasets'][dataset_key]
    req_cols = config['required_cols']
    template = config['semantic_template']
    
    print(f"\n🚀 Processing {dataset_key.upper()} -> Namespace: [{config['namespace']}]")
    
    total_before, total_after = 0, 0
    first_chunk = True

    # Read CSV in memory-efficient chunks
    for i, chunk in enumerate(pd.read_csv(input_path, chunksize=chunksize)):
        rows_before = len(chunk)
        total_before += rows_before
        
        # Rename columns if needed (e.g., input -> patient_query)
        if rename_cols:
            chunk = chunk.rename(columns=rename_cols)

        if i == 0:
            print(f"📊 Dataset Columns detected: {list(chunk.columns)}")
            missing = chunk[req_cols].isnull().sum()
            print(f"⚠️ Missing Values:\n{missing[missing > 0]}\n")

        # 1. Clean pipeline
        chunk = chunk.dropna(subset=req_cols)
        chunk = chunk.drop_duplicates()
        
        for col in req_cols:
            chunk[col] = chunk[col].apply(clean_medical_text)
            
        chunk = chunk[chunk[req_cols[0]] != ""] # Drop newly empty rows
        
        # 2. Semantic Mapping
        def make_semantic(row):
            format_dict = {col: row[col] for col in req_cols}
            return template.format(**format_dict)
            
        chunk['text'] = chunk.apply(make_semantic, axis=1)
        
        # 3. Add Structured Columns
        chunk['id'] = chunk.index.astype(str) + f"_{dataset_key}_{i}"
        chunk['namespace'] = config['namespace']
        chunk['layer'] = config['layer']
        chunk['category'] = config['category']
        chunk['source'] = config['source']
        
        processed_chunk = chunk[['id', 'text', 'namespace', 'layer', 'category', 'source']]
        total_after += len(processed_chunk)
        
        mode = 'w' if first_chunk else 'a'
        processed_chunk.to_csv(output_path, mode=mode, header=first_chunk, index=False)
        first_chunk = False
        
        print(f"Cleaning chunk {i+1}... ({len(processed_chunk)}/{rows_before} rows)")

    print(f"✅ {dataset_key.upper()} Complete! Rows: {total_before} -> {total_after}")