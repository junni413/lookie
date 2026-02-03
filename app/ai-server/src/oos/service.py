# src/oos/service.py
import json
import logging
from openai import OpenAI
from src.core.config import GMS_API_KEY, GMS_BASE_URL, GMS_MODEL_NAME
# from src.core.config import OPENAI_API_KEY
from src.oos.repository import OOSRepository
from src.oos.prompt import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE

logger = logging.getLogger("AI_SERVER")

class OOSService:
    def __init__(self):
        self.repo = OOSRepository()
        # GMS 설정 적용
        if GMS_API_KEY:
            self.client = OpenAI(
                api_key=GMS_API_KEY,
                base_url=GMS_BASE_URL  # <--- 여기가 핵심! GMS 주소 연결
            )
            logger.info(f"✅ GMS AI Client Connected ({GMS_MODEL_NAME})")
            print(self.client.base_url)
        else:
            self.client = None
            logger.warning("⚠️ GMS API Key missing. LLM features disabled.")

    def investigate(self, item_id: int, scanned_location: str):
        # 1. 데이터 수집
        data = self.repo.get_all_data(item_id)
        if not data:
            return {"decision": "ERROR", "reason": "상품 정보 없음", "message": "상품을 찾을 수 없습니다."}

        prod = data["product"]
        
        # 2. 룰 기반 1차 진단 (Priority 1~4)
        decision, reason, evidence = self._apply_rules(prod, data, scanned_location)

        # 3. LLM을 이용한 RAG (자연어 생성)
        # LLM 키가 없거나 에러 시 rule 결과만 반환하도록 방어
        try:
            llm_result = self._generate_llm_response(decision, reason, evidence)
            return {
                "decision": decision,
                "evidence": evidence,
                "worker_message": llm_result.get("worker_message", reason),
                "admin_summary": llm_result.get("admin_summary", reason)
            }
        except Exception as e:
            logger.error(f"LLM Error: {e}")
            return {
                "decision": decision,
                "evidence": evidence,
                "worker_message": f"[시스템] {reason}", # LLM 실패 시 기본 메시지
                "admin_summary": reason
            }

    def _apply_rules(self, prod, data, scanned_loc):
        """우선순위 판단 알고리즘"""
        current_loc = prod["current_location"]
        avail_qty = prod["available_qty"]
        reserved_qty = prod["reserved_qty"]

        # ✅ 1순위: 지번 업데이트
        if scanned_loc != current_loc:
            return "LOCATION_UPDATED", \
                   f"상품 위치가 {current_loc}로 변경되었습니다.", \
                   {"log": data["wms"], "current_loc": current_loc}

        # ✅ 2순위: 실 재고 소진 (품절)
        if avail_qty <= 0 and data["oms"]:
            return "REAL_OOS", \
                   "정상 판매되어 품절된 상품입니다.", \
                   {"log": data["oms"], "avail_qty": avail_qty}

        # ✅ 3순위: 파손/검수 대기
        if avail_qty <= 0 and (reserved_qty > 0 or data["qms"]):
            return "PENDING_DAMAGED", \
                   "파손 심사 또는 보류 중인 상품입니다.", \
                   {"log": data["qms"], "reserved_qty": reserved_qty}

        # ✅ 4순위: 유령 재고 (도난 의심)
        if avail_qty > 0:
            return "GHOST_STOCK", \
                   "전산 재고는 있습니다. 분실이 의심됩니다.", \
                   {"last_inbound": data["wms"], "avail_qty": avail_qty}

        return "UNKNOWN", "원인 불명", {}

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

        return json.loads(response.choices[0].message.content)

oos_service = OOSService()