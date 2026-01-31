package lookie.backend.domain.task.service;

import lookie.backend.domain.location.service.LocationService;
import lookie.backend.domain.task.constant.NextAction;
import lookie.backend.domain.task.dto.TaskResponse;
import lookie.backend.domain.task.mapper.TaskMapper;
import lookie.backend.domain.task.vo.TaskActionStatus;
import lookie.backend.domain.task.vo.TaskItemVO;
import lookie.backend.domain.task.vo.TaskVO;
import lookie.backend.domain.task.exception.TaskNotReleasableException;
import lookie.backend.domain.task.exception.WorkerAlreadyHasTaskException;
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
    @DisplayName("작업 시작 실패: 이미 진행 중인 작업이 있는 경우")
    void startTask_Fail_AlreadyHasTask() {
        // given
        Long workerId = 1L;
        when(zoneAssignmentMapper.findZoneIdByWorkerId(workerId)).thenReturn(10L);
        when(taskMapper.findInProgressByWorkerId(workerId)).thenReturn(new TaskVO());

        // when & then
        assertThrows(WorkerAlreadyHasTaskException.class, () -> {
            taskWorkflowFacade.startTask(workerId);
        });
    }

    @Test
    @DisplayName("T3-T4: 토트 스캔 성공 시 SCAN_LOCATION 반환 및 다음 아이템 포함")
    void scanTote_Success() {
        // given
        Long taskId = 100L;
        String barcode = "T001";
        TaskVO task = new TaskVO();
        task.setActionStatus(TaskActionStatus.SCAN_TOTE);

        ToteVO tote = new ToteVO();
        tote.setToteId(50L);

        TaskItemVO nextItem = new TaskItemVO();
        nextItem.setBatchTaskItemId(1L);

        when(taskMapper.findById(taskId)).thenReturn(task);
        when(toteService.getByBarcode(barcode)).thenReturn(tote);
        when(taskItemService.getNextItem(taskId)).thenReturn(nextItem); // 다음 아이템 Mocking

        // when
        TaskResponse<TaskVO> response = taskWorkflowFacade.scanTote(taskId, barcode);

        // then
        assertEquals(NextAction.SCAN_LOCATION, response.getNextAction());
        assertNotNull(response.getNextItem()); // 다음 아이템 포함 여부 검증
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

    @Test
    @DisplayName("상품 스캔 성공: 즉시 1개 증가 후 완료되면 SCAN_ITEM 반환 (같은 지번 잔여)")
    void scanItem_Success_AutoIncrement_Done() {
        // given
        Long taskId = 100L;
        String barcode = "P001";
        TaskVO task = new TaskVO();
        task.setBatchTaskId(taskId);
        task.setActionStatus(TaskActionStatus.SCAN_ITEM);
        task.setCurrentLocationId(10L);

        TaskItemVO item = new TaskItemVO();
        item.setBatchTaskItemId(500L);
        item.setRequiredQty(1);
        item.setPickedQty(0);

        TaskItemVO updatedItem = new TaskItemVO();
        updatedItem.setBatchTaskItemId(500L);
        updatedItem.setRequiredQty(1);
        updatedItem.setPickedQty(1);
        updatedItem.setStatus("DONE");
        updatedItem.setBatchTaskId(100L);
        updatedItem.setLocationId(10L);

        when(taskMapper.findById(taskId)).thenReturn(task);
        when(taskItemService.scanAndGetItem(taskId, 10L, barcode)).thenReturn(item);
        when(taskItemService.updateQuantityAtomic(500L, 1)).thenReturn(updatedItem);
        // 같은 지번에 잔여 아이템이 있다고 가정
        when(taskItemService.getPendingItemsAtLocation(100L, 10L))
                .thenReturn(Collections.singletonList(new TaskItemVO()));

        // when
        TaskResponse<TaskItemVO> response = taskWorkflowFacade.scanItem(taskId, barcode);

        // then
        // 1. updateQuantityAtomic이 호출되었는지 확인
        verify(taskItemService).updateQuantityAtomic(500L, 1);
        // 2. 완료 처리 되어 다음 아이템 스캔으로 넘어가는지 확인
        assertEquals(NextAction.SCAN_ITEM, response.getNextAction());
    }

    @Test
    @DisplayName("작업 완료 실패: 미완료 아이템이 남아있는 경우")
    void completeTask_Fail_HasPendingItems() {
        // given
        Long taskId = 100L;
        when(taskMapper.findById(taskId)).thenReturn(new TaskVO());
        when(taskItemService.countPendingItems(taskId)).thenReturn(5);

        // when & then
        assertThrows(TaskNotReleasableException.class, () -> {
            taskWorkflowFacade.completeTask(taskId);
        });
    }
}
