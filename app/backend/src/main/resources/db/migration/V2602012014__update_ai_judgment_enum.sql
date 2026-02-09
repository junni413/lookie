-- ai_judgments 테이블 ai_decision ENUM 변경 (RETAKE -> NEED_CHECK)
-- Issue Core 작업 범위: AI 판정 결과가 NEED_CHECK로 오는 경우를 처리하기 위함

ALTER TABLE ai_judgments 
MODIFY COLUMN ai_decision ENUM('PASS','FAIL','NEED_CHECK','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN';
