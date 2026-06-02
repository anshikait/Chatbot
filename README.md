# 🩺 Personalized Multilingual Medical AI Chatbot

[![Live Demo](https://img.shields.io/badge/Demo-Live%20Website-06B6D4?style=for-the-badge&logo=vercel&logoColor=white)](https://doctorease-seven.vercel.app/)

An advanced, multimodal, and multilingual AI healthcare assistant designed to provide advisory guidance and wellness support. Built with **React, FastAPI, Groq LLM, Pinecone, and MongoDB**, this system utilizes a **Layered Retrieval-Augmented Generation (RAG)** architecture to deliver evidence-based clinical context alongside traditional wellness insights, tailored to the user's documented medical history.

---

## 🛠️ Tech Stack

### Frontend
![React](https://img.shields.io/badge/React-1E1E2F?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-1E1E2F?style=for-the-badge&logo=vite&logoColor=646CFF)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-1E1E2F?style=for-the-badge&logo=tailwindcss&logoColor=06B6D4)
![Leaflet](https://img.shields.io/badge/Leaflet-1E1E2F?style=for-the-badge&logo=leaflet&logoColor=B9E026)
![React Router](https://img.shields.io/badge/React_Router-1E1E2F?style=for-the-badge&logo=reactrouter&logoColor=CA4245)

### Backend & AI Infrastructure
![FastAPI](https://img.shields.io/badge/FastAPI-1E1E2F?style=for-the-badge&logo=fastapi&logoColor=009688)
![Python](https://img.shields.io/badge/Python-1E1E2F?style=for-the-badge&logo=python&logoColor=3776AB)
![Groq LPU](https://img.shields.io/badge/Groq_LPU-1E1E2F?style=for-the-badge&logo=cpu&logoColor=F05023)
![Meta Llama](https://img.shields.io/badge/Meta_Llama-1E1E2F?style=for-the-badge&logo=meta&logoColor=044F8C)
![OpenAI Whisper](https://img.shields.io/badge/Whisper_AI-1E1E2F?style=for-the-badge&logo=openai&logoColor=412991)

### Databases & Vector Search
![Pinecone](https://img.shields.io/badge/Pinecone_DB-1E1E2F?style=for-the-badge&logo=database&logoColor=EC4899)
![MongoDB](https://img.shields.io/badge/MongoDB-1E1E2F?style=for-the-badge&logo=mongodb&logoColor=47A248)

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
      ├──► pypdf(Extract Report Text)
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
git clone https://github.com/anshikait/DoctorEase.git
cd DoctorEase
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

  > *Note: For production file uploads, integrate a cloud storage service (such as Cloudinary or AWS S3) to avoid data loss due to Render's ephemeral filesystem.*

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
