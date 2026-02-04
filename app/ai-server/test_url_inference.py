"""
AI 서버 URL 기반 추론 테스트 스크립트
"""
import requests
import json

AI_SERVER_URL = "http://localhost:8000"

def test_damaged_case():
    """DAMAGED 케이스 테스트"""
    print("\n=== DAMAGED 케이스 테스트 ===")
    
    payload = {
        "imageUrl": "https://via.placeholder.com/640x480.png?text=Test+Image",
        "productId": 46,
        "issueId": 999,
        "issueType": "DAMAGED"
    }
    
    response = requests.post(f"{AI_SERVER_URL}/api/vision/predict", json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

def test_out_of_stock_case():
    """OUT_OF_STOCK 케이스 테스트"""
    print("\n=== OUT_OF_STOCK 케이스 테스트 ===")
    
    payload = {
        "imageUrl": "https://via.placeholder.com/640x480.png?text=Empty+Shelf",
        "productId": 46,
        "issueId": 1000,
        "issueType": "OUT_OF_STOCK"
    }
    
    response = requests.post(f"{AI_SERVER_URL}/api/vision/predict", json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

def test_default_case():
    """issueType 없이 테스트 (기본값 DAMAGED)"""
    print("\n=== issueType 없이 테스트 (기본값) ===")
    
    payload = {
        "imageUrl": "https://via.placeholder.com/640x480.png?text=Default",
        "productId": 46,
        "issueId": 1001
    }
    
    response = requests.post(f"{AI_SERVER_URL}/api/vision/predict", json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

def test_legacy_endpoint():
    """레거시 엔드포인트 (/predict) 테스트"""
    print("\n=== 레거시 엔드포인트 (/predict) 테스트 ===")
    
    payload = {
        "imageUrl": "https://via.placeholder.com/640x480.png?text=Legacy",
        "productId": 46,
        "issueId": 1002,
        "issueType": "DAMAGED"
    }
    
    response = requests.post(f"{AI_SERVER_URL}/predict", json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

if __name__ == "__main__":
    try:
        test_damaged_case()
        test_out_of_stock_case()
        test_default_case()
        test_legacy_endpoint()
        print("\n✅ 모든 테스트 요청 전송 완료!")
        print("백그라운드에서 추론이 진행되며, 결과는 Webhook으로 백엔드에 전송됩니다.")
    except Exception as e:
        print(f"\n❌ 테스트 실패: {e}")
