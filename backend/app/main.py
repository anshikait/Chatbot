# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware
# from app.routes import auth, profile, chat, report

# app = FastAPI(title="Multilingual Medical AI")

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:5173"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
# app.include_router(profile.router, prefix="/api/profile", tags=["Profile"])
# app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
# app.include_router(report.router, prefix="/api/report", tags=["Report"])

# @app.get("/")
# def health_check():
#     return {"status": "Active", "system": "Medical Assistant"}


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import os
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Medical Chatbot API",
    description="AI-powered multilingual medical assistant with RAG",
    version="1.0.0",
    docs_url="/docs",  # Swagger UI
    redoc_url="/redoc"  # ReDoc
)

# ============================================
# MIDDLEWARE: CORS (Cross-Origin Resource Sharing)
# ============================================
# Controls which frontend domains can call your backend

CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173",
    "https://doctorease-seven.vercel.app"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,  # Which domains allowed
    allow_credentials=True,       # Allow cookies/auth
    allow_methods=["*"],          # GET, POST, etc.
    allow_headers=["*"],          # Any headers
)

# ============================================
# MIDDLEWARE: Trusted Hosts
# ============================================
# Prevents Host header attacks

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[
        "localhost",
        "127.0.0.1",
        "https://doctorease.onrender.com",
    ]
)

# ============================================
# INCLUDE ROUTERS
# ============================================

from app.routes import auth, profile, chat, report

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(profile.router, prefix="/api/profile", tags=["Profile"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(report.router, prefix="/api/report", tags=["Report"])

# ============================================
# HEALTH CHECK ENDPOINT
# ============================================

@app.get("/")
async def health_check():
    """
    Health check endpoint
    Used by Render to verify app is running
    """
    return {
        "status": "Active",
        "system": "Medical Assistant API",
        "version": "1.0.0"
    }

# ============================================
# ROOT ENDPOINT
# ============================================

@app.get("/health")
async def detailed_health():
    """
    Detailed health check with dependencies
    """
    # Check MongoDB
    try:
        from app.services.mongo_service import client
        client.admin.command('ping')
        mongodb_status = "✅ Connected"
    except Exception as e:
        mongodb_status = f"❌ Error: {str(e)}"
    
    # Check Pinecone
    try:
        from app.services.pinecone_service import index
        index.describe_index_stats()
        pinecone_status = "✅ Connected"
    except Exception as e:
        pinecone_status = f"❌ Error: {str(e)}"
    
    return {
        "status": "Healthy",
        "mongodb": mongodb_status,
        "pinecone": pinecone_status,
        "environment": os.getenv("ENVIRONMENT", "development")
    }

# ============================================
# ERROR HANDLING
# ============================================

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """
    Catch-all exception handler
    Logs errors and returns user-friendly response
    """
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    
    return {
        "error": "Internal server error",
        "message": str(exc) if os.getenv("DEBUG") == "true" else "An error occurred"
    }

# ============================================
# STARTUP EVENTS
# ============================================

@app.on_event("startup")
async def startup_event():
    """
    Called when server starts
    Initialize connections, load models, etc.
    """
    logger.info("🚀 Medical Chatbot API starting...")
    logger.info(f"Environment: {os.getenv('ENVIRONMENT')}")
    logger.info(f"Debug mode: {os.getenv('DEBUG')}")

@app.on_event("shutdown")
async def shutdown_event():
    """
    Called when server shuts down
    Clean up connections
    """
    logger.info("🛑 Medical Chatbot API shutting down...")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=os.getenv("ENVIRONMENT") == "development"
    )