package lookie.backend.domain.task.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lookie.backend.domain.task.service.TaskService;
import lookie.backend.domain.task.vo.TaskVO;
import lookie.backend.global.response.ApiResponse;
import lookie.backend.global.security.SecurityUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "Task", description = "작업 관리(할당, 스캔) API")
@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @Operation(summary = "작업 할당 및 시작", description = "작업자에게 할당된 구역의 미할당 작업을 하나 가져와 시작 상태로 변경합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<TaskVO>> startTask() {
        Long userId = SecurityUtil.getCurrentUserId();
        TaskVO task = taskService.startTask(userId);
        return ResponseEntity.ok(ApiResponse.success("작업이 할당되었습니다.", task));
    }

    @Operation(summary = "토트 스캔", description = "작업에 사용할 토트 바코드를 스캔하여 등록합니다.")
    @PostMapping("/{taskId}/tote/scan")
    public ResponseEntity<ApiResponse<TaskVO>> scanTote(
            @PathVariable Long taskId,
            @RequestBody Map<String, String> request) {

        String barcode = request.get("barcode");
        TaskVO task = taskService.scanTote(taskId, barcode);
        return ResponseEntity.ok(ApiResponse.success("토트 스캔이 완료되었습니다.", task));
    }

    @Operation(summary = "지번 스캔", description = "상품이 위치한 지번(Location) 바코드를 스캔합니다.")
    @PostMapping("/{taskId}/location/scan")
    public ResponseEntity<ApiResponse<TaskVO>> scanLocation(
            @PathVariable Long taskId,
            @RequestBody Map<String, String> request) {

        String locationCode = request.get("locationCode");
        TaskVO task = taskService.scanLocation(taskId, locationCode);
        return ResponseEntity.ok(ApiResponse.success("지번 스캔이 완료되었습니다.", task));
    }

    @Operation(summary = "작업 완료", description = "현재 진행 중인 작업을 완료 상태로 변경합니다.")
    @PostMapping("/{taskId}/complete")
    public ResponseEntity<ApiResponse<Void>> completeTask(@PathVariable Long taskId) {
        taskService.completeTask(taskId);
        return ResponseEntity.ok(ApiResponse.success("작업이 완료되었습니다.", null));
    }
}
