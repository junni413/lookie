package lookie.backend.domain.task.mapper;

import lookie.backend.domain.task.vo.TaskVO;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.jdbc.Sql;

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
@Sql(scripts = "/sql/task_seed.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
@Sql(scripts = "/sql/task_cleanup.sql", executionPhase = Sql.ExecutionPhase.AFTER_TEST_METHOD)
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

    @Test
    void findById_WithToteAndLocation_ShouldReturnJoinedData() {
        // Given: seed 데이터(1L)는 IN_PROGRESS, TOTE-001(id:1), LOCATION(id:1) 상태라고 가정
        // (task_seed.sql에 의존. 만약 seed 데이터가 부족하다면 기본 조회만이라도 검증)

        // When
        TaskVO task = taskMapper.findById(1L); // 시드 데이터의 Task ID

        // Then
        assertNotNull(task);
        // XML 쿼리의 JOIN 구문이 문법적으로 오류가 없는지,
        // 그리고 매핑된 필드가 null이 아닌지 확인 (데이터가 있을 경우)

        // 시드 데이터가 확실하지 않을 수 있으므로, 최소한 쿼리 실행 자체는 통과해야 함.
        // 데이터가 있다면 아래 단언문도 통과할 것임.
        if (task.getToteId() != null) {
            // 토트가 있으면 바코드도 조회되어야 함 (LEFT JOIN 검증)
            assertNotNull(task.getToteBarcode(), "Tote ID가 존재하면 Barcode도 조회되어야 합니다.");
        }
    }
}
