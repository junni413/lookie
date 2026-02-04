# src/vision/service.py
import time
import io
import json
import logging
import httpx
from ultralytics import YOLO
from PIL import Image, UnidentifiedImageError
from src.core.config import BACKEND_URL, PRODUCT_CONFIG, GATE_MODEL_PATH

logger = logging.getLogger("AI_SERVER")

class VisionService:
    def __init__(self):
        self.gate_model = None
        self.defect_models = {}
        self.is_loaded = False
        self.client = None  # [변경 1] HTTP 클라이언트 멤버 변수 추가

    def load_models(self):
        """서버 시작 시 모델 로드 및 HTTP 클라이언트 초기화"""
        logger.info("🔄 [Startup] Loading AI Models & HTTP Client...")
        try:
            # 1. HTTP 클라이언트 생성 (Connection Pool 재사용)
            # timeout을 넉넉하게 설정
            self.client = httpx.AsyncClient(timeout=10.0) 

            # 2. 모델 로드 (기존 로직 동일)
            self.gate_model = YOLO(GATE_MODEL_PATH, task="detect")
            
            success_count = 0
            for pid, config in PRODUCT_CONFIG.items():
                try:
                    self.defect_models[pid] = YOLO(config["model_path"], task="detect")
                    success_count += 1
                except Exception as e:
                    logger.warning(f"⚠️ Model Load Failed: Product {pid} - {e}")

            if self.gate_model is not None:
                self.is_loaded = True
                logger.info(f"🚀 AI Server Ready! (Expert Models: {success_count})")
            else:
                self.is_loaded = False
                
        except Exception as e:
            logger.error(f"🔥 Startup Error: {e}")
            self.is_loaded = False

    async def unload_models(self): # [변경 2] async로 변경 (클라이언트 종료 대기)
        """서버 종료 시 리소스 정리"""
        if self.client:
            await self.client.aclose() # 커넥션 풀 정리
            logger.info("🛑 HTTP Client closed.")
        
        self.gate_model = None
        self.defect_models.clear()
        self.is_loaded = False
        logger.info("🛑 Models unloaded.")

    # =========================================================
    # [변경 3] 추론 단계별 Private Method 분리
    # =========================================================
    
    def _load_image(self, image_bytes: bytes) -> Image.Image:
        """이미지 바이트를 PIL 이미지로 변환 및 검증"""
        try:
            img = Image.open(io.BytesIO(image_bytes))
            img.verify() # 파일 깨짐 확인
            return Image.open(io.BytesIO(image_bytes)) # verify 후 다시 열어야 함
        except Exception as e:
            raise ValueError(f"IMAGE_LOAD_ERROR: {str(e)}")

    def _run_gatekeeper(self, img: Image.Image, config: dict) -> tuple[bool, float, list, float]:
        """1단계: 문지기 모델 추론"""
        t0 = time.perf_counter()
        results = self.gate_model(img, verbose=False, conf=0.25)
        elapsed = round(time.perf_counter() - t0, 4)

        is_pass = False
        max_conf = 0.0
        names = []

        for res in results:
            for box in res.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                name = self.gate_model.names[cls_id]
                names.append(f"{name}({conf:.2f})")
                
                if cls_id == config["gate_class_id"]:
                    is_pass = True
                    max_conf = max(max_conf, conf)
        
        return is_pass, max_conf, names, elapsed

    def _run_expert(self, img: Image.Image, model: YOLO) -> tuple[list, list, float, float]:
        """2단계: 전문가 모델 추론"""
        t1 = time.perf_counter()
        results = model(img, verbose=False, conf=0.5)
        elapsed = round(time.perf_counter() - t1, 4)

        max_conf = 0.0
        labels = []
        detections = []

        for res in results:
            for box in res.boxes:
                conf = float(box.conf[0])
                cls = int(box.cls[0])
                label = model.names[cls]
                
                max_conf = max(max_conf, conf)
                labels.append(f"{label}({conf:.2f})")
                
                detections.append({
                    "label": label,
                    "confidence": round(conf, 2),
                    "bbox": box.xyxy[0].tolist()
                })
        
        return labels, detections, max_conf, elapsed

    async def _download_image_from_url(self, image_url: str) -> bytes:
        """URL에서 이미지를 다운로드하여 bytes로 반환"""
        try:
            response = await self.client.get(image_url, timeout=10.0)
            response.raise_for_status()
            logger.info(f"📥 Image downloaded: {image_url}")
            return response.content
        except Exception as e:
            raise ValueError(f"IMAGE_DOWNLOAD_ERROR: {str(e)}")

    async def run_inference_from_url(
        self, 
        image_url: str, 
        product_id: int, 
        issue_id: int,
        issue_type: str = "DAMAGED"
    ):
        """URL 기반 추론 진입점"""
        if not self.is_loaded or self.gate_model is None:
            logger.error("❌ Inference blocked: Not loaded.")
            return

        logger.info(f"🔍 Inference started: issueId={issue_id}, productId={product_id}, issueType={issue_type}")

        try:
            # 1. 이미지 다운로드
            image_bytes = await self._download_image_from_url(image_url)
            
            # 2. issueType에 따라 분기
            if issue_type == "DAMAGED":
                await self._handle_damaged(image_bytes, product_id, issue_id)
            elif issue_type == "OUT_OF_STOCK":
                await self._handle_out_of_stock(image_bytes, product_id, issue_id)
            else:
                logger.warning(f"⚠️ Unknown issueType: {issue_type}, using DAMAGED logic")
                await self._handle_damaged(image_bytes, product_id, issue_id)
                
        except Exception as e:
            logger.error(f"🔥 Error in run_inference_from_url: {e}")
            await self._send_error_webhook(issue_id, str(e))

    async def _handle_damaged(self, image_bytes: bytes, product_id: int, issue_id: int):
        """DAMAGED 케이스: 기존 로직 (Gatekeeper → Expert)"""
        # 기존 run_inference 로직을 그대로 사용
        await self.run_inference(image_bytes, product_id, issue_id)

    async def _handle_out_of_stock(self, image_bytes: bytes, product_id: int, issue_id: int):
        """OUT_OF_STOCK 케이스: Gatekeeper만 실행"""
        start_time = time.perf_counter()
        webhook_payload = {
            "issueId": issue_id, 
            "aiDecision": "UNKNOWN", 
            "confidence": 0.0, 
            "summary": "", 
            "aiResult": ""
        }
        detail_data = {"detections": [], "time_info": {}, "error_log": None}

        try:
            # 1. 이미지 로드
            img = self._load_image(image_bytes)

            # 2. 설정 확인
            if product_id not in PRODUCT_CONFIG:
                raise ValueError(f"Unsupported Product ID: {product_id}")
            
            config = PRODUCT_CONFIG[product_id]
            
            # 3. Gatekeeper만 실행
            is_pass, gate_conf, gate_names, gate_time = self._run_gatekeeper(img, config)
            detail_data["time_info"]["gate"] = gate_time
            
            if is_pass:
                # 상품이 인식됨 → 재고 있음 → FAIL
                logger.info(f"🚪 OOS Check: FAIL (상품 발견) {gate_names}")
                webhook_payload.update({
                    "aiDecision": "FAIL",
                    "confidence": round(gate_conf, 2),
                    "summary": f"재고 없다고 했는데 상품이 있습니다. (감지: {', '.join(gate_names)})",
                    "reasonCode": "STOCK_EXISTS"
                })
            else:
                # 상품이 인식 안됨 → 재고 없음 확인 → PASS
                logger.info(f"✅ OOS Check: PASS (상품 없음 확인)")
                webhook_payload.update({
                    "aiDecision": "PASS",
                    "confidence": 0.0,
                    "summary": "재고 없음이 확인되었습니다."
                })

        except Exception as e:
            logger.error(f"🔥 Error in _handle_out_of_stock: {e}")
            webhook_payload["summary"] = str(e)
            detail_data["error_log"] = str(e)

        # 4. 결과 전송
        total_time = round(time.perf_counter() - start_time, 4)
        detail_data["time_info"]["total"] = total_time
        webhook_payload["aiResult"] = json.dumps(detail_data, ensure_ascii=False)
        
        await self._send_webhook(issue_id, webhook_payload)

    async def _send_error_webhook(self, issue_id: int, error_message: str):
        """에러 발생 시 웹훅 전송"""
        payload = {
            "issueId": issue_id,
            "aiDecision": "UNKNOWN",
            "confidence": 0.0,
            "summary": error_message,
            "aiResult": json.dumps({"error_log": error_message}, ensure_ascii=False)
        }
        await self._send_webhook(issue_id, payload)

    async def run_inference(self, image_bytes: bytes, product_id: int, issue_id: int):
        """메인 추론 오케스트레이터"""
        if not self.is_loaded or self.gate_model is None:
            logger.error("❌ Inference blocked: Not loaded.")
            return

        start_time = time.perf_counter()
        webhook_payload = {
            "issueId": issue_id, "aiDecision": "UNKNOWN", 
            "confidence": 0.0, "summary": "", "aiResult": ""
        }
        detail_data = {"detections": [], "time_info": {}, "error_log": None}

        try:
            # 1. 이미지 로드
            img = self._load_image(image_bytes)

            # 2. 설정 및 모델 확인
            if product_id not in PRODUCT_CONFIG:
                raise ValueError(f"Unsupported Product ID: {product_id}")
            if product_id not in self.defect_models:
                raise ValueError("Defect Model not loaded")

            config = PRODUCT_CONFIG[product_id]
            
            # 3. 문지기 추론 (_run_gatekeeper 호출)
            is_pass, gate_conf, gate_names, gate_time = self._run_gatekeeper(img, config)
            detail_data["time_info"]["gate"] = gate_time
            logger.info(f"🚪 Gate: {'PASS' if is_pass else 'REJECT'} {gate_names}")

            if not is_pass:
                webhook_payload.update({
                    "aiDecision": "NEED_CHECK",
                    "summary": f"상품 인식 실패 (감지됨: {gate_names})"
                })
            else:
                # 4. 전문가 추론 (_run_expert 호출)
                target_model = self.defect_models[product_id]
                defects, detections, defect_conf, defect_time = self._run_expert(img, target_model)
                detail_data["time_info"]["defect"] = defect_time
                detail_data["detections"] = detections

                if defects:
                    logger.info(f"🔍 Defect: {defects}")
                    webhook_payload.update({
                        "aiDecision": "FAIL",
                        "confidence": round(defect_conf, 2),
                        "summary": f"불량 검출: {', '.join(defects)}"
                    })
                else:
                    logger.info("✅ Clean")
                    webhook_payload.update({
                        "aiDecision": "PASS",
                        "confidence": round(gate_conf, 2),
                        "summary": "정상 상품입니다."
                    })

        except Exception as e:
            logger.error(f"🔥 Error: {e}")
            webhook_payload["summary"] = str(e)
            detail_data["error_log"] = str(e)

        # 5. 결과 전송
        total_time = round(time.perf_counter() - start_time, 4)
        detail_data["time_info"]["total"] = total_time
        webhook_payload["aiResult"] = json.dumps(detail_data, ensure_ascii=False)
        
        await self._send_webhook(issue_id, webhook_payload)

    async def _send_webhook(self, issue_id: int, payload: dict):
        """[변경 4] 생성된 client 재사용"""
        target_url = f"{BACKEND_URL}/api/issues/{issue_id}/ai/result"
        try:
            # self.client.post 사용 (with 구문 제거)
            resp = await self.client.post(target_url, json=payload)
            resp.raise_for_status()
            logger.info(f"🚀 Webhook Sent: {payload['aiDecision']}")
        except Exception as e:
            logger.error(f"❌ Webhook Failed: {e}")

vision_service = VisionService()