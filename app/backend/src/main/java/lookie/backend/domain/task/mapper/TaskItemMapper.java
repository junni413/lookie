package lookie.backend.domain.task.mapper;

import lookie.backend.domain.task.vo.TaskItemVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface TaskItemMapper {

        // [조회] 특정 작업의 남은 PENDING 아이템 개수 조회
        int countPendingItemsByTaskId(@Param("batchTaskId") Long batchTaskId);

        // [조회] 특정 작업, 위치, 상품에 해당하는 잔여 PENDING 아이템 하나를 조회 (정밀 매칭)
        TaskItemVO findPendingOne(
                        @Param("batchTaskId") Long batchTaskId,
                        @Param("locationId") Long locationId,
                        @Param("productId") Long productId);

        // [조회] 작업에 속한 특정 지번의 아이템 목록 조회
        List<TaskItemVO> findByTaskIdAndLocationId(
                        @Param("batchTaskId") Long batchTaskId,
                        @Param("locationId") Long locationId);

        // [조회] 특정 작업 아이템 조회
        TaskItemVO findById(@Param("batchTaskItemId") Long batchTaskItemId);

        // [수정] 원자적 수량 업데이트 및 상태 자동 전이
        int updatePickedQuantityAtomic(
                        @Param("batchTaskItemId") Long batchTaskItemId,
                        @Param("increment") Integer increment);

        // [수정] 아이템 상태 변경 (DONE)
        int updateStatus(
                        @Param("batchTaskItemId") Long batchTaskItemId,
                        @Param("status") String status);

        // [조회] 다음 수행할 PENDING 아이템 조회
        TaskItemVO findNextItem(@Param("batchTaskId") Long batchTaskId);

        // [목록] 작업 전체 아이템 목록 조회
        List<TaskItemVO> findAllByTaskId(@Param("batchTaskId") Long batchTaskId);
}
