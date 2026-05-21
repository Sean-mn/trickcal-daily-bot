# 트릭컬 업데이트 알림 봇 - 설정 가이드

## 사전 요구사항

- Node.js 20 이상
- Docker / Docker Compose
- Discord 서버 관리자 권한

---

## 1. 네이버 게임 라운지 API 엔드포인트 확인

봇이 게시판을 읽어오기 위한 URL을 한 번만 확인해야 합니다.

1. Chrome에서 아래 URL 접속
   ```
   https://game.naver.com/lounge/Trickcal/board/11
   ```

2. `F12` → **Network** 탭 → 상단 필터에서 **Fetch/XHR** 선택

3. 페이지 새로고침 (`F5`)

4. Network 목록에서 두 가지 요청을 찾아 URL을 복사합니다.

   **① 게시글 목록 API** (`NAVER_BOARD_API_URL`)
   - JSON 응답에 게시글 ID, 제목, 날짜 목록이 포함된 항목
   - URL에 `feed`, `lounge` 등의 키워드가 포함됨

   **② 게시글 상세 API** (`NAVER_ARTICLE_API_BASE_URL`)
   - 게시글을 클릭했을 때 발생하는 요청
   - **ID 부분을 제거한 base URL**을 환경변수에 입력 (예: `.../feed`)
   - 설정하지 않으면 본문 미리보기 없이 제목/날짜만 전송됨

---

## 2. 환경변수 설정

프로젝트 루트에 `.env` 파일 생성 (`.env.example` 참고):

```env
# Discord 봇 토큰 (Discord Developer Portal에서 발급)
DISCORD_TOKEN=

# Discord 앱 ID
CLIENT_ID=

# 로컬 개발 전용: 슬래시 커맨드를 특정 서버에 즉시 등록할 때만 사용
# 배포 환경에서는 생략 (글로벌 커맨드로 등록됨, 반영까지 최대 1시간)
GUILD_ID=

# PostgreSQL 비밀번호
POSTGRES_PASSWORD=your_password

# PostgreSQL 접속 URL (POSTGRES_PASSWORD와 동일하게 입력)
DATABASE_URL=postgresql://postgres:your_password@db:5432/trickcal_bot?schema=bot

# Redis 접속 URL (기본값 그대로 사용 가능)
REDIS_URL=redis://redis:6379

# 1단계에서 복사한 네이버 게시판 목록 API URL (쉼표로 구분하여 여러 개 입력 가능)
NAVER_BOARD_API_URL=https://comm-api.game.naver.com/...

# 1단계에서 복사한 게시글 상세 API base URL (ID 제외, 미설정 시 본문 미리보기 비활성화)
NAVER_ARTICLE_API_BASE_URL=https://comm-api.game.naver.com/.../feed
```

---

## 3. 슬래시 커맨드 등록

```bash
npm run deploy
```

- `GUILD_ID`가 설정된 경우 해당 서버에만 즉시 등록됩니다 (개발용).
- `GUILD_ID`가 없으면 전체 글로벌 커맨드로 등록됩니다 (배포용, 최대 1시간 소요).

---

## 4. 실행

**Docker로 전체 실행 (배포)**

```bash
docker-compose up -d
```

**로컬 개발**

```bash
# 의존성 설치
npm install

# Docker로 PostgreSQL + Redis만 실행
docker-compose up -d db redis

# 봇 실행
npm run dev
```

---

## 5. 알림 채널 설정

봇이 실행된 후, 알림을 받을 Discord 서버에서 아래 슬래시 커맨드를 실행합니다.

```
/알림채널 채널이름: 공지
```

- 서버 관리 권한이 있는 멤버만 실행할 수 있습니다.
- 서버별로 독립적으로 설정됩니다.

---

## 6. 정상 실행 확인

봇 실행 직후 터미널에 아래 로그가 출력되면 정상입니다.

```
[MonitorJob] 모니터링 시작 (3분 주기)
[MonitorJob] 초기화 완료. 기준 ID: 12345
```

이후 3분마다 게시판을 확인하며, 새 게시글이 올라오면 설정된 Discord 채널에 자동으로 알림을 전송합니다.

---

## 알림 키워드 변경

`src/config/filters.ts`의 `FILTER_KEYWORDS` 배열을 수정하면 알림 대상 키워드를 변경할 수 있습니다.

```typescript
export const FILTER_KEYWORDS = ['[업데이트]', '[업데이트PV]', '[개발자 노트]', '[점검]', '[테마극장]', '[이벤트]', '[안내]'];
```
