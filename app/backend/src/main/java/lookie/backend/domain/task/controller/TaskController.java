package lookie.backend.domain.task.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lookie.backend.domain.task.service.TaskService;
import lookie.backend.domain.task.vo.TaskVO;
import lookie.backend.global.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Task", description = "작업(Task) 할당/완료 명령 API")
@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @PostMapping("/start")
    @Operation(summary = "작업 할당(=작업 시작)", description = """
            작업자가 '작업 받기' 버튼을 누르면 실행됩니다.
            서버는 작업자의 현재 zone을 조회한 뒤, 동일 zone의 UNASSIGNED 작업 1건을 선택하여
            worker_id를 할당하고 status를 IN_PROGRESS로 전이하며 started_at을 기록합니다.
            """)
    public ResponseEntity<ApiResponse<TaskVO>> startTask(
            @RequestParam Long workerId) {
        TaskVO task = taskService.startTask(workerId);
        return ResponseEntity.ok(ApiResponse.success("작업 배정 성공", task));
    }

    @PostMapping("/{taskId}/complete")
    @Operation(summary = "작업 완료", description = """
            IN_PROGRESS 상태의 작업을 COMPLETED로 전이합니다.
            completed_at을 기록합니다.
            (MVP: 요청자(worker) 검증은 추후 인증 도입 시 보완)
            """)
    public ResponseEntity<ApiResponse<Void>> completeTask(@PathVariable Long taskId) {
        taskService.completeTask(taskId);
        return ResponseEntity.ok(ApiResponse.success("작업 완료 처리 성공", null));

    }
}
