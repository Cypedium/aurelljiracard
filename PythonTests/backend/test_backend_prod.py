import requests
import json
import os

# Set API_URL to target another environment, e.g. https://aurelljiraboard-backend.fly.dev
BASE_URL = os.environ.get("API_URL", "http://localhost:4000")

# ---------------------------------------------------
# 1. Helper: pretty print JSON
# ---------------------------------------------------
def print_json(data):
    try:
        print(json.dumps(data, indent=2, ensure_ascii=False))
    except:
        print(data)

# ---------------------------------------------------
# 2. Test unauthenticated routes
# ---------------------------------------------------
def test_public_routes():
    print("\n=== TEST: PUBLIC ROUTES ===")

    # Register
    print("\nPOST /auth/register")
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "email": "python_test@example.com",
        "password": "test1234"
    })
    print("Status:", res.status_code)
    print_json(res.json())

    # Login
    print("\nPOST /auth/login")
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "python_test@example.com",
        "password": "test1234"
    })
    print("Status:", res.status_code)
    login_data = res.json()
    print_json(login_data)

    access_token = login_data.get("accessToken")
    refresh_token = login_data.get("refreshToken")

    return access_token, refresh_token

# ---------------------------------------------------
# 3. Test authenticated routes
# ---------------------------------------------------
def test_private_routes(access_token):
    print("\n=== TEST: PRIVATE ROUTES ===")

    headers = {"Authorization": f"Bearer {access_token}"}

    # Kort ligger på en board: användarens egen board är först i GET /board
    print("\nGET /board")
    board_id = requests.get(f"{BASE_URL}/board", headers=headers).json()[0]["_id"]
    cards_url = f"{BASE_URL}/board/{board_id}/card"

    # GET cards
    print("\nGET /board/{id}/card")
    res = requests.get(cards_url, headers=headers)
    print("Status:", res.status_code)
    try:
        print_json(res.json())
    except:
        print(res.text)

    # POST card
    print("\nPOST /board/{id}/card")
    res = requests.post(cards_url, json={
        "message": "Python test card",
        "rating": 5
    }, headers=headers)
    print("Status:", res.status_code)
    created = res.json()
    print_json(created)

    card_id = created.get("id")

    # DELETE card
    if card_id:
        print(f"\nDELETE /board/{board_id}/card/{card_id}")
        res = requests.delete(f"{cards_url}/{card_id}", headers=headers)
        print("Status:", res.status_code)
        try:
            print_json(res.json())
        except:
            print(res.text)

# ---------------------------------------------------
# 4. Test refresh token
# ---------------------------------------------------
def test_refresh(refresh_token):
    print("\n=== TEST: REFRESH TOKEN ===")

    print("\nPOST /auth/refresh")
    res = requests.post(f"{BASE_URL}/auth/refresh", json={"refreshToken": refresh_token})
    print("Status:", res.status_code)
    print_json(res.json())
# ---------------------------------------------------
# 5. Run all tests
# ---------------------------------------------------
if __name__ == "__main__":
    print("🚀 Testing AurellCard backend...\n")
    access_token, refresh_token = test_public_routes()
    if access_token:
        test_private_routes(access_token)
    if refresh_token:
        test_refresh(refresh_token)
    print("\n🎉 Done! All routes tested.")
