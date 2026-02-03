# src/vision/service.py
import time
import io
import json
import logging
import httpx
from ultralytics import YOLO
from PIL import Image, UnidentifiedImageError
from src.core.config import BACKEND_URL, PRODUCT_CONFIG, GATE_MODEL_PATH

# 로거 설정
logger = logging.getLogger("AI_SERVER")

class VisionService:
    def __init__(self):
        self.gate_model = None
        self.defect_models = {}
        self.is_loaded = False

    def load_models(self):
        """서버 시작 시 모델을 로드하는 함수 (Lifespan에서 호출)"""
        logger.info("🔄 [Startup] Loading AI Models...")
        try:
            # 1. 문지기 모델
            self.gate_model = YOLO(GATE_MODEL_PATH, task="detect")
            logger.info("✅ Gatekeeper Model Loaded")

            # 2. 전문가 모델
            success_count = 0
            for pid, config in PRODUCT_CONFIG.items():
                try:
                    self.defect_models[pid] = YOLO(config["model_path"], task="detect")
                    logger.info(f"✅ Defect Model Loaded: Product {pid}")
                    success_count += 1
                except Exception as e:
                    logger.warning(f"⚠️ Model Load Failed: Product {pid} - {e}")

            if self.gate_model is not None:
                self.is_loaded = True
                logger.info(f"🚀 AI Server Ready! (Expert Models: {success_count})")
            else:
                logger.error("❌ Gatekeeper Model Load Failed!")
                self.is_loaded = False
                
        except Exception as e:
            logger.error(f"🔥 Critical Error during Model Loading: {e}")
            self.is_loaded = False

    def unload_models(self):
        """서버 종료 시 정리"""
        self.gate_model = None
        self.defect_models.clear()
        self.is_loaded = False
        logger.info("🛑 Models unloaded.")

    async def run_inference(self, image_bytes: bytes, product_id: int, issue_id: int):
        """실제 추론 및 웹훅 전송 로직"""
        if not self.is_loaded or self.gate_model is None:
            logger.error("❌ Inference blocked: Models are not loaded.")
            return

        start_time = time.perf_counter()
        logger.info(f"============ [Start Analysis] IssueID: {issue_id} / ProductID: {product_id} ============")

        webhook_payload = {
            "issueId": issue_id,
            "aiDecision": "UNKNOWN",
            "confidence": 0.0,
            "summary": "",
            "aiResult": ""
        }
        detail_data = {"detections": [], "time_info": {}, "error_log": None}

        try:
            # (Step A) 이미지 로드
            try:
                img = Image.open(io.BytesIO(image_bytes))
                img.verify()
                img = Image.open(io.BytesIO(image_bytes))
            except Exception as e:
                raise ValueError(f"IMAGE_LOAD_ERROR: {str(e)}")

            # (Step B) 설정 확인
            if product_id not in PRODUCT_CONFIG:
                webhook_payload["summary"] = f"지원하지 않는 상품 (ID: {product_id})"
                logger.warning(f"⚠️ Unsupported Product ID: {product_id}")
            elif product_id not in self.defect_models:
                webhook_payload["summary"] = "AI 모델 파일 없음"
                logger.error(f"❌ Model missing for ID {product_id}")
            else:
                config = PRODUCT_CONFIG[product_id]
                target_model = self.defect_models[product_id]
                
                # (Step C) 문지기 추론
                t0 = time.perf_counter()
                gate_results = self.gate_model(img, verbose=False, conf=0.25)
                detail_data["time_info"]["gate"] = round(time.perf_counter() - t0, 4)

                is_gate_pass = False
                max_gate_conf = 0.0
                detected_names = []

                for res in gate_results:
                    for box in res.boxes:
                        cls_id = int(box.cls[0])
                        conf = float(box.conf[0])
                        name = self.gate_model.names[cls_id]
                        detected_names.append(f"{name}({conf:.2f})")
                        
                        if cls_id == config["gate_class_id"]:
                            is_gate_pass = True
                            max_gate_conf = max(max_gate_conf, conf)

                logger.info(f"🚪 Gatekeeper Result: {'PASS' if is_gate_pass else 'REJECT'} {detected_names}")

                if not is_gate_pass:
                    webhook_payload["aiDecision"] = "NEED_CHECK"
                    webhook_payload["summary"] = f"상품 인식 실패 (감지됨: {detected_names})"
                else:
                    # (Step D) 전문가 추론
                    t1 = time.perf_counter()
                    defect_results = target_model(img, conf=0.5)
                    detail_data["time_info"]["defect"] = round(time.perf_counter() - t1, 4)

                    max_defect_conf = 0.0
                    defect_labels = []

                    for res in defect_results:
                        for box in res.boxes:
                            conf = float(box.conf[0])
                            cls = int(box.cls[0])
                            label = target_model.names[cls]
                            
                            max_defect_conf = max(max_defect_conf, conf)
                            defect_labels.append(f"{label}({conf:.2f})")
                            
                            detail_data["detections"].append({
                                "label": label,
                                "confidence": round(conf, 2),
                                "bbox": box.xyxy[0].tolist()
                            })

                    if defect_labels:
                        logger.info(f"🔍 Defect Found: {defect_labels}")
                        webhook_payload["aiDecision"] = "FAIL"
                        webhook_payload["confidence"] = round(max_defect_conf, 2)
                        webhook_payload["summary"] = f"불량 검출: {', '.join(defect_labels)}"
                    else:
                        logger.info("✅ Expert Clean")
                        webhook_payload["aiDecision"] = "PASS"
                        webhook_payload["confidence"] = round(max_gate_conf, 2)
                        webhook_payload["summary"] = "정상 상품입니다."

        except Exception as e:
            logger.error(f"🔥 Inference Error: {e}", exc_info=True)
            webhook_payload["summary"] = "AI Server Error"
            detail_data["error_log"] = str(e)

        # (Step E) Webhook 전송
        total_time = round(time.perf_counter() - start_time, 4)
        detail_data["time_info"]["total"] = total_time
        webhook_payload["aiResult"] = json.dumps(detail_data, ensure_ascii=False)
        
        await self._send_webhook(issue_id, webhook_payload)

    async def _send_webhook(self, issue_id: int, payload: dict):
        target_url = f"{BACKEND_URL}/api/issues/{issue_id}/ai/result"
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(target_url, json=payload, timeout=5.0)
                resp.raise_for_status()
                logger.info(f"🚀 Webhook Sent: {payload['aiDecision']}")
            except Exception as e:
                logger.error(f"❌ Webhook Failed: {e}")

# 싱글톤 인스턴스 생성 (이걸 Router에서 갖다 씁니다)
vision_service = VisionService()