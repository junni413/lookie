from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# 1. 서버 헬스체크 테스트
def test_health_check():
    # main.py에 @app.get("/health") 또는 "/" 가 있어야 함
    response = client.get("/health") 
    assert response.status_code == 200
    # assert response.json() == {"status": "ok"} 

# 2. (선택) 모델 로드 테스트
# 모델 파일이 없으면 에러가 날 수 있으므로, try-except 처리하거나 Mocking 필요
# 여기서는 간단히 서버가 뜨는지만 확인해도 배포 사고의 90%는 막습니다.