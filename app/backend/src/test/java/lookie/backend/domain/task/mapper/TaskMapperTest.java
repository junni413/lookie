package lookie.backend.domain.task.mapper;

import lookie.backend.domain.task.vo.TaskVO;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

/**
 * TaskMapper DB 접근 검증용 테스트
 *
 * - 비즈니스 로직(FSM)을 검증하는 테스트가 아님
 * - MyBatis Mapper와 XML SQL이 정상적으로 동작하는지 확인하는 목적
 * - "미할당(UNASSIGNED) 작업을 zone 기준으로 조회할 수 있는지"만 검증
 *
 * 이 테스트는:
 * - SQL 문법 오류
 * - 컬럼 ↔ VO 매핑 오류
 * - MyBatis 설정 문제
 * 를 조기에 발견하기 위한 최소 단위 테스트다.
 */

@SpringBootTest
class TaskMapperTest {

    @Autowired
    TaskMapper taskMapper;

    @Test
    void findNextUnassignedForZone() {
        TaskVO task = taskMapper.findNextUnassignedForZoneForUpdate(1L);
        assertNotNull(task);
        assertEquals("UNASSIGNED", task.getStatus());
        assertEquals(1L, task.getZoneId());
    }
}
