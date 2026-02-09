package lookie.backend.domain.control.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 구역 내 작업자 상세 정보를 담는 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ZoneWorkerDto {
    /** 작업자 ID (User ID) */
    private Long workerId;
    /** 작업자 이름 (개인정보 보호를 위해 '이름 + 전화번호 뒷 4자리'로 포맷팅됨) */
    private String name;
    /** 금일 완료한 작업 수 (Tasks Completed) */
    private Integer workCount;
    /** 시간당 처리 속도 (UPH) - 현재 0.0 고정 */
    private Double processingSpeed;
    /** 현재 할당된 배치의 진행률 (0.0 ~ 100.0) */
    private Double currentTaskProgress;
    /** 작업자 상태 (WORKING, PAUSED 등) */
    private String status;
    /** WebRTC 통화 연결 상태 */
    private String webrtcStatus;

    /**
     * 작업자 전화번호
     * 이름 포맷팅 로직(동명이인 구분)에만 사용되며, JSON 응답에는 포함되지 않음.
     */
    @JsonIgnore
    private String phoneNumber;
}
