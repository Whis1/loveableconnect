"""Stelle Dating API – integration tests covering auth, profile, bacheca, likes/matches, chat."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://love-portal-pro.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

UNIQ = uuid.uuid4().hex[:8]
LUNA = {"email": f"luna_{UNIQ}@stelle.example.com", "password": "magicstar123", "name": "Luna"}
SOLE = {"email": f"sole_{UNIQ}@stelle.example.com", "password": "magicstar123", "name": "Sole"}


def _new_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def luna_session():
    s = _new_session()
    r = s.post(f"{API}/auth/register", json=LUNA, timeout=20)
    assert r.status_code == 200, f"register luna: {r.status_code} {r.text}"
    data = r.json()
    assert "session_token" in data and data["user"]["email"] == LUNA["email"].lower()
    s.headers.update({"Authorization": f"Bearer {data['session_token']}"})
    return s, data["user"], data["session_token"]


@pytest.fixture(scope="module")
def sole_session():
    s = _new_session()
    r = s.post(f"{API}/auth/register", json=SOLE, timeout=20)
    assert r.status_code == 200, f"register sole: {r.status_code} {r.text}"
    data = r.json()
    s.headers.update({"Authorization": f"Bearer {data['session_token']}"})
    return s, data["user"], data["session_token"]


# ---------- Auth ----------
class TestAuth:
    def test_register_duplicate_rejected(self, luna_session):
        s = _new_session()
        r = s.post(f"{API}/auth/register", json=LUNA, timeout=20)
        assert r.status_code == 400

    def test_login_valid(self):
        s = _new_session()
        r = s.post(f"{API}/auth/login", json={"email": LUNA["email"], "password": LUNA["password"]}, timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data["user"]["email"] == LUNA["email"].lower()
        assert "session_token" in data

    def test_login_invalid(self):
        s = _new_session()
        r = s.post(f"{API}/auth/login", json={"email": LUNA["email"], "password": "wrong"}, timeout=20)
        assert r.status_code == 401

    def test_me_with_bearer(self, luna_session):
        s, user, token = luna_session
        r = s.get(f"{API}/auth/me", timeout=20)
        assert r.status_code == 200
        assert r.json()["email"] == LUNA["email"].lower()

    def test_me_unauth(self):
        r = requests.get(f"{API}/auth/me", timeout=20)
        assert r.status_code == 401

    def test_logout(self):
        s = _new_session()
        r = s.post(f"{API}/auth/login", json={"email": LUNA["email"], "password": LUNA["password"]}, timeout=20)
        token = r.json()["session_token"]
        s.headers.update({"Authorization": f"Bearer {token}"})
        r2 = s.post(f"{API}/auth/logout", timeout=20)
        assert r2.status_code == 200
        # cookie cleared, but bearer also cleared on backend (session deleted)
        r3 = s.get(f"{API}/auth/me", timeout=20)
        assert r3.status_code == 401


# ---------- Profile ----------
class TestProfile:
    def test_update_profile_persists(self, luna_session):
        s, user, _ = luna_session
        payload = {
            "name": "Luna Stellata",
            "bio": "Sognatrice tra le stelle",
            "age": 28,
            "gender": "donna",
            "city": "Roma",
            "interests": ["astrologia", "musica"],
            "photos": ["https://example.com/luna.jpg"],
        }
        r = s.put(f"{API}/users/me", json=payload, timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "Luna Stellata"
        assert data["age"] == 28
        assert data["city"] == "Roma"

        # GET to verify persistence
        r2 = s.get(f"{API}/auth/me", timeout=20)
        d = r2.json()
        assert d["age"] == 28
        assert "astrologia" in d["interests"]


# ---------- Bacheca ----------
class TestBacheca:
    def test_list_users_excludes_self(self, luna_session, sole_session):
        s_sole, sole_user, _ = sole_session
        # Sole updates profile so filters can match
        s_sole.put(f"{API}/users/me", json={"age": 30, "gender": "uomo", "city": "Milano",
                                            "interests": ["arte"]}, timeout=20)
        s_luna, luna_user, _ = luna_session
        r = s_luna.get(f"{API}/users", timeout=20)
        assert r.status_code == 200
        users = r.json()
        ids = [u["user_id"] for u in users]
        assert luna_user["user_id"] not in ids
        assert sole_user["user_id"] in ids

    def test_filter_by_city(self, luna_session):
        s, _, _ = luna_session
        r = s.get(f"{API}/users?city=Milano", timeout=20)
        assert r.status_code == 200
        for u in r.json():
            assert "milano" in (u.get("city", "").lower())

    def test_filter_by_age_and_gender(self, luna_session):
        s, _, _ = luna_session
        r = s.get(f"{API}/users?min_age=25&max_age=35&gender=uomo", timeout=20)
        assert r.status_code == 200
        for u in r.json():
            assert u.get("gender") == "uomo"
            assert 25 <= (u.get("age") or 0) <= 35

    def test_get_user_by_id(self, luna_session, sole_session):
        s, _, _ = luna_session
        _, sole_user, _ = sole_session
        r = s.get(f"{API}/users/{sole_user['user_id']}", timeout=20)
        assert r.status_code == 200
        assert r.json()["user_id"] == sole_user["user_id"]


# ---------- Likes & Matches ----------
class TestLikesMatches:
    def test_like_and_match_flow(self, luna_session, sole_session):
        s_luna, luna_user, _ = luna_session
        s_sole, sole_user, _ = sole_session

        # Luna likes Sole — no match yet
        r1 = s_luna.post(f"{API}/likes", json={"target_user_id": sole_user["user_id"]}, timeout=20)
        assert r1.status_code == 200
        assert r1.json()["match"] is False

        # Sole likes Luna — match
        r2 = s_sole.post(f"{API}/likes", json={"target_user_id": luna_user["user_id"]}, timeout=20)
        assert r2.status_code == 200
        body = r2.json()
        assert body["match"] is True
        assert "match_id" in body

        # GET /api/matches for both
        rL = s_luna.get(f"{API}/matches", timeout=20)
        rS = s_sole.get(f"{API}/matches", timeout=20)
        assert rL.status_code == 200 and rS.status_code == 200
        assert any(m["user"]["user_id"] == sole_user["user_id"] for m in rL.json())
        assert any(m["user"]["user_id"] == luna_user["user_id"] for m in rS.json())

    def test_self_like_rejected(self, luna_session):
        s, user, _ = luna_session
        r = s.post(f"{API}/likes", json={"target_user_id": user["user_id"]}, timeout=20)
        assert r.status_code == 400


# ---------- Chat ----------
class TestChat:
    def test_send_and_fetch_messages(self, luna_session, sole_session):
        s_luna, luna_user, _ = luna_session
        s_sole, sole_user, _ = sole_session
        match_resp = s_luna.get(f"{API}/matches", timeout=20).json()
        assert match_resp, "expected at least one match from previous test"
        match_id = match_resp[0]["match_id"]

        r = s_luna.post(f"{API}/messages", json={"match_id": match_id, "content": "Ciao stella!"}, timeout=20)
        assert r.status_code == 200
        assert r.json()["content"] == "Ciao stella!"

        r2 = s_sole.post(f"{API}/messages", json={"match_id": match_id, "content": "Risplendi!"}, timeout=20)
        assert r2.status_code == 200

        rget = s_sole.get(f"{API}/messages/{match_id}", timeout=20)
        assert rget.status_code == 200
        msgs = rget.json()
        assert len(msgs) >= 2
        contents = [m["content"] for m in msgs]
        assert "Ciao stella!" in contents and "Risplendi!" in contents

    def test_chat_forbidden_for_non_member(self, luna_session, sole_session):
        # Create a third user and ensure they can't read the match
        s = _new_session()
        third = {"email": f"stranger_{UNIQ}@stelle.example.com", "password": "magicstar123", "name": "Stranger"}
        rr = s.post(f"{API}/auth/register", json=third, timeout=20)
        assert rr.status_code == 200
        s.headers.update({"Authorization": f"Bearer {rr.json()['session_token']}"})

        s_luna, _, _ = luna_session
        match_id = s_luna.get(f"{API}/matches", timeout=20).json()[0]["match_id"]
        r = s.get(f"{API}/messages/{match_id}", timeout=20)
        assert r.status_code == 403
