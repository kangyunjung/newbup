
export interface UserProfile {
  name: string;
  company: string; // 회사명
  batch: string;   // 교육차수 (예: 1차수)
  group: string;   // 조 이름 (예: 1조)
  isCaptain?: boolean; // [New] 조장 여부
  isReadOnly?: boolean; // [New] 종료된 세션 열람 모드
}

export enum StepId {
  INTRO = 0,
  MISSION = 1,
  VISION = 2,
  VALUE = 3,
  INTERNALIZATION = 4,
  OUTRO = 5
}

// 개별 사용자가 각 단계에서 입력한 데이터
export interface WorkshopData {
  step0_aiProfile?: string;
  step0_aiProfileImage?: string; // AI 생성 프로필 이미지 (Base64)
  step0_dept?: string;       // 소속(부서/팀)
  step0_dailyLife?: string;  // 요즘 일과 및 일상
  step0_condition?: number;  // 오늘의 컨디션 점수 (0-100)
  step1_mission?: string;
  step2_vision?: string;
  step3_votes?: string[];
  step4_templateId?: number; // [New] 가치체계도 템플릿 ID (1~5)
  step4_structureImage?: string; // (Legacy support)
  step5_feedback?: string;       // [New] 참여 소감
  step5_finalImage?: string;     // [New] 최종 팀 포스터 이미지 (Base64)
}

// 공유 보드 아이템
export interface BoardItem {
  id: string;
  stepId: StepId;
  authorName: string;
  authorGroup: string;
  company?: string; // [New] 데이터 격리를 위한 회사명
  batch?: string;   // [New] 데이터 격리를 위한 차수
  content: string; // 텍스트 내용
  category?: string; // [New] 핵심가치 카테고리 (Step 4용)
  imageUrl?: string; 
  extraInfo?: string; 
  votes: number;
  votedUserIds?: string[]; 
  timestamp: number;
}

// 투표 집계 결과용
export interface VoteResult {
  keyword: string;
  count: number;
}

// 관리자 페이지에서 보여줄 통합 데이터 (유저 정보 + 워크숍 데이터)
export interface ParticipantData extends UserProfile, WorkshopData {
  id: string; // 고유 ID
  joinedAt: number;
}

// 관리자가 설정하는 교육 세션 정보
export interface WorkshopSessionConfig {
  id: string;
  company: string;
  batch: string;
  totalGroups: number; // 총 조 개수
  coreValues?: string[]; // [New] 해당 세션의 핵심가치 선택지 (없으면 기본값 사용)
  startDate?: number; // [New] 시작 일시 (Timestamp)
  endDate?: number;   // [New] 종료 일시 (Timestamp)
  createdAt: number;
}

// [New] 시스템 관리자 정보
export interface AdminUser {
  email: string;
  addedAt: number;
  addedBy?: string; // 누구에 의해 추가되었는지
}
