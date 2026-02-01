package lookie.backend.domain.tote.service;

import lombok.RequiredArgsConstructor;
import lookie.backend.domain.task.exception.InvalidToteBarcodeException;
import lookie.backend.domain.tote.exception.ToteAlreadyInUseException;
import lookie.backend.domain.tote.mapper.ToteMapper;
import lookie.backend.domain.tote.vo.ToteVO;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Tote(토트) 도메인 로직 처리 서비스
 */
@Service
@RequiredArgsConstructor
public class ToteService {

    private final ToteMapper toteMapper;

    public ToteVO getByBarcode(String barcode) {
        ToteVO tote = toteMapper.findByBarcode(barcode);
        if (tote == null) {
            throw new InvalidToteBarcodeException();
        }
        return tote;
    }

    @Transactional
    public void mappingToTask(Long toteId, Long taskId) {
        toteMapper.updateToteMapping(toteId, taskId);
    }

    /**
     * 토트가 다른 작업에 사용 중인지 검증
     */
    public void validateToteAvailability(ToteVO tote, Long taskId) {
        if (tote.getCurrentBatchTaskId() != null && !tote.getCurrentBatchTaskId().equals(taskId)) {
            throw new ToteAlreadyInUseException();
        }
    }
}
