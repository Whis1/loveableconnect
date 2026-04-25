from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
import bcrypt
import requests
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ---------- Models ----------

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    bio: Optional[str] = ""
    age: Optional[int] = None
    gender: Optional[str] = None  # "donna", "uomo", "non-binary"
    city: Optional[str] = ""
    interests: List[str] = []
    photos: List[str] = []
    auth_provider: str = "email"  # "email" or "google"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    city: Optional[str] = None
    interests: Optional[List[str]] = None
    photos: Optional[List[str]] = None
    picture: Optional[str] = None


class LikeRequest(BaseModel):
    target_user_id: str


class MessageRequest(BaseModel):
    match_id: str
    content: str


# ---------- Helpers ----------

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def new_session_token() -> str:
    return f"sess_{uuid.uuid4().hex}{uuid.uuid4().hex}"


async def create_session(user_id: str) -> str:
    token = new_session_token()
    await db.user_sessions.insert_one({
        "session_token": token,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
    })
    return token


def set_session_cookie(response: Response, token: str):
    response.set_cookie(
        key="session_token",
        value=token,
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )


async def get_current_user(request: Request) -> User:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Non autenticato")

    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Sessione non valida")

    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Sessione scaduta")

    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Utente non trovato")
    return User(**user_doc)


def public_user(u: dict) -> dict:
    return {
        "user_id": u.get("user_id"),
        "name": u.get("name"),
        "picture": u.get("picture"),
        "bio": u.get("bio", ""),
        "age": u.get("age"),
        "gender": u.get("gender"),
        "city": u.get("city", ""),
        "interests": u.get("interests", []),
        "photos": u.get("photos", []),
    }


# ---------- Auth Routes ----------

@api_router.post("/auth/register")
async def register(payload: RegisterRequest, response: Response):
    existing = await db.users.find_one({"email": payload.email.lower()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email già registrata")

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": payload.email.lower(),
        "name": payload.name,
        "password_hash": hash_password(payload.password),
        "picture": None,
        "bio": "",
        "age": None,
        "gender": None,
        "city": "",
        "interests": [],
        "photos": [],
        "auth_provider": "email",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    token = await create_session(user_id)
    set_session_cookie(response, token)
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)
    return {"user": public_user(user_doc) | {"email": user_doc["email"]}, "session_token": token}


@api_router.post("/auth/login")
async def login(payload: LoginRequest, response: Response):
    user_doc = await db.users.find_one({"email": payload.email.lower()}, {"_id": 0})
    if not user_doc or not user_doc.get("password_hash"):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    if not verify_password(payload.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    token = await create_session(user_doc["user_id"])
    set_session_cookie(response, token)
    return {"user": public_user(user_doc) | {"email": user_doc["email"]}, "session_token": token}


# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
@api_router.post("/auth/session")
async def auth_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id mancante")

    try:
        r = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Errore OAuth: {e}")

    email = data.get("email", "").lower()
    name = data.get("name", "")
    picture = data.get("picture")
    session_token = data.get("session_token")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name or existing.get("name"), "picture": picture or existing.get("picture")}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "bio": "",
            "age": None,
            "gender": None,
            "city": "",
            "interests": [],
            "photos": [],
            "auth_provider": "google",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    # Use Google session token directly
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
    })
    set_session_cookie(response, session_token)

    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return {"user": public_user(user_doc) | {"email": user_doc["email"]}, "session_token": session_token}


@api_router.get("/auth/me")
async def me(user: User = Depends(get_current_user)):
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "password_hash": 0})
    return public_user(user_doc) | {"email": user_doc["email"]}


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ---------- Profile Routes ----------

@api_router.put("/users/me")
async def update_me(payload: ProfileUpdate, user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if update_data:
        await db.users.update_one({"user_id": user.user_id}, {"$set": update_data})
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "password_hash": 0})
    return public_user(user_doc) | {"email": user_doc["email"]}


# ---------- Bacheca ----------

@api_router.get("/users")
async def list_users(
    user: User = Depends(get_current_user),
    min_age: Optional[int] = Query(None),
    max_age: Optional[int] = Query(None),
    gender: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    interest: Optional[str] = Query(None),
):
    query: dict = {"user_id": {"$ne": user.user_id}}
    if min_age is not None or max_age is not None:
        age_q: dict = {}
        if min_age is not None:
            age_q["$gte"] = min_age
        if max_age is not None:
            age_q["$lte"] = max_age
        query["age"] = age_q
    if gender:
        query["gender"] = gender
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if interest:
        query["interests"] = {"$in": [interest]}

    docs = await db.users.find(query, {"_id": 0, "password_hash": 0}).limit(200).to_list(200)
    return [public_user(d) for d in docs]


@api_router.get("/users/{target_id}")
async def get_user(target_id: str, user: User = Depends(get_current_user)):
    doc = await db.users.find_one({"user_id": target_id}, {"_id": 0, "password_hash": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    return public_user(doc)


# ---------- Likes & Matches ----------

@api_router.post("/likes")
async def like_user(payload: LikeRequest, user: User = Depends(get_current_user)):
    if payload.target_user_id == user.user_id:
        raise HTTPException(status_code=400, detail="Non puoi mettere like a te stesso")

    target = await db.users.find_one({"user_id": payload.target_user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Utente non trovato")

    await db.likes.update_one(
        {"from_user": user.user_id, "to_user": payload.target_user_id},
        {"$set": {"from_user": user.user_id, "to_user": payload.target_user_id,
                  "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )

    # check reciprocal
    reciprocal = await db.likes.find_one({"from_user": payload.target_user_id, "to_user": user.user_id})
    if reciprocal:
        # create match if not exists
        ids = sorted([user.user_id, payload.target_user_id])
        match_id = f"match_{ids[0]}_{ids[1]}"
        existing = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
        if not existing:
            await db.matches.insert_one({
                "match_id": match_id,
                "users": ids,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        return {"liked": True, "match": True, "match_id": match_id, "with": public_user(target)}
    return {"liked": True, "match": False}


@api_router.get("/matches")
async def get_matches(user: User = Depends(get_current_user)):
    docs = await db.matches.find({"users": user.user_id}, {"_id": 0}).to_list(200)
    result = []
    for m in docs:
        other_id = next((uid for uid in m["users"] if uid != user.user_id), None)
        if not other_id:
            continue
        other = await db.users.find_one({"user_id": other_id}, {"_id": 0, "password_hash": 0})
        if other:
            result.append({
                "match_id": m["match_id"],
                "user": public_user(other),
                "created_at": m.get("created_at"),
            })
    return result


# ---------- Chat ----------

@api_router.get("/messages/{match_id}")
async def get_messages(match_id: str, user: User = Depends(get_current_user)):
    match = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
    if not match or user.user_id not in match["users"]:
        raise HTTPException(status_code=403, detail="Match non trovato")
    docs = await db.messages.find({"match_id": match_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return docs


@api_router.post("/messages")
async def send_message(payload: MessageRequest, user: User = Depends(get_current_user)):
    match = await db.matches.find_one({"match_id": payload.match_id}, {"_id": 0})
    if not match or user.user_id not in match["users"]:
        raise HTTPException(status_code=403, detail="Match non trovato")
    msg = {
        "message_id": f"msg_{uuid.uuid4().hex[:16]}",
        "match_id": payload.match_id,
        "from_user": user.user_id,
        "content": payload.content,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.messages.insert_one(msg)
    msg.pop("_id", None)
    return msg


@api_router.get("/")
async def root():
    return {"message": "Stelle Dating API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
