from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, profile, chat, report

app = FastAPI(title="Multilingual Medical AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(profile.router, prefix="/api/profile", tags=["Profile"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(report.router, prefix="/api/report", tags=["Report"])

@app.get("/")
def health_check():
    return {"status": "Active", "system": "Medical Assistant"}