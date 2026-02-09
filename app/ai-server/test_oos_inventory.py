# test_oos_inventory.py
"""
OOS(Out of Stock) 판단 로직 테스트
재고 상태(inventoryState) 기반으로 AI가 어떤 판단을 내리는지 검증
"""
import asyncio
import json

# Mock logger for testing
class MockLogger:
    def info(self, msg): print(f"[INFO] {msg}")
    def warning(self, msg): print(f"[WARN] {msg}")
    def error(self, msg): print(f"[ERROR] {msg}")

# Standalone OOS judgment function (same logic as _handle_oos_case)
def judge_oos(issue_id: int, inventory_state: dict) -> dict:
    """
    재고 상태 기반 OOS 판단 (테스트용 독립 함수)
    """
    if not inventory_state:
        return {
            "issueId": issue_id,
            "aiDecision": "NEED_CHECK",
            "reasonCode": "NO_INVENTORY_DATA",
            "confidence": 0.0,
            "summary": "재고 상태 정보가 없습니다."
        }
    
    available = inventory_state.get("availableQty", 0)
    damaged_temp = inventory_state.get("damagedTempQty", 0)
    scanned_loc = inventory_state.get("scannedLocation")
    expected_loc = inventory_state.get("expectedLocation")
    
    # 1순위: 재고 있음
    if available > 0:
        return {
            "aiDecision": "NEED_CHECK",
            "reasonCode": "STOCK_EXISTS",
            "confidence": 0.95,
            "summary": f"가용 재고 {available}개 존재"
        }
    
    # 2순위: 위치 불일치
    if scanned_loc and expected_loc and scanned_loc != expected_loc:
        return {
            "aiDecision": "PASS",
            "reasonCode": "MOVE_LOCATION",
            "confidence": 0.90,
            "summary": f"상품이 {scanned_loc}에서 발견",
            "newLocation": {"locationCode": scanned_loc, "confidence": 0.95}
        }
    
    # 3순위: 파손 처리 중
    if damaged_temp > 0:
        return {
            "aiDecision": "NEED_CHECK",
            "reasonCode": "DAMAGED",
            "confidence": 0.85,
            "summary": f"파손 처리 중 {damaged_temp}개"
        }
    
    # 4순위: 판단 불가
    return {
        "aiDecision": "NEED_CHECK",
        "reasonCode": "UNKNOWN",
        "confidence": 0.0,
        "summary": "원인 파악 불가"
    }


def run_tests():
    print("=" * 60)
    print("🧪 OOS 판단 로직 테스트 시작")
    print("=" * 60)
    
    # Test Case 1: 재고 상태 정보 없음
    print("\n📋 CASE 1: inventoryState가 없는 경우")
    result = judge_oos(issue_id=1, inventory_state=None)
    print(f"   결과: {result['reasonCode']}")
    print(f"   판단: {result['aiDecision']}")
    assert result["reasonCode"] == "NO_INVENTORY_DATA", "CASE 1 FAILED"
    print("   ✅ PASSED")
    
    # Test Case 2: 재고 있음 (STOCK_EXISTS)
    print("\n📋 CASE 2: 가용 재고가 있는 경우")
    result = judge_oos(
        issue_id=2, 
        inventory_state={"availableQty": 5, "damagedTempQty": 0}
    )
    print(f"   결과: {result['reasonCode']}")
    print(f"   판단: {result['aiDecision']}")
    assert result["reasonCode"] == "STOCK_EXISTS", "CASE 2 FAILED"
    print("   ✅ PASSED")
    
    # Test Case 3: 위치 불일치 (MOVE_LOCATION)
    print("\n📋 CASE 3: 스캔 위치와 예상 위치가 다른 경우")
    result = judge_oos(
        issue_id=3, 
        inventory_state={
            "availableQty": 0, 
            "damagedTempQty": 0,
            "scannedLocation": "A-01-05",
            "expectedLocation": "A-01-01"
        }
    )
    print(f"   결과: {result['reasonCode']}")
    print(f"   판단: {result['aiDecision']}")
    print(f"   새 위치: {result.get('newLocation', {}).get('locationCode')}")
    assert result["reasonCode"] == "MOVE_LOCATION", "CASE 3 FAILED"
    assert result["aiDecision"] == "PASS", "CASE 3 aiDecision FAILED"
    print("   ✅ PASSED")
    
    # Test Case 4: 파손 처리 중 (DAMAGED)
    print("\n📋 CASE 4: 파손 처리 중인 재고가 있는 경우")
    result = judge_oos(
        issue_id=4, 
        inventory_state={
            "availableQty": 0, 
            "damagedTempQty": 2,
            "scannedLocation": "B-02-03",
            "expectedLocation": "B-02-03"  # 위치는 같음
        }
    )
    print(f"   결과: {result['reasonCode']}")
    print(f"   판단: {result['aiDecision']}")
    assert result["reasonCode"] == "DAMAGED", "CASE 4 FAILED"
    print("   ✅ PASSED")
    
    # Test Case 5: 원인 불명 (UNKNOWN)
    print("\n📋 CASE 5: 모든 조건에 해당하지 않는 경우 (진짜 품절)")
    result = judge_oos(
        issue_id=5, 
        inventory_state={
            "availableQty": 0, 
            "damagedTempQty": 0,
            "scannedLocation": "C-03-01",
            "expectedLocation": "C-03-01"
        }
    )
    print(f"   결과: {result['reasonCode']}")
    print(f"   판단: {result['aiDecision']}")
    assert result["reasonCode"] == "UNKNOWN", "CASE 5 FAILED"
    print("   ✅ PASSED")
    
    print("\n" + "=" * 60)
    print("🎉 모든 테스트 통과!")
    print("=" * 60)


if __name__ == "__main__":
    run_tests()
