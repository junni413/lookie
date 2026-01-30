package lookie.backend.domain.task.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import lookie.backend.domain.task.exception.InvalidTaskActionStateException;
import lookie.backend.domain.location.exception.LocationNotFoundException;
import lookie.backend.domain.location.exception.LocationZoneMismatchException;
import lookie.backend.domain.location.mapper.LocationMapper;
import lookie.backend.domain.location.vo.LocationVO;
import lookie.backend.domain.task.exception.InvalidToteBarcodeException;
import lookie.backend.domain.task.exception.TaskNotFoundException;
import lookie.backend.domain.task.mapper.TaskMapper;
import lookie.backend.domain.task.vo.TaskActionStatus;
import lookie.backend.domain.task.vo.TaskVO;
import lookie.backend.domain.tote.mapper.ToteMapper;
import lookie.backend.domain.tote.vo.ToteVO;
import lookie.backend.domain.zone.mapper.ZoneAssignmentMapper;

/**
 * TaskService 단위 테스트 (Mockito 활용)
 * DB 연결 없이 비즈니스 로직(FSM, 예외 처리)만 빠르게 검증한다.
 * 이 테스트는 쿼리 정확성이나 트랜잭션 동작을 보장하지 않는다.
 * (→ 통합 테스트에서 검증 대상)
 */
@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock
    private TaskMapper taskMapper;

    @Mock
    private ToteMapper toteMapper;

    @Mock
    private LocationMapper locationMapper;

    @Mock
    private ZoneAssignmentMapper zoneAssignmentMapper;

    @Mock
    private ApplicationEventPublisher publisher;

    @InjectMocks
    private TaskService taskService;

    @Test
    @DisplayName("토트 스캔 성공: 할당된 토트와 바코드가 일치하면 다음 단계로 전이한다.")
    void scanTote_Success() {
        // given
        Long taskId = 1L;
        String toteBarcode = "T001";
        Long toteId = 100L;

        TaskVO task = new TaskVO();
        task.setBatchTaskId(taskId);
        task.setToteId(toteId);
        task.setActionStatus(TaskActionStatus.SCAN_TOTE);

        ToteVO tote = new ToteVO();
        tote.setToteId(toteId);
        tote.setBarcode(toteBarcode);

        when(taskMapper.findById(taskId)).thenReturn(task);
        when(toteMapper.findByBarcode(toteBarcode)).thenReturn(tote);
        when(taskMapper.updateToteScanResult(anyLong(), anyLong())).thenReturn(1);

        // when
        taskService.scanTote(taskId, toteBarcode);

        // then
        verify(taskMapper).updateToteScanResult(taskId, toteId);
        verify(toteMapper).updateToteMapping(toteId, taskId);
    }

    @Test
    @DisplayName("토트 스캔 실패: 할당된 토트와 스캔한 토트가 다르면 예외가 발생한다.")
    void scanTote_Fail_Mismatch() {
        // given
        Long taskId = 1L;
        String wrongBarcode = "WRONG-001";

        TaskVO task = new TaskVO();
        task.setToteId(100L); // 기대되는 토트 ID
        task.setActionStatus(TaskActionStatus.SCAN_TOTE);

        ToteVO wrongTote = new ToteVO();
        wrongTote.setToteId(999L); // 실제 스캔된 토트 ID (불일치)
        wrongTote.setBarcode(wrongBarcode);

        when(taskMapper.findById(taskId)).thenReturn(task);
        when(toteMapper.findByBarcode(wrongBarcode)).thenReturn(wrongTote);

        // when & then
        assertThrows(InvalidToteBarcodeException.class, () -> {
            taskService.scanTote(taskId, wrongBarcode);
        });
    }

    @Test
    @DisplayName("토트 스캔 실패: FSM 상태 불일치 시 예외가 발생한다.")
    void scanTote_Fail_InvalidState() {
        // given
        Long taskId = 1L;
        String toteBarcode = "T001";
        TaskVO task = new TaskVO();
        task.setActionStatus(TaskActionStatus.SCAN_LOCATION); // 잘못된 상태

        when(taskMapper.findById(taskId)).thenReturn(task);

        // when & then
        assertThrows(InvalidTaskActionStateException.class, () -> {
            taskService.scanTote(taskId, toteBarcode);
        });
    }

    @Test
    @DisplayName("토트 스캔 실패: 존재하지 않는 작업을 조회하면 예외가 발생한다.")
    void scanTote_Fail_NotFound() {
        // given
        when(taskMapper.findById(anyLong())).thenReturn(null);

        // when & then
        assertThrows(TaskNotFoundException.class, () -> {
            taskService.scanTote(1L, "ANY-BARCODE");
        });
    }

    @Test
    @DisplayName("지번 스캔 성공: 구역이 일치하는 지번을 스캔하면 다음 단계(SCAN_ITEM)로 전이한다.")
    void scanLocation_Success() {
        // given
        Long taskId = 1L;
        String locationCode = "LOC-001";
        Long zoneId = 10L;

        TaskVO task = new TaskVO();
        task.setBatchTaskId(taskId);
        task.setZoneId(zoneId);
        task.setActionStatus(TaskActionStatus.SCAN_LOCATION);

        LocationVO location = new LocationVO();
        location.setZoneId(zoneId);
        location.setLocationCode(locationCode);

        when(taskMapper.findById(taskId)).thenReturn(task);
        when(locationMapper.findByCode(locationCode)).thenReturn(location);
        when(taskMapper.updateLocationScanResult(taskId)).thenReturn(1);

        // when
        taskService.scanLocation(taskId, locationCode);

        // then
        verify(taskMapper).updateLocationScanResult(taskId);
    }

    @Test
    @DisplayName("지번 스캔 실패: 다른 구역의 지번을 스캔하면 예외가 발생한다.")
    void scanLocation_Fail_ZoneMismatch() {
        // given
        Long taskId = 1L;
        String otherLocationCode = "LOC-OTHER";

        TaskVO task = new TaskVO();
        task.setZoneId(10L); // 작업 구역은 10번
        task.setActionStatus(TaskActionStatus.SCAN_LOCATION);

        LocationVO otherLocation = new LocationVO();
        otherLocation.setZoneId(99L); // 지번 구역은 99번
        otherLocation.setLocationCode(otherLocationCode);

        when(taskMapper.findById(taskId)).thenReturn(task);
        when(locationMapper.findByCode(otherLocationCode)).thenReturn(otherLocation);

        // when & then
        assertThrows(LocationZoneMismatchException.class, () -> {
            taskService.scanLocation(taskId, otherLocationCode);
        });
    }

    @Test
    @DisplayName("지번 스캔 실패: 존재하지 않는 지번 코드를 스캔하면 예외가 발생한다.")
    void scanLocation_Fail_NotFound() {
        // given
        Long taskId = 1L;
        String invalidCode = "INVALID";

        TaskVO task = new TaskVO();
        task.setActionStatus(TaskActionStatus.SCAN_LOCATION);

        when(taskMapper.findById(taskId)).thenReturn(task);
        when(locationMapper.findByCode(invalidCode)).thenReturn(null);

        // when & then
        assertThrows(LocationNotFoundException.class, () -> {
            taskService.scanLocation(taskId, invalidCode);
        });
    }
}
