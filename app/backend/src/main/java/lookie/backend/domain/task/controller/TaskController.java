package lookie.backend.domain.task.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lookie.backend.domain.task.dto.TaskResponse;
import lookie.backend.domain.task.dto.*;
import lookie.backend.domain.task.infra.TaskLockExecutor;
import lookie.backend.domain.task.service.TaskItemService;
import lookie.backend.domain.task.service.TaskWorkflowFacade;
import lookie.backend.domain.task.vo.TaskItemVO;
import lookie.backend.domain.task.vo.TaskVO;
import lookie.backend.global.response.ApiResponse;
import lookie.backend.global.security.SecurityUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Task", description = "작업 관리(할당, 스캔) API")
@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskWorkflowFacade taskWorkflowFacade;
    private final TaskItemService taskItemService;
    private final TaskLockExecutor taskLockExecutor;

    @Operation(summary = "작업 할당 및 시작", description = "작업자에게 할당된 구역의 미할당 작업을 하나 가져와 시작 상태로 변경합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<TaskResponse<TaskVO>>> startTask() {
        Long userId = SecurityUtil.getCurrentUserId();
        TaskResponse<TaskVO> response = taskLockExecutor.startTask(userId);
        return ResponseEntity.ok(ApiResponse.success("작업이 할당되었습니다.", response));
    }

    @Operation(summary = "토트 등록", description = "작업({taskId})에 사용할 토트를 등록(스캔)합니다.")
    @PostMapping("/{taskId}/totes")
    public ResponseEntity<ApiResponse<TaskResponse<TaskVO>>> scanTote(
            @PathVariable Long taskId,
            @RequestBody ToteScanRequest request) {

        TaskResponse<TaskVO> response = taskWorkflowFacade.scanTote(taskId, request.getBarcode());
        return ResponseEntity.ok(ApiResponse.success("토트가 등록되었습니다.", response));
    }

    @Operation(summary = "지번 검증", description = "작업자가 현재 올바른 지번(Location)에 있는지 검증합니다.")
    @PostMapping("/{taskId}/locations/check")
    public ResponseEntity<ApiResponse<TaskResponse<TaskVO>>> scanLocation(
            @PathVariable Long taskId,
            @RequestBody LocationScanRequest request) {

        TaskResponse<TaskVO> response = taskWorkflowFacade.scanLocation(taskId, request.getLocationCode());
        return ResponseEntity.ok(ApiResponse.success("지번 검증이 완료되었습니다.", response));
    }

    @Operation(summary = "상품 식별(스캔)", description = "작업 내에서 바코드로 상품을 식별하고 수량을 1 증가시킵니다.")
    @PostMapping("/{taskId}/items/scan")
    public ResponseEntity<ApiResponse<TaskResponse<TaskItemVO>>> scanItem(
            @PathVariable Long taskId,
            @RequestBody ItemScanRequest request) {

        TaskResponse<TaskItemVO> response = taskWorkflowFacade.scanItem(taskId, request.getBarcode());
        return ResponseEntity.ok(ApiResponse.success("상품이 확인되었습니다.", response));
    }

    @Operation(summary = "상품 수량 수정", description = "특정 상품 아이템({itemId})의 집품 수량을 수정합니다.")
    @PatchMapping("/items/{itemId}")
    public ResponseEntity<ApiResponse<TaskResponse<TaskItemVO>>> updateQuantity(
            @PathVariable Long itemId,
            @RequestBody QuantityUpdateRequest request) {

        TaskResponse<TaskItemVO> response = taskWorkflowFacade.pickItem(itemId, request.getIncrement());
        return ResponseEntity.ok(ApiResponse.success("수량이 반영되었습니다.", response));
    }

    @Operation(summary = "상품별 집품 완료", description = "수량이 충족된 상품에 대해 [완료] 처리를 수행합니다.")
    @PostMapping("/items/{itemId}/complete")
    public ResponseEntity<ApiResponse<TaskResponse<TaskItemVO>>> completeItem(@PathVariable Long itemId) {
        TaskResponse<TaskItemVO> response = taskWorkflowFacade.completeItem(itemId);
        return ResponseEntity.ok(ApiResponse.success("상품 집품이 완료되었습니다.", response));
    }

    @Operation(summary = "작업 완료", description = "현재 진행 중인 작업을 완료 상태로 변경합니다.")
    @PostMapping("/{taskId}/complete")
    public ResponseEntity<ApiResponse<Void>> completeTask(@PathVariable Long taskId) {
        taskLockExecutor.completeTask(taskId);
        return ResponseEntity.ok(ApiResponse.success("작업이 완료되었습니다.", null));
    }

    @Operation(summary = "작업 아이템 목록 조회", description = "현재 작업에 포함된 모든 아이템 목록을 조회합니다.")
    @GetMapping("/{taskId}/items")
    public ResponseEntity<ApiResponse<java.util.List<TaskItemVO>>> getTaskItems(@PathVariable Long taskId) {
        java.util.List<TaskItemVO> items = taskItemService.getAllItems(taskId);
        return ResponseEntity.ok(ApiResponse.success("목록 조회가 완료되었습니다.", items));
    }
}
