# 트릭컬 업데이트 알림 봇 - 설정 가이드

## 사전 요구사항

- Node.js 20 이상
- Docker / Docker Compose
- Discord 서버 관리자 권한 (Webhook 생성용)
- Chrome 브라우저 (네이버 API 엔드포인트 확인용)

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
   - URL에 `articles`, `board`, `lounge` 등의 키워드가 포함될 가능성이 높음

   **② 게시글 상세 API** (`NAVER_ARTICLE_API_BASE_URL`)
   - 게시글을 클릭했을 때 발생하는 요청
   - JSON 응답에 본문 내용(`content`, `body` 등)이 포함된 항목
   - URL 끝에 게시글 ID가 포함된 형태 (예: `.../articles/12345`)
   - **ID 부분을 제거한 base URL**을 환경변수에 입력 (예: `.../articles`)
   - 설정하지 않으면 본문 미리보기 없이 제목/날짜만 전송됨

5. 응답 JSON에서 아래 필드명 확인 후 메모
   - 게시글 ID 필드명 (예: `articleId`, `id`)
   - 제목 필드명 (예: `subject`, `title`)
   - 작성일 필드명 (예: `regDate`, `writtenAt`)
   - 본문 필드명 (예: `content`, `body`)

> 응답 필드명이 예시와 다를 경우 `src/services/naver/NaverLoungeService.ts`의 파싱 부분을 수정해야 합니다.

---

## 2. Discord Webhook URL 발급

1. 알림을 받을 Discord 채널 우클릭 → **채널 편집**
2. **연동** 탭 → **웹후크** → **새 웹후크**
3. 이름 설정 (예: `트릭컬 업데이트 알리미`) 후 **웹후크 URL 복사**

---

## 3. 환경변수 설정

프로젝트 루트에 `.env` 파일 생성 (`.env.example` 참고):

```env
# Discord 봇 토큰 (Discord Developer Portal에서 발급)
DISCORD_TOKEN=

# Discord 앱 ID
CLIENT_ID=

# 봇을 사용할 Discord 서버 ID
GUILD_ID=

# PostgreSQL 비밀번호
POSTGRES_PASSWORD=your_password

# PostgreSQL 접속 URL (POSTGRES_PASSWORD와 동일하게 입력)
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/trickcal_bot?schema=bot

# Redis 접속 URL (기본값 그대로 사용 가능)
REDIS_URL=redis://localhost:6379

# 2단계에서 복사한 Discord Webhook URL
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# 1단계에서 복사한 네이버 게시판 목록 API URL
NAVER_BOARD_API_URL=https://apis.naver.com/...

# 1단계에서 복사한 게시글 상세 API base URL (ID 제외, 미설정 시 본문 미리보기 비활성화)
NAVER_ARTICLE_API_BASE_URL=https://apis.naver.com/.../articles
```

---

## 4. 실행

```bash
# 의존성 설치
npm install

# Docker로 PostgreSQL + Redis 실행
docker-compose up -d

# 봇 실행
npm run dev
```

---

## 5. 정상 실행 확인

봇 실행 직후 터미널에 아래 로그가 출력되면 정상입니다.

```
[MonitorJob] 모니터링 시작 (5분 주기)
[MonitorJob] 초기화 완료. 기준 ID: 12345
```

이후 5분마다 게시판을 확인하며, `[업데이트]` / `[업데이트PV]` / `[개발자 노트]` 제목의 새 게시글이 올라오면 Discord 채널에 자동으로 알림을 전송합니다.

---

## 알림 키워드 변경

`src/config/filters.ts`의 `FILTER_KEYWORDS` 배열을 수정하면 알림 대상 키워드를 변경할 수 있습니다.

```typescript
export const FILTER_KEYWORDS = ['[업데이트]', '[업데이트PV]', '[개발자 노트]'];
```
