-- V20260204_01__remove_control_maps.sql
-- 목적:
-- 1) control_maps, map_zone_polygons 미사용이므로 제거
-- 2) zone_locations.map_id 제거 및 유니크키 재구성
-- 3) zones.map_id도 함께 정리(현재 FK 없음 + 미사용 가정)

-- 0) (안전) map_zone_polygons는 control_maps를 참조하므로 먼저 제거
DROP TABLE map_zone_polygons;

-- 1) zone_locations → control_maps FK 제거 (제약명은 init에 명시됨)
ALTER TABLE zone_locations
  DROP FOREIGN KEY fk_zone_locations_map;

-- 2) control_maps 제거
DROP TABLE control_maps;

-- 3) zones.map_id 정리 (FK는 없지만 컬럼/인덱스가 남아있음)
--    idx_zones_map는 zones 생성 시 만들어졌음
ALTER TABLE zones
  DROP INDEX idx_zones_map,
  DROP COLUMN map_id;

-- 4) zone_locations.map_id 제거 + 유니크키 재구성
--    기존 유니크: uk_zone_locations_scope (map_id, zone_id, location_code)
--    map_id를 제거하므로 유니크도 (zone_id, location_code)로 재정의
ALTER TABLE zone_locations
  DROP INDEX uk_zone_locations_scope,
  DROP COLUMN map_id,
  ADD CONSTRAINT uk_zone_locations_zone_code UNIQUE (zone_id, location_code);
