CREATE TABLE call_history
(
    id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
    open_vidu_session_id VARCHAR(255) NOT NULL,
    caller_id            BIGINT       NOT NULL,
    callee_id            BIGINT       NOT NULL,
    issue_id             BIGINT       NULL,
    -- NO_ANSWER 추가됨 --
    status               VARCHAR(50)  NOT NULL COMMENT 'WAITING, ACTIVE, REJECTED, ENDED, CANCELED, NO_ANSWER',
    start_time           DATETIME     NULL,
    end_time             DATETIME     NULL,
    created_at           DATETIME DEFAULT CURRENT_TIMESTAMP
);