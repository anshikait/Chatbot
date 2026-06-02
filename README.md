# DoctorEase - Personalized Multilingual Medical AI Chatbot

An advanced, multimodal, and multilingual AI healthcare assistant designed to provide advisory guidance and wellness support. Built with **React, FastAPI, Groq LLM, Pinecone, and MongoDB**, this system utilizes a **Layered Retrieval-Augmented Generation (RAG)** architecture to deliver evidence-based clinical context alongside traditional wellness insights, tailored to the user's documented medical history.

---

## ✨ Key Features

- **🗣️ Multimodal Interaction:** Supports user inputs via Text, Voice (Whisper AI), Images (Groq Vision for skin analysis), and PDFs/Images (Tesseract OCR for lab reports).
- **🌍 Multilingual Support:** Configured to handle English, Hindi, Bengali, Tamil, Telugu, and Marathi, complete with localized speech-to-text and text-to-speech auto-playback.
- **🧠 Layered RAG Architecture:** Employs Pinecone Namespaces to separate **Clinical Evidence** (medical textbooks, drug data) from **Wellness Support** (Ayurveda, home remedies) to maintain clear contextual boundaries.
- **📂 Long-term Patient Memory:** Records user interactions and parsed medical reports into personalized vector memory and NoSQL storage to track historical ailments.
- **🏥 Nearby Hospital Locator:** Identifies potential emergency intents to render an interactive map (Leaflet.js & OpenStreetMap) showing nearby clinics using GPS coordinates.
- **🔐 Secure Authentication:** Includes JWT-based authentication, user registration, and protected medical profile management.
- **💬 Threaded Sessions:** A sidebar interface for managing multiple chat sessions and retrieving conversation history.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React.js (Vite)
- **Styling:** Tailwind CSS
- **Mapping:** React Leaflet & OpenStreetMap API
- **HTTP Client:** Axios
- **Routing:** React Router DOM

### Backend
- **Framework:** FastAPI & Uvicorn
- **AI/LLM:** Groq API (`llama3-70b-8192` & `llama-3.2-11b-vision-preview`)
- **Vector DB:** Pinecone (Semantic Memory & RAG)
- **NoSQL DB:** MongoDB Atlas (Authentication, Profiles, Chat Logs)
- **Embeddings:** SentenceTransformers (`all-MiniLM-L6-v2`)
- **Audio Processing:** Whisper API (STT), gTTS (TTS)

---

## 🏗️ System Architecture

```text
User Input (Voice/Text/Image/PDF)
      │
      ▼
React Frontend (Staging Area & Map Widget)
      │
      ▼
FastAPI Backend (Authentication & Orchestration)
      │
      ├──► Whisper API (Audio to Text)
      ├──► Tesseract OCR (Extract Report Text)
      ├──► Groq Vision (Image Analysis)
      │
      ▼
Retrieval Router (Intent Detection)
      ├──► Search Pinecone `clinical` namespace
      ├──► Search Pinecone `wellness` namespace (If requested)
      └──► Search Pinecone `memory` & `reports` namespace
      │
      ▼
Prompt Builder (Injects MongoDB User Profile + RAG Context)
      │
      ▼
Groq LLM (Generates JSON response: Text, Risk Level, Map Trigger)
      │
      ▼
React Frontend (Renders Text, Plays Audio, Opens Map if needed)
```

---

## 🚀 Local Setup & Installation

### Prerequisites
- **Node.js** (v18+)
- **Python** (v3.9+)
- **MongoDB** (Local instance or MongoDB Atlas URI)


### 1. Clone the Repository
```bash
git clone https://github.com/anshikait/Chatbot.git
cd Chatbot
```

### 2. Backend Setup
Navigate to the backend directory, set up a virtual environment, and install dependencies:
```bash
cd backend
python -m venv venv

# On Windows:
# venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Backend Environment Variables
Create a file named `.env` inside the `backend/` folder and configure the following parameters:
```ini
GROQ_API_KEY=your_groq_api_key
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=medical-rag
JWT_SECRET=your_super_secret_jwt_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
CORS_ORIGINS=http://localhost:5173
```

### 4. Run the Backend
Start the FastAPI development server:
```bash
uvicorn app.main:app --reload
```

### 5. Frontend Setup
Open a new terminal window, navigate to the frontend directory, and install dependencies:
```bash
cd frontend
npm install
```

Create a file named `.env` inside the `frontend/` folder:
```ini
VITE_API_URL=http://localhost:8000
```

### 6. Run the Frontend
Launch the development server:
```bash
npm run dev
```
The application will be accessible at `http://localhost:5173`.

---

## 🧠 Dataset Processing & RAG Ingestion Pipeline

To populate the vector database with medical and wellness domain knowledge:

1. Place your raw datasets in `backend/data/raw/clinical/` and `backend/data/raw/wellness/`.
2. Configure dataset mappings in `backend/scripts/config.yaml`.
3. Execute the cleaning scripts:
   ```bash
   python scripts/clean_symptoms.py
   python scripts/clean_ayurveda.py
   ```
4. Ingest the cleaned data into Pinecone. The script will automatically route items to their corresponding namespace:
   ```bash
   python scripts/ingest_to_pinecone.py --input data/processed/symptoms.csv
   ```

---

## 🌐 Production Deployment

- **Frontend (Vercel):** Connect your GitHub repository to Vercel. Set the **Framework Preset** to Vite and define `VITE_API_URL` in your Vercel Environment Variables.
- **Backend (Render):** Deploy as a Python Web Service. Set the build command to `pip install -r requirements.txt` and the start command to `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.

---

## ⚠️ Disclaimer

This application is designed as an advisory and triage tool for educational and supportive purposes. It implements strict safety guardrails and system prompts to minimize AI hallucinations, but it **is not a replacement for professional medical diagnosis, treatment, or clinical advice**. Users should always consult a qualified healthcare provider for medical concerns.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome. Feel free to check the issues page if you would like to help improve the project.

---

## 📝 License

This project is licensed under the [MIT License](LICENSE).
```
