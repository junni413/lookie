# 테스트 가이드 (Dev / 더미데이터)

## 사전 준비

1. Docker Desktop 실행
2. 개발 스택 실행(이미 떠있으면 생략)

```powershell
docker compose -f docker-compose.dev.yml up -d --build
```

## 더미데이터 삭제/재생성 (매 테스트 전에 권장)

DB 시드 재적용 + Redis(컨트롤) 캐시 삭제:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev\reset-dummy-data.ps1 -ClearRedisCache
```

특정 시드 SQL 파일로 실행:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev\reset-dummy-data.ps1 -SeedFile scripts/dummy-data-dashboard-test.sql -ClearRedisCache
```

선택(온디맨드 seed 컨테이너 프로필 사용):

```powershell
docker compose -f docker-compose.dev.yml --profile seed up --abort-on-container-exit seed
```

## 테스트 시나리오

### 1) 관리자 대시보드

1. 관리자 대시보드 진입
2. 각 존 카드에 `이슈 N`이 표시되는지 확인
3. 존별 이슈 개수가 아래 화면들과 일관적인지 확인
4. 이슈 관리(존 필터)
5. 맵(이슈 있는 작업자)

### 2) 이슈 관리(존별 필터)

1. 이슈 관리 페이지 진입
2. 필터를 `ALL ZONES`, `ZONE A`, `ZONE B`, `ZONE C`, `ZONE D`로 바꿔가며 확인
3. 선택한 존 기준으로 목록이 필터링되는지 확인
4. 이슈 카드를 클릭하면 이슈 상세로 이동하는지 확인

### 3) 맵(공간 구조 및 실시간 작업자 배치 현황)

1. 맵 페이지 진입
2. 작업자 위치가 맵에 표시되는지 확인
3. 이슈가 있는 작업자가 다른 색으로 표시되는지 확인
4. 작업자에 마우스를 올리면 호버 카드가 뜨는지 확인
5. 마우스를 빼면 호버 카드가 사라지는지 확인
6. 마우스를 호버 카드 위로 옮겨도 카드가 유지되고(카드에 마우스가 올라갈 수 있어야 함) 클릭 가능한지 확인
7. 호버 카드(또는 카드 내 이슈 영역)를 클릭하면 해당 이슈 상세로 이동하는지 확인
8. location code가 `A-01-01` 형식으로 표시되는지 확인

### 4) 작업자 배치 관리 → AI 추천 재배치 모달

1. 작업자 배치 관리 페이지 진입
2. `AI 추천 재배치` 클릭 → 모달 오픈
3. 미리보기 요약의 이동 작업자 목록이 길어졌을 때
4. 목록 영역 내부에서 스크롤(휠)로 내려갈 수 있는지 확인
5. 목록 때문에 모달 전체 높이가 늘어나지 않고 목록만 스크롤되는지 확인
6. `AI 추천 재배치 적용하기` 클릭 후 UI가 일관적으로 업데이트되는지 확인

## 재테스트 루프

1. 더미데이터 재생성 스크립트 실행
2. 브라우저 새로고침(필요하면 강력 새로고침)
3. 위 시나리오 반복
