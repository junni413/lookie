package lookie.backend.domain.task.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import lookie.backend.domain.task.constant.NextAction;
import lookie.backend.domain.task.dto.TaskResponse;
import lookie.backend.domain.task.dto.*;
import lookie.backend.domain.task.service.TaskWorkflowFacade;
import lookie.backend.domain.task.vo.TaskItemVO;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TaskController.class)
@AutoConfigureMockMvc(addFilters = false) // Spring Security 필터 비활성화 (테스트 편의상)
class TaskControllerTest {

        @Autowired
        private MockMvc mockMvc;

        @MockBean
        private TaskWorkflowFacade taskWorkflowFacade;

        @MockBean
        private lookie.backend.domain.task.infra.TaskLockExecutor taskLockExecutor;

        @MockBean
        private lookie.backend.domain.task.service.TaskItemService taskItemService;

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

                when(taskLockExecutor.startTask(any()))
                                .thenReturn(TaskResponse.of(task, NextAction.SCAN_TOTE));

                // when & then
                mockMvc.perform(post("/api/tasks")
                                .with(csrf()))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.data.payload.batchTaskId").value(1L))
                                .andExpect(jsonPath("$.data.nextAction").value("SCAN_TOTE"));
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

                when(taskWorkflowFacade.scanTote(eq(taskId), eq(barcode)))
                                .thenReturn(TaskResponse.of(task, NextAction.SCAN_LOCATION));

                ToteScanRequest request = new ToteScanRequest();
                request.setBarcode(barcode);

                // when & then
                mockMvc.perform(post("/api/tasks/{taskId}/totes", taskId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request))
                                .with(csrf()))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.data.payload.toteId").value(100L))
                                .andExpect(jsonPath("$.data.nextAction").value("SCAN_LOCATION"));
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

                when(taskWorkflowFacade.scanLocation(eq(taskId), eq(locationCode)))
                                .thenReturn(TaskResponse.of(task, NextAction.SCAN_ITEM));

                LocationScanRequest request = new LocationScanRequest();
                request.setLocationCode(locationCode);

                // when & then
                mockMvc.perform(post("/api/tasks/{taskId}/locations/check", taskId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request))
                                .with(csrf()))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.data.nextAction").value("SCAN_ITEM"));
        }

        @Test
        @DisplayName("상품 스캔 API 테스트")
        @WithMockUser
        void scanItem() throws Exception {
                // given
                Long taskId = 1L;
                String barcode = "APPLE01";
                TaskItemVO item = new TaskItemVO();
                item.setBatchTaskItemId(10L);
                item.setProductId(100L);

                when(taskWorkflowFacade.scanItem(eq(taskId), eq(barcode)))
                                .thenReturn(TaskResponse.of(item, NextAction.ADJUST_QUANTITY));

                ItemScanRequest request = new ItemScanRequest();
                request.setBarcode(barcode);

                // when & then
                mockMvc.perform(post("/api/tasks/{taskId}/items/scan", taskId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request))
                                .with(csrf()))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.data.payload.batchTaskItemId").value(10L))
                                .andExpect(jsonPath("$.data.nextAction").value("ADJUST_QUANTITY"));
        }

        @Test
        @DisplayName("수량 반영 API 테스트")
        @WithMockUser
        void updateQuantity() throws Exception {
                // given
                Long itemId = 10L;
                int increment = 5;
                TaskItemVO item = new TaskItemVO();
                item.setBatchTaskItemId(itemId);
                item.setPickedQty(5);

                when(taskWorkflowFacade.pickItem(eq(itemId), eq(increment)))
                                .thenReturn(TaskResponse.of(item, NextAction.SCAN_ITEM));

                QuantityUpdateRequest request = new QuantityUpdateRequest();
                request.setIncrement(increment);

                // when & then
                mockMvc.perform(patch("/api/tasks/items/{itemId}", itemId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request))
                                .with(csrf()))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.data.payload.pickedQty").value(5))
                                .andExpect(jsonPath("$.data.nextAction").value("SCAN_ITEM"));
        }

        @Test
        @DisplayName("전체 아이템 목록 조회 API 테스트")
        @WithMockUser
        void getTaskItems() throws Exception {
                // given
                Long taskId = 1L;
                java.util.List<TaskItemVO> items = java.util.Collections.singletonList(new TaskItemVO());

                when(taskItemService.getAllItems(taskId)).thenReturn(items);

                // when & then
                mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                                .get("/api/tasks/{taskId}/items", taskId)
                                .with(csrf()))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.data").isArray());
        }
}
