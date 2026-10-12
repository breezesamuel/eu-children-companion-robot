"""AI Service - FastAPI server for children companion robot"""
import os
import json
import time
import logging
from typing import Optional, AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

from langchain_service import LangChainService
from langgraph_workflow import EducationWorkflow
from services.intent_recognizer import IntentRecognizer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-service")

# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    global llm_service, workflow, intent_rec
    llm_service = LangChainService({
        "default_provider": os.getenv("LLM_PROVIDER", "local"),
        "fallback_providers": ["openai", "deepseek", "claude"],
    })
    workflow = EducationWorkflow()
    intent_rec = IntentRecognizer()
    logger.info("AI service started, provider=%s", llm_service.config.get("default_provider"))
    yield
    logger.info("AI service shutting down")

app = FastAPI(title="RoboMate AI Service", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class ChatRequest(BaseModel):
    message: str
    child_id: str = "default"
    language: str = "en"
    template: str = "system_prompt"

class ChatStreamRequest(BaseModel):
    message: str
    child_id: str = "default"
    language: str = "en"

class IntentRequest(BaseModel):
    text: str
    language: str = "zh"

class LessonRequest(BaseModel):
    subject: str
    grade: str = "1"
    language: str = "en"
    child_id: str = "default"

class QuizRequest(BaseModel):
    subject: str
    grade: str = "1"
    count: int = 5
    language: str = "en"

class StoryRequest(BaseModel):
    topic: str
    age_group: str = "4-8"
    language: str = "en"
    moral: Optional[str] = None

class SentimentRequest(BaseModel):
    text: str

class WorkflowRequest(BaseModel):
    message: str
    session_id: str = "default"
    language: str = "en"

# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "ai-service",
        "version": "2.0.0",
        "llm_available": llm_service.is_available(),
        "intents_loaded": len(intent_rec.intents),
        "active_sessions": len(workflow.get_all_sessions()),
    }

# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------
@app.post("/chat")
async def chat(req: ChatRequest):
    try:
        intent_code, entities, confidence = intent_rec.recognize(req.message, req.language)
        response = await llm_service.generate_response(
            prompt=req.message,
            child_id=req.child_id,
            language=req.language,
            template_name=req.template,
        )
        return {
            "response": response.text,
            "intent": {"code": intent_code, "confidence": confidence, "entities": entities},
            "model": response.model,
            "tokens_used": response.tokens_used,
            "response_time_ms": response.response_time_ms,
        }
    except Exception as e:
        logger.exception("Chat error")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/stream")
async def chat_stream(req: ChatStreamRequest):
    async def event_stream():
        yield f"data: {json.dumps({'type':'start','child_id':req.child_id})}\n\n"
        async for chunk in llm_service.generate_stream(req.message, req.child_id, req.language):
            yield f"data: {json.dumps({'type':'chunk','text':chunk})}\n\n"
        yield f"data: {json.dumps({'type':'done'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

# ---------------------------------------------------------------------------
# Intent
# ---------------------------------------------------------------------------
@app.post("/intent")
async def recognize_intent(req: IntentRequest):
    try:
        code, entities, confidence = intent_rec.recognize(req.text, req.language)
        return {"intent": code, "confidence": confidence, "entities": entities}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/intents")
async def list_intents():
    return {"intents": [{"code": i.code, "name": i.name, "category": i.category} for i in intent_rec.intents]}

@app.get("/intents/category/{category}")
async def intents_by_category(category: str):
    items = [i for i in intent_rec.intents if i.category == category]
    return {"category": category, "count": len(items), "intents": items}

# ---------------------------------------------------------------------------
# Education
# ---------------------------------------------------------------------------
@app.post("/lesson")
async def generate_lesson(req: LessonRequest):
    try:
        result = await llm_service.generate_response(
            prompt=f"Create a {req.subject} lesson for grade {req.grade} student",
            child_id=req.child_id,
            language=req.language,
            template_name="education_lesson",
        )
        return {"lesson": result.text, "subject": req.subject, "grade": req.grade}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/quiz")
async def generate_quiz(req: QuizRequest):
    try:
        result = await llm_service.generate_response(
            prompt=f"Create {req.count} {req.subject} quiz questions for grade {req.grade}",
            child_id="quiz_gen",
            language=req.language,
            template_name="quiz_generation",
        )
        return {"quiz": result.text, "subject": req.subject, "count": req.count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/quiz/evaluate")
async def evaluate_answer(request: Request):
    body = await request.json()
    question = body.get("question", "")
    answer = body.get("answer", "")
    language = body.get("language", "en")
    result = await llm_service.generate_response(
        prompt=f"Question: {question}\nStudent answer: {answer}\nEvaluate and provide feedback.",
        child_id="eval",
        language=language,
        template_name="evaluation",
    )
    return {"evaluation": result.text}

# ---------------------------------------------------------------------------
# Story
# ---------------------------------------------------------------------------
@app.post("/story")
async def generate_story(req: StoryRequest):
    try:
        moral_part = f" with a moral about {req.moral}" if req.moral else ""
        result = await llm_service.generate_response(
            prompt=f"Tell a {req.age_group} children's story about {req.topic}{moral_part}",
            child_id="story_gen",
            language=req.language,
            template_name="story_prompt",
        )
        return {"story": result.text, "topic": req.topic, "age_group": req.age_group}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------------------------
# Sentiment
# ---------------------------------------------------------------------------
@app.post("/sentiment")
async def analyze_sentiment(req: SentimentRequest):
    try:
        result = await llm_service.generate_response(
            prompt=f"Analyze the emotion in this text and respond with one word (happy/sad/angry/fearful/surprised/disgusted/neutral): {req.text}",
            child_id="sentiment",
            language="en",
            template_name="sentiment",
        )
        return {"sentiment": result.text.strip().lower(), "text": req.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------------------------
# LangGraph workflow
# ---------------------------------------------------------------------------
@app.post("/workflow")
async def run_workflow(req: WorkflowRequest):
    try:
        wf_result = workflow.run_workflow(req.message, req.session_id)
        return {
            "success": wf_result.success,
            "response": wf_result.state.response,
            "intent": wf_result.state.intent,
            "steps": wf_result.execution_steps,
            "error": wf_result.error,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/workflow/sessions")
async def list_workflow_sessions():
    return {"sessions": workflow.get_all_sessions()}

@app.delete("/workflow/session/{session_id}")
async def clear_workflow_session(session_id: str):
    workflow.clear_session(session_id)
    return {"status": "cleared", "session_id": session_id}

# ---------------------------------------------------------------------------
# LLM provider management
# ---------------------------------------------------------------------------
@app.get("/providers")
async def list_providers():
    return {"providers": llm_service.list_providers(), "active": llm_service.config.get("default_provider")}

@app.post("/providers/set")
async def set_provider(request: Request):
    body = await request.json()
    provider = body.get("provider", "local")
    api_key = body.get("api_key", None)
    if api_key:
        os.environ[f"{provider.upper()}_API_KEY"] = api_key
    llm_service.set_provider(provider)
    return {"provider": provider, "available": llm_service.is_available()}

# ---------------------------------------------------------------------------
# Prompt templates management
# ---------------------------------------------------------------------------
@app.get("/templates")
async def list_templates():
    return {"templates": [{"name": t.name, "description": t.description, "variables": t.variables, "version": t.version} for t in llm_service.list_prompt_templates()]}

@app.post("/templates")
async def add_template(request: Request):
    body = await request.json()
    llm_service.add_prompt_template(
        name=body["name"],
        template=body["template"],
        description=body.get("description", ""),
        variables=body.get("variables", []),
        version=body.get("version", "1.0"),
    )
    return {"status": "added", "name": body["name"]}

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("AI_SERVICE_PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
