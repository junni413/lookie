package lookie.backend.domain.control.mapper;

import lookie.backend.domain.control.vo.RebalanceSnapshotVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface RebalanceMapper {

    /**
     * 특정 배치의 최신 스냅샷(MAX(ts)) 조회
     * 
     * @param batchId 조회할 배치 ID
     * @return 스냅샷 리스트
     */
    List<RebalanceSnapshotVO> selectLatestSnapshots(@Param("batchId") Long batchId);
}
