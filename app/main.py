from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import traceback

from app.database.db import init_db
from app.api.upload   import router as upload_router
from app.api.chat     import router as chat_router
from app.api.summary  import router as summary_router
from app.api.citation import router as citation_router
from app.api.search   import router as search_router
from app.api.auth     import router as auth_router
from app.api.papers   import router as papers_router

load_dotenv()
init_db()

import os
import google.generativeai as genai

genai.configure(
    api_key=os.getenv("GEMINI_API_KEY")
)
app = FastAPI(
    title="AI Research Assistant",
    description="Upload research papers and interact with them using AI",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print("GLOBAL ERROR:", repr(exc))
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
        headers={"Access-Control-Allow-Origin": "*"}
    )

# Public routes
app.include_router(auth_router,    prefix="/api", tags=["Auth"])

# Protected routes
app.include_router(upload_router,  prefix="/api", tags=["Upload"])
app.include_router(chat_router,    prefix="/api", tags=["Chat"])
app.include_router(summary_router, prefix="/api", tags=["Summary"])
app.include_router(citation_router,prefix="/api", tags=["Citation"])
app.include_router(search_router,  prefix="/api", tags=["Search"])
app.include_router(papers_router,  prefix="/api", tags=["Papers"])

@app.get("/")
def root():
    return {
        "project": "AI Research Assistant",
        "developer": "Dev Aditya",
        "status": "Auth + All Phases Live ✅"
    }