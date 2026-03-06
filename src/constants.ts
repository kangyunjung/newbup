
import { StepId } from './types';

// ============================================================================
// [USER CONFIGURATION AREA]
// * 아래 FIREBASE_CONFIG 객체 안에 본인의 파이어베이스 설정값을 입력해주세요.
// * 값을 입력하면 자동으로 DB 모드로 동작합니다.
// ============================================================================
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCP8iO9QWkn4iMsEHe4i0LbvruKXDqqiJM",
  authDomain: "build-up-workshop.firebaseapp.com",
  projectId: "build-up-workshop",
  storageBucket: "build-up-workshop.firebasestorage.app",
  messagingSenderId: "52931557170",
  appId: "1:52931557170:web:7b71e5db6db6e551f6892b"
};

export const IS_DEMO_MODE = !FIREBASE_CONFIG.apiKey;

export const STORAGE_KEY_USER = 'buildup_user_v1';
export const STORAGE_KEY_DATA = 'buildup_data_v1';
export const STORAGE_KEY_SESSIONS = 'buildup_sessions_v1';
export const STORAGE_KEY_BOARD = 'buildup_board_v1';
export const STORAGE_KEY_KEYWORD_VOTES = 'buildup_keyword_votes_v1';

// 워크숍 설정 (기업 선호도 높은 20개 핵심가치)
export const CORE_VALUE_OPTIONS = [
  "고객 중심 (Customer Focus)",
  "도전 (Challenge)",
  "협업 (Collaboration)",
  "소통 (Communication)",
  "정직/윤리 (Integrity)",
  "전문성 (Professionalism)",
  "혁신 (Innovation)",
  "신뢰 (Trust)",
  "창의성 (Creativity)",
  "책임감 (Responsibility)",
  "열정 (Passion)",
  "주인의식 (Ownership)",
  "상호존중 (Respect)",
  "실행력 (Execution)",
  "성장 (Growth)",
  "유연성 (Agility)",
  "안전 (Safety)",
  "탁월함 (Excellence)",
  "포용 (Inclusion)",
  "지속가능성 (Sustainability)"
];

export const STEP_INFO = {
  [StepId.INTRO]: { title: "Step 0. Warm Up", subtitle: "AI 프로필 생성", locked: false },
  [StepId.MISSION]: { title: "Step 1. 미션(Why)", subtitle: "우리의 존재 이유", locked: true },
  [StepId.VISION]: { title: "Step 2. 비전(What)", subtitle: "3년 후 우리의 모습", locked: true },
  [StepId.VALUE]: { title: "Step 3. 핵심가치(How)", subtitle: "우리의 일하는 방식", locked: true },
  [StepId.INTERNALIZATION]: { title: "Step 4. 내재화", subtitle: "가치체계도 & Action plan", locked: true },
  [StepId.OUTRO]: { title: "Step 5. 마무리", subtitle: "최종 결과 & 소감 공유", locked: true },
};
