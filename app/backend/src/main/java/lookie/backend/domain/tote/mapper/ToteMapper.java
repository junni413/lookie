package lookie.backend.domain.tote.mapper;

import lookie.backend.domain.tote.vo.ToteVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ToteMapper {
    // 바코드로 토트 정보 조회
    ToteVO findByBarcode(@Param("barcode") String barcode);

    // 토트와 작업 매핑 업데이트
    int updateToteMapping(@Param("toteId") Long toteId, @Param("batchTaskId") Long batchTaskId);
}
