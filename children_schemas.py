from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

class AuthRegisterRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=4, max_length=128)
    role: str = Field(default="child", pattern="^(child|parent|admin)$")
    name: Optional[str] = None
    age: Optional[int] = Field(None, ge=0, le=120)

class AuthLoginRequest(BaseModel):
    username: str
    password: str

class ChatRequest(BaseModel):
    user_id: str
    message: str
    session_id: Optional[str] = None
    mode: Optional[str] = "free"

class EducationExecuteRequest(BaseModel):
    skill_id: str
    params: Optional[Dict[str, Any]] = {}

class QuizSubmitRequest(BaseModel):
    user_id: str
    skill_id: str
    answers: List[Dict[str, Any]]

class LearningEnrollRequest(BaseModel):
    user_id: str
    course_id: str

class EmotionalAnalyzeRequest(BaseModel):
    user_id: str
    text: str
    context: Optional[Dict[str, Any]] = None

class DeviceControlRequest(BaseModel):
    command: str
    params: Optional[Dict[str, Any]] = {}

class SyncPushRequest(BaseModel):
    user_id: str
    data: Dict[str, Any]
    device_id: Optional[str] = None

class SearchRequest(BaseModel):
    q: str = Field(..., min_length=1, max_length=200)
    page: Optional[int] = Field(1, ge=1)
    size: Optional[int] = Field(10, ge=1, le=100)

class WebhookRegisterRequest(BaseModel):
    url: str = Field(..., max_length=500)
    events: List[str] = Field(..., min_length=1)
    secret: Optional[str] = Field(None, max_length=128)

class SessionCreateRequest(BaseModel):
    user_id: str
    role: str = Field(default="child", pattern="^(child|parent|admin)$")
    ttl_seconds: Optional[int] = Field(3600, ge=60, le=86400)

class ParentalScreenTimeRequest(BaseModel):
    user_id: str
    daily_limit_minutes: int = Field(..., ge=30, le=480)
    start_hour: Optional[int] = Field(8, ge=0, le=23)
    end_hour: Optional[int] = Field(20, ge=0, le=23)

class I18nTranslateRequest(BaseModel):
    key: str
    locale: str = "en"
    params: Optional[Dict[str, str]] = None

class NotificationSendRequest(BaseModel):
    user_id: str
    title: str
    message: str
    type: Optional[str] = "info"
    priority: Optional[int] = Field(0, ge=0, le=5)

class FileUploadResponse(BaseModel):
    code: int = 200
    file_id: str
    filename: str
    size: int
    url: str

class StatsResponse(BaseModel):
    code: int = 200
    data: Dict[str, Any]

class GDPRDataRequest(BaseModel):
    user_id: str
    include_emotions: bool = True
    include_learning: bool = True
    include_conversations: bool = False

class GDPRDeleteRequest(BaseModel):
    user_id: str
    confirmation: bool = False

class SubscriptionCreateRequest(BaseModel):
    user_id: str
    plan: str = Field(..., pattern="^(free|basic|premium|family)$")
    auto_renew: bool = True

class PaymentSimulateRequest(BaseModel):
    user_id: str
    amount: float = Field(..., gt=0)
    currency: str = "EUR"
    method: str = Field(default="card", pattern="^(card|paypal|transfer)$")
    description: Optional[str] = None
