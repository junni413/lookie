package lookie.backend.domain.task.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.task.dto.*;
import lookie.backend.domain.task.service.TaskWorkflowService;
import lookie.backend.domain.task.mapper.TaskMapper;
import lookie.backend.domain.task.mapper.TaskItemMapper;
import lookie.backend.domain.task.vo.TaskItemVO;
import lookie.backend.domain.task.vo.TaskVO;
import lookie.backend.global.response.ApiResponse;
import lookie.backend.global.security.SecurityUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * TaskController - FSM 기반 작업 관리 API
 * 기존 API 경로 유지, 내부 로직만 FSM으로 교체
 */
@Slf4j
@Tag(name = "Task", description = "작업 관리(할당, 스캔) API")
@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskWorkflowService taskWorkflowService;
    private final TaskMapper taskMapper;
    private final TaskItemMapper taskItemMapper;
    private final lookie.backend.domain.user.mapper.UserMapper userMapper; // UserMapper 추가

    @Operation(summary = "작업 할당 및 시작", description = "작업자에게 할당된 구역의 미할당 작업을 하나 가져와 시작 상태로 변경합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<TaskResponse<TaskVO>>> startTask(
            @RequestParam(required = false) Long zoneId) {

        Long workerId = SecurityUtil.getCurrentUserId();

        // zoneId가 없으면 사용자 정보에서 assigned_zone_id 조회
        if (zoneId == null) {
            lookie.backend.domain.user.vo.UserVO user = userMapper.findById(workerId).orElse(null);
            if (user != null && user.getAssignedZoneId() != null) {
                zoneId = user.getAssignedZoneId();
            } else {
                zoneId = 1L; // 기본값 (Fallback)
                log.warn("[TaskController] No assigned zone found for workerId={}, using default: 1", workerId);
            }
        }

        taskWorkflowService.assignTask(workerId, zoneId);

        TaskVO task = taskMapper.findInProgressByWorkerId(workerId);
        TaskWorkScreenResponse screenResponse = buildWorkScreen(task.getBatchTaskId());

        // 기존 TaskResponse 형식으로 변환
        TaskResponse<TaskVO> response = TaskResponse.<TaskVO>builder()
                .payload(task)
                .nextItem(screenResponse.getNextItem())
                .nextAction(convertToNextAction(screenResponse.getActionStatus()))
                .build();

        return ResponseEntity.ok(ApiResponse.success("작업이 할당되었습니다.", response));
    }

    @Operation(summary = "토트 등록", description = "작업({taskId})에 사용할 토트를 등록(스캔)합니다.")
    @PostMapping("/{taskId}/totes")
    public ResponseEntity<ApiResponse<TaskResponse<TaskVO>>> scanTote(
            @PathVariable Long taskId,
            @RequestBody ToteScanRequest request) {

        Long workerId = SecurityUtil.getCurrentUserId();
        taskWorkflowService.scanTote(workerId, taskId, request.getBarcode());

        TaskWorkScreenResponse screenResponse = buildWorkScreen(taskId);
        TaskResponse<TaskVO> response = convertToTaskResponse(screenResponse);

        return ResponseEntity.ok(ApiResponse.success("토트가 등록되었습니다.", response));
    }

    @Operation(summary = "지번 검증", description = "작업자가 현재 올바른 지번(Location)에 있는지 검증합니다.")
    @PostMapping("/{taskId}/locations/check")
    public ResponseEntity<ApiResponse<TaskResponse<TaskVO>>> scanLocation(
            @PathVariable Long taskId,
            @RequestBody LocationScanRequest request) {

        Long workerId = SecurityUtil.getCurrentUserId();
        taskWorkflowService.scanLocation(workerId, taskId, request.getLocationCode());

        TaskWorkScreenResponse screenResponse = buildWorkScreen(taskId);
        TaskResponse<TaskVO> response = convertToTaskResponse(screenResponse);

        return ResponseEntity.ok(ApiResponse.success("지번 검증이 완료되었습니다.", response));
    }

    @Operation(summary = "상품 식별(스캔)", description = "작업 내에서 바코드로 상품을 식별하고 수량을 1 증가시킵니다.")
    @PostMapping("/{taskId}/items/scan")
    public ResponseEntity<ApiResponse<TaskResponse<TaskItemVO>>> scanItem(
            @PathVariable Long taskId,
            @RequestBody ItemScanRequest request) {

        Long workerId = SecurityUtil.getCurrentUserId();
        // Service가 반환하는 updatedItem을 그대로 사용 (수량 0 상태, status=IN_PROGRESS 등 최신 상태)
        TaskResponse<TaskItemVO> serviceResponse = taskWorkflowService.scanItem(workerId, taskId, request.getBarcode());

        TaskWorkScreenResponse screenResponse = buildWorkScreen(taskId);

        // Payload는 방금 스캔된 아이템(serviceResponse.getPayload())을 사용해야 함
        TaskResponse<TaskItemVO> response = TaskResponse.<TaskItemVO>builder()
                .payload(serviceResponse.getPayload())
                .nextItem(screenResponse.getNextItem())
                .nextAction(convertToNextAction(screenResponse.getActionStatus()))
                .build();

        return ResponseEntity.ok(ApiResponse.success("상품이 확인되었습니다.", response));
    }

    @Operation(summary = "상품 수량 수정", description = "특정 상품 아이템({itemId})의 집품 수량을 수정합니다.")
    @PatchMapping("/items/{itemId}")
    public ResponseEntity<ApiResponse<TaskResponse<TaskItemVO>>> updateQuantity(
            @PathVariable Long itemId,
            @RequestBody QuantityUpdateRequest request) {

        Long workerId = SecurityUtil.getCurrentUserId();

        // itemId로 taskId 조회
        TaskItemVO item = taskItemMapper.findById(itemId);
        Long taskId = item.getBatchTaskId();

        // Service가 반환하는 updatedItem을 그대로 사용 (수량 반영됨)
        TaskResponse<TaskItemVO> serviceResponse = taskWorkflowService.adjustQuantity(workerId, taskId, itemId,
                request.getIncrement());

        TaskWorkScreenResponse screenResponse = buildWorkScreen(taskId);

        // Payload는 방금 업데이트된 아이템(serviceResponse.getPayload())을 사용해야 함
        // screenResponse.getNextItem()을 쓰면 업데이트 전의 데이터를 가져오거나 엉뚱한 아이템을 가져옴
        TaskResponse<TaskItemVO> response = TaskResponse.<TaskItemVO>builder()
                .payload(serviceResponse.getPayload())
                .nextItem(screenResponse.getNextItem())
                .nextAction(convertToNextAction(screenResponse.getActionStatus()))
                .build();

        return ResponseEntity.ok(ApiResponse.success("수량이 반영되었습니다.", response));
    }

    @Operation(summary = "상품별 집품 완료", description = "수량이 충족된 상품에 대해 [완료] 처리를 수행합니다.")
    @PostMapping("/items/{itemId}/complete")
    public ResponseEntity<ApiResponse<TaskResponse<TaskItemVO>>> completeItem(@PathVariable Long itemId) {
        Long workerId = SecurityUtil.getCurrentUserId();

        // itemId로 taskId 조회
        TaskItemVO item = taskItemMapper.findById(itemId);
        Long taskId = item.getBatchTaskId();

        TaskResponse<TaskItemVO> serviceResponse = taskWorkflowService.completeItem(workerId, taskId, itemId);

        TaskWorkScreenResponse screenResponse = buildWorkScreen(taskId);

        // 완료 시에는 Payload에 완료된 아이템 정보를 담음
        TaskResponse<TaskItemVO> response = TaskResponse.<TaskItemVO>builder()
                .payload(serviceResponse.getPayload())
                .nextItem(screenResponse.getNextItem())
                .nextAction(convertToNextAction(screenResponse.getActionStatus()))
                .build();

        return ResponseEntity.ok(ApiResponse.success("상품 집품이 완료되었습니다.", response));
    }

    @Operation(summary = "작업 완료", description = "현재 진행 중인 작업을 완료 상태로 변경합니다.")
    @PostMapping("/{taskId}/complete")
    public ResponseEntity<ApiResponse<Void>> completeTask(@PathVariable Long taskId) {
        Long workerId = SecurityUtil.getCurrentUserId();
        taskWorkflowService.completeTask(workerId, taskId);

        return ResponseEntity.ok(ApiResponse.success("작업이 완료되었습니다.", null));
    }

    @Operation(summary = "작업 아이템 목록 조회", description = "현재 작업에 포함된 모든 아이템 목록을 조회합니다.")
    @GetMapping("/{taskId}/items")
    public ResponseEntity<ApiResponse<java.util.List<TaskItemVO>>> getTaskItems(@PathVariable Long taskId) {
        java.util.List<TaskItemVO> items = taskItemMapper.findAllByTaskId(taskId);
        return ResponseEntity.ok(ApiResponse.success("목록 조회가 완료되었습니다.", items));
    }

    @Operation(summary = "진행 중인 작업 조회", description = "로그인한 작업자의 현재 진행 중인 작업을 조회하여 작업 화면을 복구합니다.")
    @GetMapping("/me/active")
    public ResponseEntity<ApiResponse<TaskResponse<TaskVO>>> getActiveTask() {
        Long workerId = SecurityUtil.getCurrentUserId();
        TaskVO task = taskMapper.findInProgressByWorkerId(workerId);

        if (task == null) {
            return ResponseEntity.ok(ApiResponse.success("진행 중인 작업이 없습니다.", null));
        }

        TaskWorkScreenResponse screenResponse = buildWorkScreen(task.getBatchTaskId());
        TaskResponse<TaskVO> response = convertToTaskResponse(screenResponse);

        return ResponseEntity.ok(ApiResponse.success("진행 중인 작업을 불러왔습니다.", response));
    }

    // ========== Helper Methods ==========

    /**
     * FSM WorkScreen을 기존 TaskResponse<TaskVO>로 변환
     */
    private TaskResponse<TaskVO> convertToTaskResponse(TaskWorkScreenResponse screenResponse) {
        return TaskResponse.<TaskVO>builder()
                .payload(screenResponse.getTask())
                .nextItem(screenResponse.getNextItem())
                .nextAction(convertToNextAction(screenResponse.getActionStatus()))
                .build();
    }

    /**
     * Pseudo Code 7장 - buildWorkScreen
     */
    private TaskWorkScreenResponse buildWorkScreen(Long taskId) {
        TaskVO task = taskMapper.findById(taskId);
        // [수정] 현재 위치 정보 함께 전달하여 다음 아이템 결정 시 우선순위 부여
        TaskItemVO nextItem = taskItemMapper.findNextItem(taskId, task.getCurrentLocationId());

        return TaskWorkScreenResponse.builder()
                .task(task)
                .nextItem(nextItem)
                .actionStatus(task.getActionStatus())
                .currentLocationId(task.getCurrentLocationId())
                .build();
    }

    /**
     * TaskActionStatus를 NextAction으로 변환
     */
    private lookie.backend.domain.task.constant.NextAction convertToNextAction(
            lookie.backend.domain.task.vo.TaskActionStatus status) {
        if (status == null) {
            return lookie.backend.domain.task.constant.NextAction.NONE;
        }

        switch (status) {
            case SCAN_TOTE:
                return lookie.backend.domain.task.constant.NextAction.SCAN_TOTE;
            case SCAN_LOCATION:
                return lookie.backend.domain.task.constant.NextAction.SCAN_LOCATION;
            case SCAN_ITEM:
                return lookie.backend.domain.task.constant.NextAction.SCAN_ITEM;
            case ADJUST_QUANTITY:
                return lookie.backend.domain.task.constant.NextAction.ADJUST_QUANTITY;
            case COMPLETE_TASK:
                return lookie.backend.domain.task.constant.NextAction.COMPLETE_TASK;
            default:
                return lookie.backend.domain.task.constant.NextAction.NONE;
        }
    }
}
