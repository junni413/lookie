# test_oos_logic.py
import sys
import os

# 프로젝트 루트 경로 추가 (모듈 import를 위해)
# sys.path.append(os.path.dirname(os.path.abspath(os.path.dirname(__file__))))

from src.oos.service import OOSService
from src.oos.repository import OOSRepository

# 1. 가짜 레포지토리 만들기 (DB 대신 이걸 씀)
class MockOOSRepository(OOSRepository):
    def get_all_data(self, item_id: int):
        # 시나리오 1: 지번 변경 (A-01 -> Z-99)
        if item_id == 101:
            return {
                "product": {"item_id": 101, "item_name": "사과", "current_location": "Z-99", "available_qty": 10, "reserved_qty": 0},
                "wms": {"log_id": 1, "from_loc": "A-01", "to_loc": "Z-99", "log_time": "2024-02-03 10:00:00"},
                "oms": None,
                "qms": None
            }
        
        # 시나리오 2: 품절 (재고 0, 출고 로그 있음)
        if item_id == 102:
            return {
                "product": {"item_id": 102, "item_name": "바나나", "current_location": "B-02", "available_qty": 0, "reserved_qty": 0},
                "wms": None,
                "oms": {"log_id": 2, "qty": 5, "status": "PICKED", "log_time": "2024-02-03 10:30:00"},
                "qms": None
            }

        # 시나리오 4: 유령 재고 (재고 있는데 없다고 함)
        if item_id == 104:
            return {
                "product": {"item_id": 104, "item_name": "귤", "current_location": "D-04", "available_qty": 5, "reserved_qty": 0},
                "wms": {"log_id": 4, "from_loc": "DOCK", "to_loc": "D-04", "log_time": "2024-02-02 09:00:00"},
                "oms": None,
                "qms": None
            }
        return None

# 2. 테스트 실행 함수
def run_test():
    print("🕵️‍♂️ [OOS AI 수사관] 모의 테스트 시작...\n")
    
    # 서비스에 가짜 리포지토리 바꿔치기 (Dependency Injection)
    service = OOSService()
    service.repo = MockOOSRepository() 

    # CASE 1: 지번 변경 테스트
    print("🔹 CASE 1: 작업자가 옛날 지번(A-01)을 스캔함")
    result = service.investigate(item_id=101, scanned_location="A-01")
    print(f"   => 결과: {result['decision']}")
    print(f"   => 멘트: {result['worker_message']}\n")

    # CASE 2: 품절 테스트
    print("🔹 CASE 2: 재고 없다고 신고함 (전산 재고 0)")
    result = service.investigate(item_id=102, scanned_location="B-02")
    print(f"   => 결과: {result['decision']}")
    print(f"   => 멘트: {result['worker_message']}\n")

    # CASE 4: 유령 재고 테스트
    print("🔹 CASE 4: 재고 없다고 신고함 (전산 재고 5)")
    result = service.investigate(item_id=104, scanned_location="D-04")
    print(f"   => 결과: {result['decision']}")
    print(f"   => 멘트: {result['worker_message']}\n")

if __name__ == "__main__":
    run_test()