package lookie.backend.domain.task.service;

import lookie.backend.domain.location.service.LocationService;
import lookie.backend.domain.location.vo.LocationVO;
import lookie.backend.domain.task.constant.NextAction;
import lookie.backend.domain.task.dto.TaskResponse;
import lookie.backend.domain.task.mapper.TaskMapper;
import lookie.backend.domain.task.vo.TaskActionStatus;
import lookie.backend.domain.task.vo.TaskItemVO;
import lookie.backend.domain.task.vo.TaskVO;
import lookie.backend.domain.tote.service.ToteService;
import lookie.backend.domain.tote.vo.ToteVO;
import lookie.backend.domain.zone.mapper.ZoneAssignmentMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskWorkflowFacadeTest {

    @Mock
    private TaskMapper taskMapper;
    @Mock
    private TaskItemService taskItemService;
    @Mock
    private ToteService toteService;
    @Mock
    private LocationService locationService;
    @Mock
    private ZoneAssignmentMapper zoneAssignmentMapper;

    @InjectMocks
    private TaskWorkflowFacade taskWorkflowFacade;

    @Test
    @DisplayName("T1-T2: 작업 시작 성공 시 SCAN_TOTE 반환")
    void startTask_Success() {
        // given
        Long workerId = 1L;
        Long zoneId = 10L;
        Long taskId = 100L;
        TaskVO task = new TaskVO();
        task.setBatchTaskId(taskId);

        when(zoneAssignmentMapper.findZoneIdByWorkerId(workerId)).thenReturn(zoneId);
        when(taskMapper.findNextUnassignedForZoneForUpdate(zoneId)).thenReturn(task);
        when(taskMapper.findById(taskId)).thenReturn(task);

        // when
        TaskResponse<TaskVO> response = taskWorkflowFacade.startTask(workerId);

        // then
        assertEquals(NextAction.SCAN_TOTE, response.getNextAction());
        verify(taskMapper).updateAssignToInProgress(taskId, workerId);
    }

    @Test
    @DisplayName("T3-T4: 토트 스캔 성공 시 SCAN_LOCATION 반환")
    void scanTote_Success() {
        // given
        Long taskId = 100L;
        String barcode = "T001";
        TaskVO task = new TaskVO();
        task.setActionStatus(TaskActionStatus.SCAN_TOTE);

        ToteVO tote = new ToteVO();
        tote.setToteId(50L);

        when(taskMapper.findById(taskId)).thenReturn(task);
        when(toteService.getByBarcode(barcode)).thenReturn(tote);

        // when
        TaskResponse<TaskVO> response = taskWorkflowFacade.scanTote(taskId, barcode);

        // then
        assertEquals(NextAction.SCAN_LOCATION, response.getNextAction());
        verify(taskMapper).updateToteScanResult(taskId, 50L);
    }

    @Test
    @DisplayName("수량 조정 성공: 해당 지번에 남은 아이템이 있으면 SCAN_ITEM 반환")
    void pickItem_StayAtLocation() {
        // given
        Long itemId = 1L;
        TaskItemVO item = new TaskItemVO();
        item.setBatchTaskItemId(itemId);
        item.setStatus("DONE");
        item.setBatchTaskId(100L);
        item.setLocationId(200L);

        when(taskItemService.updateQuantityAtomic(itemId, 1)).thenReturn(item);
        when(taskItemService.getPendingItemsAtLocation(100L, 200L))
                .thenReturn(Collections.singletonList(new TaskItemVO()));

        // when
        TaskResponse<TaskItemVO> response = taskWorkflowFacade.pickItem(itemId, 1);

        // then
        assertEquals(NextAction.SCAN_ITEM, response.getNextAction());
    }
}
