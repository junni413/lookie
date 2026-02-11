package lookie.backend.domain.task.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.task.dto.*;
import lookie.backend.domain.task.service.TaskWorkflowService;
import lookie.backend.domain.task.mapper.TaskItemMapper;
import lookie.backend.domain.task.vo.TaskItemVO;
import lookie.backend.domain.task.vo.TaskVO;
import lookie.backend.global.response.ApiResponse;
import lookie.backend.global.security.SecurityUtil;
import lookie.backend.domain.user.mapper.UserMapper;
import lookie.backend.domain.user.vo.UserVO;
import java.util.List;
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
    private final TaskItemMapper taskItemMapper;
    private final UserMapper userMapper; // UserMapper 추가

    @Operation(summary = "작업 할당 및 시작", description = "작업자에게 할당된 구역의 미할당 작업을 하나 가져와 시작 상태로 변경합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<TaskResponse<TaskVO>>> startTask(
            @RequestParam(required = false) Long zoneId) {

        Long workerId = SecurityUtil.getCurrentUserId();

        // zoneId가 없으면 사용자 정보에서 assigned_zone_id 조회
        if (zoneId == null) {
            UserVO user = userMapper.findById(workerId).orElse(null);
            if (user != null && user.getAssignedZoneId() != null) {
                zoneId = user.getAssignedZoneId();
            } else {
                zoneId = 1L; // 기본값 (Fallback)
                log.warn("[TaskController] No assigned zone found for workerId={}, using default: 1", workerId);
            }
        }

        // TaskWorkflowService가 TaskResponse를 직접 반환
        TaskResponse<TaskVO> response = taskWorkflowService.assignTask(workerId, zoneId);

        return ResponseEntity.ok(ApiResponse.success("작업이 할당되었습니다.", response));
    }

    @Operation(summary = "토트 등록", description = "작업({taskId})에 사용할 토트를 등록(스캔)합니다.")
    @PostMapping("/{taskId}/totes")
    public ResponseEntity<ApiResponse<TaskResponse<TaskVO>>> scanTote(
            @PathVariable Long taskId,
            @RequestBody ToteScanRequest request) {

        Long workerId = SecurityUtil.getCurrentUserId();
        // TaskWorkflowService가 TaskResponse를 직접 반환
        TaskResponse<TaskVO> response = taskWorkflowService.scanTote(workerId, taskId, request.getBarcode());

        return ResponseEntity.ok(ApiResponse.success("토트가 등록되었습니다.", response));
    }

    @Operation(summary = "지번 검증", description = "작업자가 현재 올바른 지번(Location)에 있는지 검증합니다.")
    @PostMapping("/{taskId}/locations/check")
    public ResponseEntity<ApiResponse<TaskResponse<TaskVO>>> scanLocation(
            @PathVariable Long taskId,
            @RequestBody LocationScanRequest request) {

        Long workerId = SecurityUtil.getCurrentUserId();
        // TaskWorkflowService가 TaskResponse를 직접 반환
        TaskResponse<TaskVO> response = taskWorkflowService.scanLocation(workerId, taskId, request.getLocationCode());

        return ResponseEntity.ok(ApiResponse.success("지번 검증이 완료되었습니다.", response));
    }

    @Operation(summary = "상품 식별(스캔)", description = "작업 내에서 바코드로 상품을 식별하고 수량을 1 증가시킵니다.")
    @PostMapping("/{taskId}/items/scan")
    public ResponseEntity<ApiResponse<TaskResponse<TaskItemVO>>> scanItem(
            @PathVariable Long taskId,
            @RequestBody ItemScanRequest request) {

        Long workerId = SecurityUtil.getCurrentUserId();
        // TaskWorkflowService가 TaskResponse를 직접 반환
        TaskResponse<TaskItemVO> response = taskWorkflowService.scanItem(workerId, taskId, request.getBarcode());

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

        // TaskWorkflowService가 TaskResponse를 직접 반환
        TaskResponse<TaskItemVO> response = taskWorkflowService.adjustQuantity(workerId, taskId, itemId,
                request.getIncrement());

        return ResponseEntity.ok(ApiResponse.success("수량이 반영되었습니다.", response));
    }

    @Operation(summary = "상품별 집품 완료", description = "수량이 충족된 상품에 대해 [완료] 처리를 수행합니다.")
    @PostMapping("/items/{itemId}/complete")
    public ResponseEntity<ApiResponse<TaskResponse<TaskItemVO>>> completeItem(@PathVariable Long itemId) {
        Long workerId = SecurityUtil.getCurrentUserId();

        // itemId로 taskId 조회
        TaskItemVO item = taskItemMapper.findById(itemId);
        Long taskId = item.getBatchTaskId();

        // TaskWorkflowService가 TaskResponse를 직접 반환
        TaskResponse<TaskItemVO> response = taskWorkflowService.completeItem(workerId, taskId, itemId);

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
    public ResponseEntity<ApiResponse<List<TaskItemVO>>> getTaskItems(@PathVariable Long taskId) {
        List<TaskItemVO> items = taskItemMapper.findAllByTaskId(taskId);
        return ResponseEntity.ok(ApiResponse.success("목록 조회가 완료되었습니다.", items));
    }

    @Operation(summary = "진행 중인 작업 조회", description = "로그인한 작업자의 현재 진행 중인 작업을 조회하여 작업 화면을 복구합니다.")
    @GetMapping("/me/active")
    public ResponseEntity<ApiResponse<TaskResponse<TaskVO>>> getActiveTask() {
        Long workerId = SecurityUtil.getCurrentUserId();

        // TaskWorkflowService의 상태 복구 로직 사용
        TaskResponse<TaskVO> response = taskWorkflowService.getInProgressTask(workerId);

        if (response == null) {
            return ResponseEntity.ok(ApiResponse.success("진행 중인 작업이 없습니다.", null));
        }

        return ResponseEntity.ok(ApiResponse.success("진행 중인 작업을 불러왔습니다.", response));
    }
}
