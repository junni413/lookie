package lookie.backend.domain.webrtc.mapper;

import lookie.backend.domain.webrtc.vo.CallHistoryVO;
import org.apache.ibatis.annotations.Mapper;
import java.util.Optional;

@Mapper
public interface CallHistoryMapper {

    // 1. 저장 (Insert) - useGeneratedKeys로 ID를 VO에 채워줌
    void save(CallHistoryVO callHistoryVO);

    // 2. 조회 (Select)
    Optional<CallHistoryVO> findById(Long id);

    // 3. 수정 (Update) - 상태 변경용
    void update(CallHistoryVO callHistoryVO);
}