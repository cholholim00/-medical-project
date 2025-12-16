# 🩺 AI 혈압 코치 대시보드 (Health Coach Web & API)

개인 혈압·혈당 기록을 모아서  
**대시보드 · AI 코치 · 라이프스타일 인사이트 · 코칭 히스토리**까지 제공하는  
풀스택 헬스케어 미니 프로젝트입니다.

- 프론트엔드: **Next.js 15(App Router) + TypeScript + Tailwind CSS**
- 백엔드: **Express + Prisma + SQLite**
- 인증: **JWT 기반 이메일/비밀번호 로그인**
- AI: **OpenAI Responses API (gpt-4.1-mini)**

> 목표  
> “누가 봐도 실용적이고 잘 정리된 **AI 헬스케어 포트폴리오 프로젝트** 하나 만들기”

---

## 💡 주요 기능 (버전별 정리)

### ✅ Version 1 — 기본 건강 기록 & 대시보드

**핵심 기능**

- 혈압 / 혈당 기록 저장
  - 수축기(`value1`), 이완기(`value2`), 상태(`state`), 메모(`memo`)
- 최근 7일 요약 대시보드
  - 가장 최근 측정값
  - 최근 7일 평균 혈압 / 평균 혈당
  - 최근 기록 리스트(최대 10개)
- 혈압 범위 자동 분류
  - 정상 / 상승 / 1단계 / 2단계 의심
- 혈압 추이 라인 차트
  - `/charts` 페이지에서 최근 N일(7/14/30) 혈압 추이 시각화
- 샘플 데이터
  - 2주치 랜덤 혈압 데이터 자동 생성 (개발용)
  - 모든 기록 한 번에 삭제(초기화) 버튼

---

### ✅ Version 2 — 목표 혈압 & AI 혈압 코치

**추가 기능**

- 🎯 **목표 혈압 설정 (`/settings`)**
  - Prisma `UserProfile` 테이블로 목표 수축기/이완기 저장
  - 대시보드·AI 코치에서 목표 값과 실제 평균/최근 혈압 비교

- 🤖 **AI 코치 페이지 (`/ai-coach`)**
  - 최근 N일(7/14/30) 요약 데이터 조회
  - 사용자가 직접 `현재 상태 / 고민` 메모 입력
  - OpenAI Responses API로:
    - 최근 평균 혈압, 최근 측정값, 혈압 범위 라벨, 목표 혈압, 사용자 메모를 한 번에 보내고
    - 부드러운 한국어 존댓말 코멘트 생성
  - “의사”가 아닌 **생활 습관 코치 톤**으로 답변 (진단/치료 지시 X)

---

### ✅ Version 2.5 — 라이프스타일 인사이트 & AI 코칭 히스토리

#### 1) 라이프스타일 인사이트 (`/insights`)

혈압 기록에 다음 필드를 추가해서 **생활 습관별 혈압 차이**를 통계로 확인:

- `sleepHours`: 수면 시간
- `exercise`: 운동 여부 (`true` / `false`)
- `stressLevel`: 스트레스 지수 (1~5)

백엔드에서 그룹별 평균 혈압 계산:

- 수면
  - 6시간 미만 vs 6시간 이상
- 운동
  - 운동한 날 vs 운동 안 한 날
- 스트레스
  - 낮음(1~2) / 중간(3) / 높음(4~5)

프론트 `/insights`에서 테이블로 시각화 +  
**“🧠 AI 인사이트 받기” 버튼**으로 OpenAI를 호출해서:

- 데이터 기반으로 “경향/가능성”만 조심스럽게 설명
- 마지막에는 항상 “참고용이며, 정확한 판단은 의료 전문가 상담” 안내

---

#### 2) AI 코치 히스토리 (`/ai-history`)

OpenAI 호출 결과를 **DB에 로그로 저장**해서 타임라인처럼 조회:

- Prisma 모델 `AiCoachLog`

```prisma
model AiCoachLog {
  id        Int      @id @default(autoincrement())
  userId    Int
  createdAt DateTime @default(now())
  type      String      // "coach" | "lifestyle" 등
  rangeDays Int
  userNote  String?
  source    String?
  aiMessage String
}
•	/api/ai/coach 호출 시
•	type = "coach", userNote 포함해서 저장
•	/api/ai/lifestyle 호출 시
•	type = "lifestyle", 통계 기반 코멘트 저장
•	/api/ai/history
•	최근 N개 히스토리 조회 (기본 20개, 최대 100개)

프론트 /ai-history 페이지에서:
•	생성 시각, 코칭 종류, 분석 기간(rangeDays),
사용자가 남긴 메모, AI 코멘트까지 한 번에 표시
```

✅ Version 3 — 인증 · 멀티 유저 · 모바일 대시보드
1) JWT 기반 인증 & 멀티 유저 지원
•	이메일/비밀번호 회원가입 & 로그인
•	JWT 발급 (기본 7일 유효)
•	모든 주요 API가 로그인 사용자별 userId 스코프로 동작
•	프론트:
•	/auth/register – 회원가입 페이지
•	/auth/login – 로그인 페이지
•	로그인 시 localStorage(hc_token, hc_user)에 저장
•	로그아웃 시 토큰/유저 정보 제거 후 대시보드 초기화
2) 계정 관리 & 회원 탈퇴
•	GET /api/auth/me – 내 계정 정보 조회
•	DELETE /api/auth/me – 회원 탈퇴
•	관련 데이터 일괄 삭제:
•	AiCoachLog, HealthRecord, UserProfile, User
•	(선택) 프론트에서 “회원 탈퇴” 버튼을 통해 호출 가능하도록 UI 제공
3) 모바일 전용 대시보드 & 체크인
•	/mobile – 모바일 최적화 대시보드
•	작은 화면 기준으로 카드형 UI, 큰 버튼 중심
•	/mobile/checkin – 빠른 혈압/생활습관 체크인 폼
•	혈압 + 수면/운동/스트레스까지 한 번에 기록
•	메인 / 페이지에서 “📱 모바일 대시보드로 보기” 링크 제공

# 🏗 아키텍처 개요
```bash
폴더 구조 (요약)
health-coach/
├─ health-coach-backend/           # Express + Prisma + SQLite
│   ├─ prisma/
│   │   ├─ schema.prisma
│   │   └─ migrations/
│   ├─ src/
│   │   ├─ server.ts               # Express 엔트리
│   │   ├─ lib/
│   │   │   └─ prisma.ts           # PrismaClient 설정
│   │   ├─ middleware/
│   │   │   └─ auth.ts             # JWT 인증 미들웨어 (requireAuth)
│   │   ├─ routes/
│   │   │   ├─ auth.ts             # 회원가입/로그인/회원탈퇴/내정보
│   │   │   ├─ records.ts          # 건강 기록 API
│   │   │   ├─ user.ts             # UserProfile(목표 혈압) API
│   │   │   └─ ai.ts               # AI 코치 / 인사이트 / 히스토리 API
│   └─ .env
└─ health-coach-web/               # Next.js 프론트
    ├─ app/
    │   ├─ page.tsx                # 메인 대시보드
    │   ├─ charts/page.tsx         # 혈압 라인차트
    │   ├─ records/page.tsx        # 전체 기록 관리
    │   ├─ records/new/page.tsx    # 새 기록 추가 폼
    │   ├─ settings/page.tsx       # 목표 혈압 설정
    │   ├─ ai-coach/page.tsx       # AI 코치
    │   ├─ insights/page.tsx       # 라이프스타일 인사이트
    │   ├─ ai-history/page.tsx     # AI 코치 히스토리
    │   ├─ auth/
    │   │   ├─ login/page.tsx      # 로그인 페이지
    │   │   └─ register/page.tsx   # 회원가입 페이지
    │   └─ mobile/
    │       ├─ page.tsx            # 모바일 전용 대시보드
    │       └─ checkin/page.tsx    # 모바일 빠른 체크인 폼
    └─ ...
```
#### 🧪 주요 API 정리

1) Auth

- POST /api/auth/register

  - 회원가입

  - Body 예시:
- POST /api/auth/login
```json
{ "email": "user@example.com", "password": "123456", "name": "홍길동" }
```


  - 로그인 후 JWT 토큰 발급

  - Response 예시:
```json
{
"token": "JWT_TOKEN_HERE",
"user": { "id": 1, "email": "user@example.com", "name": "홍길동" }
}
```

- GET /api/auth/me (JWT 필요)

  - 현재 로그인한 사용자 정보 조회

- DELETE /api/auth/me (JWT 필요)

  - 회원 탈퇴 (관련 데이터 모두 삭제)

2) Health Records

- GET /health-check

  - 서버 상태 확인

- GET /api/records?type=blood_pressure

  - 혈압 기록 리스트 조회

  - type=blood_sugar 로 혈당도 조회 가능

- POST /api/records

  - 혈압/혈당 기록 추가

- PUT /api/records/:id

   - 기록 수정

- DELETE /api/records/:id

   - 기록 삭제

- POST /api/records/dev/seed-bp

  - 개발용 샘플 혈압 데이터 생성

  - Body: { "days": 14, "perDay": 5 } 형태로 개수 조절 가능

- DELETE /api/records/dev/clear-all

  - 모든 건강 기록 삭제 (초기화 버튼용)

- GET /api/records/stats/summary?rangeDays=7

  - 혈압/혈당 평균 + 측정 횟수 요약

- GET /api/records/stats/lifestyle?rangeDays=30

  - 수면/운동/스트레스 그룹별 평균 혈압 통계

3) User Profile (목표 혈압)

- GET /api/user/profile (JWT 필요)

  - 현재 저장된 목표 혈압 조회

- POST /api/user/profile (JWT 필요)

  - 목표 혈압 저장/업데이트

  - Body 예시:
```json
{ "targetSys": 120, "targetDia": 80 }
```
4) AI Coach

- POST /api/ai/coach (JWT 필요)

Body 예시:
```json
{
"rangeDays": 7,
"userNote": "요즘 잠도 부족하고, 커피를 많이 마셔요."
}
```

기능:

- 최근 N일 혈압 통계 + 최근 측정 + 목표 혈압 + 사용자 메모를 합쳐 코멘트 생성

- 생성된 AI 코치 메시지를 AiCoachLog에 저장

- POST /api/ai/lifestyle (JWT 필요)

Body 예시:
```json
{
"rangeDays": 30
}
```

기능:

- 수면/운동/스트레스 그룹별 혈압 평균을 기반으로 인사이트 코멘트 생성

- 역시 AiCoachLog에 저장


- GET /api/ai/history?limit=50 (JWT 필요)

  - AiCoachLog 히스토리 조회

  - type / createdAt / rangeDays / userNote / aiMessage 포함

#### 🧰 기술 스택
Frontend

- Next.js (App Router)

- React / TypeScript

- Tailwind CSS

- Recharts (라인 차트)

- LocalStorage 기반 JWT 관리

Backend

- Node.js + Express

- TypeScript

- Prisma (ORM) + SQLite

- OpenAI Responses API

- JWT 인증 (jsonwebtoken) + 비밀번호 해시(bcryptjs)

#### 🖥 로컬 실행 방법
1) 백엔드
```bash
   cd health-coach-backend

# 의존성 설치
npm install

# .env 설정
# DATABASE_URL, OPENAI_API_KEY, JWT_SECRET 등
# 예: cp .env.example .env (있다면) 또는 직접 .env 생성

# Prisma 마이그레이션
npx prisma migrate dev

# 개발 서버 실행
npm run dev
# 기본: http://localhost:5001
```
2) 프론트엔드 
```bash
cd health-coach-web

# 의존성 설치
npm install

# .env.local 에 API_BASE 설정 (필수)
# 예)
# NEXT_PUBLIC_API_BASE=http://localhost:5001

# 개발 서버 실행
npm run dev
# 기본: http://localhost:3000

```
프론트 코드에서는 API_BASE를 .env 또는 상수로 관리:
```bash
const API_BASE =
process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:5001';
```
#### 🚀 향후 개선 아이디어
- 소셜 로그인(Google, Kakao 등) 확장

- 반응형 UI 고도화 및 모바일 앱(React Native) 버전으로 확장

- 알림/리마인더 (예: 혈압 측정 시간 푸시)

- CSV/Excel로 기록 내보내기

- 더 다양한 건강 지표 확장 (체중, 심박수, 운동량 등)

- 실제 배포

- 백엔드: Render / Railway / Fly.io

- 프론트: Vercel / Netlify