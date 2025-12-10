# 🩺 AI 혈압 코치 대시보드 (Health Coach Web & API)

개인 혈압·혈당 기록을 모아서 **대시보드, AI 코치, 라이프스타일 인사이트, 코칭 히스토리**까지 제공하는
풀스택 헬스케어 미니 프로젝트입니다.

- 프론트엔드: **Next.js 15(App Router) + TypeScript + Tailwind CSS**
- 백엔드: **Express + Prisma + SQLite**
- AI: **OpenAI Responses API (gpt-4.1-mini)**

> 목표:  
> “누가 봐도 실용적이고 잘 정리된 **AI 헬스케어 포트폴리오 프로젝트** 하나 만들기”

---

## 💡 주요 기능 (버전별 정리)

### ✅ Version 1 — 기본 건강 기록 & 대시보드

**핵심 기능**

- 혈압 / 혈당 기록 저장
  - 수축기(`value1`), 이완기(`value2`), 상태(`state`), 메모(`memo`)
- 최근 7일 요약 대시보드
  - 최근 측정값
  - 최근 7일 평균 혈압 / 평균 혈당
  - 최근 기록 리스트(최대 10개)
- 혈압 범위 자동 분류
  - 정상 / 상승 / 1단계 / 2단계 의심
- 라인 차트
  - `/charts` 페이지에서 최근 N일(7/14/30) 혈압 추이 시각화
- 샘플 데이터
  - 2주치 랜덤 혈압 데이터 자동 생성 (개발용)
  - 모든 기록 한 번에 삭제(초기화) 버튼

---

### ✅ Version 2 — 목표 혈압 & AI 혈압 코치

**추가 기능**

- 🎯 **목표 혈압 설정 (`/settings`)**
  - `UserProfile` 테이블로 목표 수축기/이완기 저장
  - 대시보드/AI 코치에서 목표 값과 비교

- 🤖 **AI 코치 페이지 (`/ai-coach`)**
  - 최근 N일(7/14/30) 요약 데이터 조회
  - 사용자가 직접 `현재 상태 / 고민` 메모 입력
  - OpenAI Responses API로:
    - 최근 평균 혈압, 최근 측정값, 상태 라벨, 메모, 목표 혈압을 한 번에 보내고
    - 부드러운 한국어 존댓말 코멘트 생성
  - “의사”가 아닌 “생활 습관 코치” 톤으로 답변 (진단/치료 지시 X)

---

### ✅ Version 2.5 — 라이프스타일 인사이트 & AI 코칭 히스토리

#### 1) 라이프스타일 인사이트 (`/insights`)

혈압 기록에 다음 필드를 추가해서, **생활 습관별 혈압 차이**를 통계로 확인:

- `sleepHours`: 수면 시간
- `exercise`: 운동 여부 (`true` / `false`)
- `stressLevel`: 스트레스 지수 (1~5)

백엔드에서 그룹별 평균 혈압 계산:

- 수면
  - 6시간 미만 vs 6시간 이상
- 운동
  - 운동한 날 vs 운동 안 한 날
- 스트레스
  - 낮음(1~2), 중간(3), 높음(4~5)

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
```
- /api/ai/coach 호출 시:

  - type = "coach", userNote 포함해서 저장

- ' /api/ai/lifestyle 호출 시:

  - type = "lifestyle", 통계 기반 코멘트 저장

- /api/ai/history

  - 최근 N개 히스토리 조회 (기본 20개, 최대 100개)

- /ai-history 페이지

  - 생성 시각, 코칭 종류, 분석 기간, 사용자가 남긴 메모, AI 코멘트까지 한 번에 표시

# 🏗 아키텍처 개요
```bash
폴더 구조 (요약)
health-coach/
├─ health-coach-backend/         # Express + Prisma + SQLite
│   ├─ prisma/
│   │   ├─ schema.prisma
│   │   └─ migrations/
│   ├─ src/
│   │   ├─ server.ts             # Express 엔트리
│   │   ├─ lib/
│   │   │   └─ prisma.ts         # PrismaClient 설정
│   │   ├─ routes/
│   │   │   ├─ records.ts        # 건강 기록 API
│   │   │   ├─ user.ts           # UserProfile(목표 혈압) API
│   │   │   └─ ai.ts             # AI 코치 / 인사이트 / 히스토리 API
│   └─ .env
└─ health-coach-web/             # Next.js 프론트
├─ app/
│   ├─ page.tsx              # 메인 대시보드
│   ├─ charts/page.tsx       # 혈압 라인차트
│   ├─ records/page.tsx      # 전체 기록 관리
│   ├─ records/new/page.tsx  # 새 기록 추가 폼
│   ├─ settings/page.tsx     # 목표 혈압 설정
│   ├─ ai-coach/page.tsx     # AI 코치
│   ├─ insights/page.tsx     # 라이프스타일 인사이트
│   └─ ai-history/page.tsx   # AI 코치 히스토리
└─ ...
```
#### 🧪 주요 API 정리

Health Records

- GET /health-check

서버 상태 확인

- GET /api/records?type=blood_pressur

혈압 기록 리스트 조회

- POST /api/records

혈압/혈당 기록 추가

- PUT /api/records/:id

기록 수정

- DELETE /api/records/:id

기록 삭제

- POST /api/records/dev/seed-bp

개발용 샘플 혈압 데이터 생성
{ days, perDay } 파라미터로 개수 조절 가능

- DELETE /api/records/dev/clear-all

모든 건강 기록 삭제 (초기화 버튼용)

- GET /api/records/stats/summary?rangeDays=7

혈압/혈당 평균 + 측정 횟수 요약

- GET /api/records/stats/lifestyle?rangeDays=30

수면/운동/스트레스 그룹별 평균 혈압 통계

User Profile (목표 혈압)

- GET /api/user/profile

현재 저장된 목표 혈압 조회

- POST /api/user/profile

목표 혈압 저장/업데이트

#### AI Coach

- POST /api/ai/coach

Body 예시:
```json
{
"rangeDays": 7,
"userNote": "요즘 잠도 부족하고, 커피를 많이 마셔요."
}
```
기능:

- 최근 N일 혈압 통계 + 최근 측정 + 목표 혈압 + 메모를 합쳐 코멘트 생성

- AI 코치 메시지를 AiCoachLog에 저장


- POST /api/ai/lifestyle

Body 예시:
 ```json
{
"rangeDays": 30
}
```
기능:

- 수면/운동/스트레스 그룹별 혈압 평균을 기반으로 인사이트 코멘트 생성

- 역시 AiCoachLog에 저장


- GET /api/ai/history?limit=50

   - AiCoachLog 히스토리 조회

   - type / createdAt / rangeDays / userNote / aiMessage 포함

#### 🧰 기술 스택
Frontend
- Next.js (App Router)

- React / TypeScript

- Tailwind CSS

- Recharts (라인차트)

Backend
- Node.js + Express

- TypeScript

- Prisma (ORM) + SQLite

- OpenAI Responses API

#### 🖥 로컬 실행 방법
1) 백엔드
```bash
   cd health-coach-backend
   
# 의존성 설치
npm install

# .env 설정
# DATABASE_URL, OPENAI_API_KEY 등
# 예: cp .env.example .env (있다면) 또는 직접 .env 생성

# Prisma 마이그레이션
npx prisma migrate dev

# 개발 서버 실행
npm run dev
# 기본: http://localhost:5001 (또는 4000)에서 동작
```

2) 프론트엔드
```bash
   cd health-coach-web

# 의존성 설치
npm install

# .env.local 에 API_BASE_URL 등 필요시 설정
# 예) NEXT_PUBLIC_API_BASE=http://localhost:5001

# 개발 서버 실행
npm run dev
# 기본: http://localhost:3000
```

프론트 코드에서는 API_BASE를 .env 또는 상수로 관리:

```ts
// 예시
const API_BASE =
process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:5001';
```

#### 📌 포트폴리오 포인트 (어필용)
단순 CRUD가 아니라,

- 시간 범위별 통계

- 혈압 분류 로직

- 라인 차트 시각화

여기에 OpenAI 기반 AI 코치와

- 사용자 메모를 포함한 개인화 코멘트

- 라이프스타일 패턴(수면/운동/스트레스)과 혈압의 관계 설명

그리고 AI 코칭 히스토리까지 DB에 축적해서

- 지난 상담 내용들을 타임라인 형식으로 복습 가능

#### 🚀 향후 개선 아이디어
- 사용자 인증/Login 도입 (multi-user 지원)

- 반응형 UI 개선 및 모바일 최적화

- 알림/리마인더 (예: 혈압 측정 시간 푸시)

- CSV/Excel로 기록 내보내기

- 더 다양한 건강 지표 확장 (체중, 심박수 등)

- 배포

  - 백엔드: Render / Railway / Fly.io

  - 프론트: Vercel / Netlify