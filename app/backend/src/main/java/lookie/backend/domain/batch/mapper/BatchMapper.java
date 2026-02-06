package lookie.backend.domain.batch.mapper;

import lookie.backend.domain.batch.vo.BatchVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface BatchMapper {
    /**
     * ID로 배치 조회
     */
    BatchVO findById(Long batchId);

    /**
     * 현재 진행 중(IN_PROGRESS)이면서 마감시간(deadline_at)이 가장 빠른 배치 1개 조회
     */
    BatchVO findCurrentInProgress();

    /**
     * 배치 상태 업데이트 (COMPLETED 등)
     */
    int updateStatus(@Param("batchId") Long batchId, @Param("status") String status);
}
