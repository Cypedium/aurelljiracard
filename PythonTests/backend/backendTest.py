import requests
import json
import os


# Set API_URL to target another environment, e.g. https://aurelljiraboard-backend.fly.dev
BASE_URL = os.environ.get("API_URL", "http://localhost:4000")

# Globala tokens
access_token = None
refresh_token = None


def pretty(res):
    """Snygg utskrift av svar."""
    print(f"Status: {res.status_code}")
    try:
        print(json.dumps(res.json(), indent=2, ensure_ascii=False))
    except:
        print(res.text)


def register_user():
    print("\n--- REGISTER USER ---")
    url = f"{BASE_URL}/auth/register"
    payload = {
    "username": "pythontest",
    "password": "test1234"
}
    res = requests.post(url, json=payload)
    pretty(res)


def login_user():
    print("\n--- LOGIN USER ---")
    global access_token, refresh_token

    url = f"{BASE_URL}/auth/login"
    payload = {
    "username": "pythontest",
    "password": "test1234"
}
    res = requests.post(url, json=payload)
    pretty(res)

    if res.status_code == 200:
        data = res.json()
        access_token = data.get("accessToken")
        refresh_token = data.get("refreshToken")
        print("\nTokens sparade:")
        print("accessToken:", access_token)
        print("refreshToken:", refresh_token)


def refresh_access_token():
    print("\n--- REFRESH TOKEN ---")
    global access_token

    url = f"{BASE_URL}/auth/refresh"
    payload = { "refreshToken": refresh_token }

    res = requests.post(url, json=payload)
    pretty(res)

    if res.status_code == 200:
        access_token = res.json().get("accessToken")
        print("\nNy accessToken sparad:", access_token)



def get_all_cards():
    print("\n--- GET ALL FEEDBACKS (protected) ---")
    url = f"{BASE_URL}/card"
    headers = {"Authorization": f"Bearer {access_token}"}
    res = requests.get(url, headers=headers)
    pretty(res)


def create_card():
    print("\n--- CREATE FEEDBACK (protected) ---")
    url = f"{BASE_URL}/card"
    headers = {"Authorization": f"Bearer {access_token}"}
    payload = {
        "rating": 4,
        "comment": "Test",
        "productId": "45",
        "username": "pythontest",
        "submittedAt": ""
    }
    res = requests.post(url, json=payload, headers=headers)
    pretty(res)


if __name__ == "__main__":
    print("🚀 Startar lokala backend‑tester med token‑stöd...\n")

    register_user()
    login_user()
    refresh_access_token()
    get_all_cards()
    create_card()

    print("\n🎉 Klart! Alla routes testade med token‑flöde.")
