package lookie.backend.domain.task.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import lookie.backend.domain.task.service.TaskService;
import lookie.backend.domain.task.vo.TaskVO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.HashMap;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TaskController.class)
@AutoConfigureMockMvc(addFilters = false) // Spring Security 필터 비활성화 (테스트 편의상)
class TaskControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TaskService taskService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("작업 시작 API 테스트")
    @WithMockUser(username = "1")
    void startTask() throws Exception {
        // given
        TaskVO task = new TaskVO();
        task.setBatchTaskId(1L);
        task.setStatus("IN_PROGRESS");

        when(taskService.startTask(any())).thenReturn(task);

        // when & then
        mockMvc.perform(post("/api/tasks")
                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.batchTaskId").value(1L))
                .andExpect(jsonPath("$.data.status").value("IN_PROGRESS"));
    }

    @Test
    @DisplayName("토트 스캔 API 테스트")
    @WithMockUser
    void scanTote() throws Exception {
        // given
        Long taskId = 1L;
        String barcode = "T001";

        TaskVO task = new TaskVO();
        task.setBatchTaskId(taskId);
        task.setToteId(100L);

        when(taskService.scanTote(eq(taskId), eq(barcode))).thenReturn(task);

        Map<String, String> request = new HashMap<>();
        request.put("barcode", barcode);

        // when & then
        mockMvc.perform(post("/api/tasks/{taskId}/tote/scan", taskId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.toteId").value(100L));
    }

    @Test
    @DisplayName("지번 스캔 API 테스트")
    @WithMockUser
    void scanLocation() throws Exception {
        // given
        Long taskId = 1L;
        String locationCode = "LOC-001";

        TaskVO task = new TaskVO();
        task.setBatchTaskId(taskId);

        when(taskService.scanLocation(eq(taskId), eq(locationCode))).thenReturn(task);

        Map<String, String> request = new HashMap<>();
        request.put("locationCode", locationCode);

        // when & then
        mockMvc.perform(post("/api/tasks/{taskId}/location/scan", taskId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(csrf()))
                .andExpect(status().isOk());
    }
}
