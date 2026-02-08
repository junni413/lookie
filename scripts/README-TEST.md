# 관리자 대시보드 & AI 재배치 테스트 가이드

## 📋 테스트 개요

이 가이드는 관리자 대시보드와 AI 재배치 기능을 테스트하기 위한 더미 데이터와 테스트 절차를 제공합니다.

## 🎯 테스트 시나리오

### 시나리오: 불균형한 작업 분배 상황

- **Zone 1**: 30개 작업 (33% 완료) - 보통
- **Zone 2**: 25개 작업 (60% 완료) - 양호
- **Zone 3**: 40개 작업 (12.5% 완료) - **과부하** ⚠️
- **Zone 4**: 20개 작업 (90% 완료) - **여유** ✅

→ **AI 추천**: Zone 4의 여유 작업자를 Zone 3로 재배치

## 📂 파일 구조

```
scripts/
├── dummy-data-dashboard-test.sql    # 더미 데이터 SQL 스크립트
├── test-dashboard-api.http          # API 테스트 (REST Client)
└── README-TEST.md                   # 이 파일
```

## 🚀 테스트 준비

### 1. 기본 데이터 삽입 (사용자 제공)

먼저 사용자가 제공한 기본 데이터를 삽입합니다:

```sql
-- users (작업자 47명, 관리자 8명)
-- zones (1~4)
-- zone_lines
-- zone_locations
-- products (20개)
```

### 2. 테스트 더미 데이터 삽입

```bash
# MySQL에 접속
mysql -u root -p lookie

# SQL 스크립트 실행
source scripts/dummy-data-dashboard-test.sql
```

또는 GUI 도구 사용:
- MySQL Workbench, DBeaver 등에서 `dummy-data-dashboard-test.sql` 실행

### 3. 데이터 검증

스크립트 실행 후 자동으로 출력되는 검증 쿼리 결과 확인:

```
=== 구역별 작업 현황 ===
zone_id | active_workers | unassigned | in_progress | completed | total | completion_rate
--------|----------------|------------|-------------|-----------|-------|----------------
1       | 10             | 13         | 7           | 10        | 30    | 33.33
2       | 8              | 5          | 5           | 15        | 25    | 60.00
3       | 12             | 25         | 10          | 5         | 40    | 12.50
4       | 6              | 0          | 2           | 18        | 20    | 90.00
```

## 🧪 백엔드 API 테스트

### VS Code REST Client 사용

1. VS Code에서 `REST Client` 확장 설치
2. `test-dashboard-api.http` 파일 열기
3. 각 요청 위에 나타나는 "Send Request" 클릭

### Postman 사용

1. Postman 열기
2. `test-dashboard-api.http` 내용을 참고하여 요청 생성
3. Collection으로 저장하여 순차 실행

### 주요 API 테스트 순서

1. **로그인**
   ```http
   POST /api/auth/login
   {
     "email": "admin1@lookie.com",
     "password": "demo"
   }
   ```
   → 응답에서 `accessToken` 복사

2. **대시보드 요약 조회**
   ```http
   GET /api/control/summary
   Authorization: Bearer {token}
   ```

3. **구역별 현황**
   ```http
   GET /api/control/zones
   ```

4. **AI 재배치 추천**
   ```http
   POST /api/control/rebalance/recommend
   {
     "batchId": 1,
     "deadlineMinutes": 240
   }
   ```

5. **재배치 적용**
   ```http
   POST /api/control/rebalance/apply
   {
     "moves": [
       { "workerId": 37, "fromZoneId": 4, "toZoneId": 3 },
       { "workerId": 38, "fromZoneId": 4, "toZoneId": 3 }
     ]
   }
   ```

## 📊 예상 결과

### 초기 상태 (더미 데이터 삽입 후)

| Zone | 작업자 | 전체 작업 | 완료 | 진행 | 대기 | 진행률 | 상태 |
|------|--------|-----------|------|------|------|--------|------|
| 1    | 10명   | 30개      | 10   | 7    | 13   | 33%    | 보통 |
| 2    | 8명    | 25개      | 15   | 5    | 5    | 60%    | 양호 |
| 3    | 12명   | 40개      | 5    | 10   | 25   | 12.5%  | **과부하** |
| 4    | 6명    | 20개      | 18   | 2    | 0    | 90%    | **여유** |

### AI 재배치 추천 예상 결과

```json
{
  "recommendations": [
    {
      "workerId": 37,
      "currentZoneId": 4,
      "targetZoneId": 3,
      "reason": "Zone 4는 거의 완료, Zone 3는 대기 작업 많음"
    },
    {
      "workerId": 38,
      "currentZoneId": 4,
      "targetZoneId": 3,
      "reason": "균형 조정"
    }
  ],
  "summary": {
    "totalMoves": 2,
    "expectedCompletionImprovement": "25%",
    "balanceScore": 0.85
  }
}
```

### 재배치 적용 후 예상 상태

| Zone | 작업자 | 대기 작업 | 변화 |
|------|--------|-----------|------|
| 1    | 10명   | 13개      | - |
| 2    | 8명    | 5개       | - |
| 3    | **14명** ↑ | 25개      | **+2명** |
| 4    | **4명** ↓ | 0개       | **-2명** |

## 🐛 트러블슈팅

### 문제 1: 데이터가 보이지 않음

**확인사항:**
```sql
-- 작업자 수 확인
SELECT COUNT(*) FROM users WHERE role = 'WORKER';  -- 47명 예상

-- 작업 수 확인
SELECT COUNT(*) FROM batch_tasks;  -- 115개 예상

-- 근무 중인 작업자 확인
SELECT COUNT(*) FROM work_logs WHERE ended_at IS NULL;  -- 36명 예상
```

### 문제 2: AI 서버 연결 실패

**원인:** AI 서버가 실행되지 않음

**해결:**
1. AI 서버 주소 확인 (`.env` 파일)
2. AI 서버 실행 상태 확인
3. 임시로 Mock 데이터 사용

### 문제 3: JWT 토큰 만료

**해결:**
```http
POST /api/auth/login
{
  "email": "admin1@lookie.com",
  "password": "demo"
}
```
새 토큰 발급 후 테스트

### 문제 4: Location ID 관련 오류

**원인:** zone_locations 테이블의 location_id가 예상과 다를 수 있음

**확인:**
```sql
-- Zone별 location_id 범위 확인
SELECT zone_id, MIN(location_id), MAX(location_id), COUNT(*)
FROM zone_locations
GROUP BY zone_id;
```

## 📝 테스트 체크리스트

- [ ] 기본 데이터 삽입 완료 (users, zones, products)
- [ ] 더미 데이터 삽입 완료
- [ ] 데이터 검증 쿼리 통과
- [ ] 관리자 로그인 성공
- [ ] 대시보드 요약 정보 조회 성공
- [ ] 구역별 현황 조회 성공
- [ ] Zone 3이 가장 바쁨 확인 (12.5% 완료)
- [ ] Zone 4가 가장 여유 확인 (90% 완료)
- [ ] 이슈 목록 조회 (5건)
- [ ] AI 재배치 추천 요청 성공
- [ ] 추천 결과 확인 (Zone 4 → Zone 3 이동)
- [ ] 재배치 적용 성공
- [ ] 재배치 후 구역 현황 변경 확인

## 🔄 데이터 초기화

테스트 후 데이터를 초기화하려면:

```sql
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE batch_task_items;
TRUNCATE TABLE batch_tasks;
TRUNCATE TABLE batches;
TRUNCATE TABLE totes;
TRUNCATE TABLE zone_assignments;
TRUNCATE TABLE work_log_events;
TRUNCATE TABLE work_logs;
TRUNCATE TABLE issues;
SET FOREIGN_KEY_CHECKS = 1;
```

그리고 다시 `dummy-data-dashboard-test.sql` 실행

## 📞 문제 발생 시

1. 백엔드 로그 확인
2. 네트워크 탭에서 API 응답 확인
3. 데이터베이스 상태 확인

```sql
-- 전체 데이터 확인
SELECT 'batches' AS table_name, COUNT(*) AS count FROM batches
UNION ALL
SELECT 'batch_tasks', COUNT(*) FROM batch_tasks
UNION ALL
SELECT 'batch_task_items', COUNT(*) FROM batch_task_items
UNION ALL
SELECT 'work_logs', COUNT(*) FROM work_logs
UNION ALL
SELECT 'zone_assignments', COUNT(*) FROM zone_assignments
UNION ALL
SELECT 'issues', COUNT(*) FROM issues;
```

## 🎉 성공 기준

- ✅ 대시보드 API가 정상적으로 응답
- ✅ 구역별 진행률이 올바르게 계산됨
- ✅ AI 재배치 추천이 합리적임 (Zone 4 → Zone 3)
- ✅ 재배치 적용 후 데이터가 업데이트됨
- ✅ 이슈 데이터가 정상 조회됨

## 📚 참고 정보

### 더미 데이터 구성

- **Batches**: 2개 (오전/오후 배치)
- **Tasks**: 115개 (Zone별 분산)
- **Task Items**: 약 345개 (작업당 평균 3개)
- **Totes**: 50개
- **Workers**: 36명 활동 중
- **Issues**: 5건 (OPEN 상태)

### API 엔드포인트

```
GET    /api/control/summary          # 대시보드 요약
GET    /api/control/zones            # 구역별 현황
GET    /api/control/zones/{id}/workers  # 구역별 작업자
GET    /api/control/workers/{id}/hover  # 작업자 호버 정보
POST   /api/control/rebalance/recommend # AI 재배치 추천
POST   /api/control/rebalance/apply     # 재배치 적용
POST   /api/control/assignments         # 수동 구역 배정
GET    /api/issues                      # 이슈 목록
GET    /api/issues/{id}                 # 이슈 상세
POST   /api/issues/{id}/admin/confirm   # 관리자 의사결정
```
