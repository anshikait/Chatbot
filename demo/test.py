import json
import pandas as pd

# Load JSON file
with open("symptomsDisease246k.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# Create formatted rows
rows = []

for item in data:
    rows.append({
    "disease": item["response"].strip(),
    "symptoms": item["query"].replace(" ,", ",").strip()
})

# Convert to DataFrame
df = pd.DataFrame(rows)

# Save CSV
df.to_csv("symptoms_dataset.csv", index=False)

print("CSV created successfully!")
print(df.head())