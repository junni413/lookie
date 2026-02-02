from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check_initial():
    # 테스트 환경에서는 모델 로딩을 Mocking하거나, 
    # 실제 로딩될 때까지 기다려야 하지만, 
    # 일단 서버가 응답(503이든 200이든)을 주는지를 확인
    response = client.get("/health")
    
    # 200(성공)이나 503(로딩중/실패) 둘 중 하나가 와야 서버가 뜬 것임
    # (아예 서버가 죽었으면 연결 거부됨)
    assert response.status_code in [200, 503]