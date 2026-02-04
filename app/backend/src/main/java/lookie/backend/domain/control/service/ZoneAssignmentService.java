package lookie.backend.domain.control.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.control.mapper.ControlMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 구역 배정 및 해제와 관련된 도메인 로직을 처리하는 서비스
 * - 작업자 출근 시 자동 배정 (Load Balancing)
 * - 퇴근 시 배정 해제
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ZoneAssignmentService {

    private final ControlMapper controlMapper;

    /**
     * 작업자 구역 자동 배정 (Load Balancing)
     * - 가장 한가한(작업자 수가 적은) 구역을 조회 (Row Lock 적용)
     * - 사용자의 배정 구역(assigned_zone_id)을 업데이트
     * - 배정 이력 생성
     */
    @Transactional
    public void assignZoneToWorker(Long workerId) {
        // 1. 가장 적은 수의 작업자가 있는 구역 조회 (Concurrency Control: FOR UPDATE)
        Long recommendedZoneId = controlMapper.selectZoneIdWithFewestWorkers();

        // Error Handling: 가용한 구역이 없는 경우
        if (recommendedZoneId == null) {
            log.error("자동 구역 배정 실패: 사용 가능한 구역 정보가 없습니다. (WorkerID: {})", workerId);
            // 비즈니스 요건에 따라 예외를 던지거나, 배정 없이 진행할 수 있음.
            // 현재 로직상 null이면 배정하지 않고 진행.
            return;
        }

        // 2. 사용자 배정 정보 업데이트
        controlMapper.updateUserAssignedZone(workerId, recommendedZoneId);

        // 3. 기존 활성 배정 종료 (혹시 모를 정합성 유지 - Defensive Coding)
        controlMapper.closeActiveAssignment(workerId);

        // 4. 배정 이력 생성 (Source: AI)
        controlMapper.insertAssignmentHistory(workerId, recommendedZoneId, "출근 시 자동 구역 배정");

        log.info("작업자 자동 구역 배정 완료. WorkerID: {}, ZoneID: {}", workerId, recommendedZoneId);
    }

    /**
     * 작업자 구역 배정 해제 (Unassignment)
     * - 퇴근 시 호출하여 사용자의 배정 구역을 NULL로 설정
     * - 현재 활성 배정 이력을 종료 처리
     */
    @Transactional
    public void unassignZoneFromWorker(Long workerId) {
        // 1. 사용자 배정 정보 초기화 (assigned_zone_id = NULL)
        controlMapper.updateUserAssignedZone(workerId, null);

        // 2. 활성 배정 이력 종료 (ended_at = NOW())
        controlMapper.closeActiveAssignment(workerId);

        log.info("작업자 구역 배정 해제 완료. WorkerID: {}", workerId);
    }
}
