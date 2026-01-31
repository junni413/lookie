package lookie.backend.domain.task.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lookie.backend.domain.task.dto.TaskResponse;
import lookie.backend.domain.task.dto.*;
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

    @Operation(summary = "작업 할당 및 시작", description = "작업자에게 할당된 구역의 미할당 작업을 하나 가져와 시작 상태로 변경합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<TaskResponse<TaskVO>>> startTask() {
        Long userId = SecurityUtil.getCurrentUserId();
        TaskResponse<TaskVO> response = taskWorkflowFacade.startTask(userId);
        return ResponseEntity.ok(ApiResponse.success("작업이 할당되었습니다.", response));
    }

    @Operation(summary = "토트 스캔", description = "작업에 사용할 토트 바코드를 스캔하여 등록합니다.")
    @PostMapping("/{taskId}/tote/scan")
    public ResponseEntity<ApiResponse<TaskResponse<TaskVO>>> scanTote(
            @PathVariable Long taskId,
            @RequestBody ToteScanRequest request) {

        TaskResponse<TaskVO> response = taskWorkflowFacade.scanTote(taskId, request.getBarcode());
        return ResponseEntity.ok(ApiResponse.success("토트 스캔이 완료되었습니다.", response));
    }

    @Operation(summary = "지번 스캔", description = "상품이 위치한 지번(Location) 바코드를 스캔합니다.")
    @PostMapping("/{taskId}/location/scan")
    public ResponseEntity<ApiResponse<TaskResponse<TaskVO>>> scanLocation(
            @PathVariable Long taskId,
            @RequestBody LocationScanRequest request) {

        TaskResponse<TaskVO> response = taskWorkflowFacade.scanLocation(taskId, request.getLocationCode());
        return ResponseEntity.ok(ApiResponse.success("지번 스캔이 완료되었습니다.", response));
    }

    @Operation(summary = "상품 스캔", description = "현재 지번의 상품 바코드를 스캔합니다.")
    @PostMapping("/{taskId}/item/scan")
    public ResponseEntity<ApiResponse<TaskResponse<TaskItemVO>>> scanItem(
            @PathVariable Long taskId,
            @RequestBody ItemScanRequest request) {

        TaskResponse<TaskItemVO> response = taskWorkflowFacade.scanItem(taskId, request.getBarcode());
        return ResponseEntity.ok(ApiResponse.success("상품이 확인되었습니다.", response));
    }

    @Operation(summary = "상품 수량 조정", description = "스캔된 상품의 집품 수량을 조정합니다.")
    @PostMapping("/items/{itemId}/quantity")
    public ResponseEntity<ApiResponse<TaskResponse<TaskItemVO>>> updateQuantity(
            @PathVariable Long itemId,
            @RequestBody QuantityUpdateRequest request) {

        TaskResponse<TaskItemVO> response = taskWorkflowFacade.pickItem(itemId, request.getIncrement());
        return ResponseEntity.ok(ApiResponse.success("수량이 반영되었습니다.", response));
    }

    @Operation(summary = "작업 완료", description = "현재 진행 중인 작업을 완료 상태로 변경합니다.")
    @PostMapping("/{taskId}/complete")
    public ResponseEntity<ApiResponse<Void>> completeTask(@PathVariable Long taskId) {
        taskWorkflowFacade.completeTask(taskId);
        return ResponseEntity.ok(ApiResponse.success("작업이 완료되었습니다.", null));
    }
}
