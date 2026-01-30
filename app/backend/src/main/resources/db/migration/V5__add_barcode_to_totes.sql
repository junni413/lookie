-- totes 테이블에 실물 바코드 식별을 위한 barcode 컬럼 추가
ALTER TABLE totes
  ADD COLUMN barcode VARCHAR(255) NOT NULL UNIQUE COMMENT '토트 실물 바코드';
