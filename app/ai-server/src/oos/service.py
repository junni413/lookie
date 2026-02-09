# src/oos/service.py
import json
import logging
import httpx
from openai import OpenAI
from src.core.config import GMS_API_KEY, GMS_BASE_URL, GMS_MODEL_NAME, BACKEND_URL
from src.oos.prompt import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE

logger = logging.getLogger("AI_SERVER")

class OOSService:
    def __init__(self):
        # GMS 설정 적용
        if GMS_API_KEY:
            self.client = OpenAI(
                api_key=GMS_API_KEY,
                base_url=GMS_BASE_URL
            )
            logger.info(f"✅ GMS AI Client Connected ({GMS_MODEL_NAME})")
        else:
            self.client = None
            logger.warning("⚠️ GMS API Key missing. LLM features disabled.")

    def _generate_llm_response(self, decision, reason, evidence):
        """OpenAI GPT-4o-mini (또는 3.5) 호출"""
        if not self.client:
            raise Exception("OpenAI API Key missing")

        prompt = USER_PROMPT_TEMPLATE.format(
            decision=decision,
            reason=reason,
            evidence=json.dumps(evidence, default=str, ensure_ascii=False)
        )

        response = self.client.chat.completions.create(
            model="gpt-4o-mini", # 가성비 모델 추천
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"} # JSON 강제 출력
        )

        try:
            content = response.choices[0].message.content
            parsed = json.loads(content)
            
            # 자료형 체크 (dict)
            if not isinstance(parsed, dict):
                raise ValueError("LLM response is not a JSON object")
                
            # 필수 키 체크
            required_keys = ["worker_message", "admin_summary"]
            for key in required_keys:
                if key not in parsed:
                    raise ValueError(f"Missing required key: {key}")
            
            return parsed
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"LLM Response Parse Error: {e}")
            # 파싱 실패 시 기본값 리턴 (서비스 중단 방지)
            return {
                "worker_message": f"[시스템] 응답 형식이 올바르지 않습니다. (원인: {reason})",
                "admin_summary": f"LLM 파싱 에러: {str(e)}"
            }

    # =========================================================
    # 🔥 새로운 메서드: 백엔드가 inventoryState를 직접 전달하는 방식
    # =========================================================
    
    async def investigate_with_inventory(
        self, 
        issue_id: int, 
        product_id: int, 
        inventory_state: dict
    ):
        """
        백엔드에서 전달받은 재고 상태 기반 OOS 판단
        DB 조회 없이 inventoryState로 판단 후 Webhook 전송
        """
        logger.info(f"📦 [OOS] 판단 시작: issueId={issue_id}, inventoryState={inventory_state}")
        
        try:
            # 1. 룰 기반 판단 (inventoryState 기반)
            decision, reason, evidence = self._apply_inventory_rules(inventory_state)
            logger.info(f"📋 [OOS] 룰 판단 결과: {decision} - {reason}")
            
            # 2. LLM RAG 응답 생성 (기존 메서드 활용)
            try:
                llm_result = self._generate_llm_response(decision, reason, evidence)
                summary = llm_result.get("worker_message", reason)
                admin_summary = llm_result.get("admin_summary", reason)
            except Exception as e:
                logger.error(f"LLM Error (fallback to rule-based): {e}")
                summary = reason
                admin_summary = reason
            
            # 3. reasonCode 매핑 (백엔드 계약에 맞춤)
            reason_code = self._map_decision_to_reason_code(decision)
            
            # 4. Webhook 페이로드 구성
            payload = {
                "issueId": issue_id,
                "aiDecision": self._get_ai_decision(decision),
                "reasonCode": reason_code,
                "confidence": self._get_confidence(decision),
                "summary": summary,
                "aiResult": json.dumps({
                    "decision": decision,
                    "reason": reason,
                    "evidence": evidence,
                    "admin_summary": admin_summary
                }, default=str, ensure_ascii=False)
            }
            
            # 위치 변경인 경우 newLocation 추가
            if decision == "LOCATION_UPDATED":
                scanned_loc = inventory_state.get("scannedLocation")
                if scanned_loc:
                    payload["newLocation"] = {
                        "locationCode": scanned_loc,
                        "confidence": 0.95
                    }
            
            # 5. Webhook 전송
            await self._send_webhook(issue_id, payload)
            
        except Exception as e:
            logger.error(f"🔥 [OOS] Error: {e}")
            await self._send_error_webhook(issue_id, str(e))

    def _apply_inventory_rules(self, inventory_state: dict):
        """inventoryState 기반 OOS 판단 알고리즘"""
        if not inventory_state:
            return "UNKNOWN", "재고 상태 정보 없음", {}
        
        available = inventory_state.get("availableQty", 0)
        damaged_temp = inventory_state.get("damagedTempQty", 0)
        scanned_loc = inventory_state.get("scannedLocation")
        expected_loc = inventory_state.get("expectedLocation")
        last_event_type = inventory_state.get("lastEventType")
        
        # 1순위: 위치 불일치 (다른 지번에 있음)
        if scanned_loc and expected_loc and scanned_loc != expected_loc:
            return "LOCATION_UPDATED", \
                   f"상품이 {scanned_loc}에서 발견됨 (기존: {expected_loc}).", \
                   {"scannedLocation": scanned_loc, "expectedLocation": expected_loc}
        
        # 2순위: 원복 대기 중 (REVERT_DAMAGED 이벤트 발생)
        # 원복 중에는 availableQty가 증가할 수 있으므로 재고 체크보다 먼저 판단
        if last_event_type == "REVERT_DAMAGED":
            return "WAITING_RETURN", \
                   f"파손 원복 처리가 진행 중입니다. 잠시 후 재고가 복구됩니다.", \
                   {"lastEventType": last_event_type, "availableQty": available}
        
        # 3순위: 재고 있음 (유령 재고 / 전산 오류)
        if available > 0:
            return "GHOST_STOCK", \
                   f"전산상 가용 재고 {available}개 존재. 분실 또는 위치 오류 의심.", \
                   {"availableQty": available, "damagedTempQty": damaged_temp}
        
        # 4순위: 파손 처리 중
        if damaged_temp > 0:
            return "PENDING_DAMAGED", \
                   f"파손 처리 중인 재고 {damaged_temp}개 존재.", \
                   {"damagedTempQty": damaged_temp}
        
        # 5순위: 진짜 품절 (모든 재고 0)
        if available <= 0 and damaged_temp <= 0:
            return "REAL_OOS", \
                   "가용 재고가 없습니다. 품절 상태입니다.", \
                   {"availableQty": available}
        
        return "UNKNOWN", "원인 파악 불가", {}

    def _map_decision_to_reason_code(self, decision: str) -> str:
        """decision을 백엔드 계약의 reasonCode로 매핑"""
        mapping = {
            "GHOST_STOCK": "STOCK_EXISTS",      # 유령 재고 → 전산 오류
            "LOCATION_UPDATED": "MOVE_LOCATION", # 지번 이동
            "WAITING_RETURN": "WAITING_RETURN",  # 원복 대기 중
            "PENDING_DAMAGED": "DAMAGED",        # 파손 처리 중
            "REAL_OOS": "UNKNOWN",               # 진짜 품절 (원인 불명)
            "UNKNOWN": "UNKNOWN"
        }
        return mapping.get(decision, "UNKNOWN")

    def _get_ai_decision(self, decision: str) -> str:
        """decision을 aiDecision으로 변환"""
        if decision == "LOCATION_UPDATED":
            return "PASS"  # 위치 업데이트는 자동 처리 가능
        return "NEED_CHECK"  # 나머지는 관리자 확인 필요

    def _get_confidence(self, decision: str) -> float:
        """decision별 신뢰도 반환"""
        confidence_map = {
            "GHOST_STOCK": 0.95,
            "LOCATION_UPDATED": 0.90,
            "PENDING_DAMAGED": 0.85,
            "REAL_OOS": 0.80,
            "UNKNOWN": 0.0
        }
        return confidence_map.get(decision, 0.0)

    async def _send_webhook(self, issue_id: int, payload: dict):
        """Webhook 전송"""
        target_url = f"{BACKEND_URL}/api/issues/{issue_id}/ai/result"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(target_url, json=payload)
                resp.raise_for_status()
                logger.info(f"🚀 [OOS] Webhook Sent: {payload['aiDecision']} ({payload['reasonCode']})")
        except Exception as e:
            logger.error(f"❌ [OOS] Webhook Failed: {e}")

    async def _send_error_webhook(self, issue_id: int, error_message: str):
        """에러 발생 시 웹훅 전송"""
        payload = {
            "issueId": issue_id,
            "aiDecision": "NEED_CHECK",
            "reasonCode": "ERROR",
            "confidence": 0.0,
            "summary": f"AI 분석 중 오류 발생: {error_message}",
            "aiResult": json.dumps({"error": error_message}, ensure_ascii=False)
        }
        await self._send_webhook(issue_id, payload)

oos_service = OOSService()