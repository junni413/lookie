-- AI 판정 결과에 RETAKE 다시 추가
-- 분기표 D12 노드: 재촬영 요청 케이스 처리를 위해 필요

ALTER TABLE ai_judgments
MODIFY COLUMN ai_decision ENUM(
  'PASS',
  'FAIL',
  'NEED_CHECK',
  'RETAKE',      -- 재촬영 요청 (분기표 D12)
  'UNKNOWN'
) NOT NULL DEFAULT 'UNKNOWN';
