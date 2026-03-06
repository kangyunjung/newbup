
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Step0_Intro } from './components/Step0_Intro';
import { Step1_Mission } from './components/Step1_Mission';
import { Step2_Vision } from './components/Step2_Vision';
import { Step3_Value } from './components/Step3_Value';
import { Step4_Internalization } from './components/Step4_Internalization';
import { Step5_Outro } from './components/Step5_Outro';
import { AdminDashboard } from './components/AdminDashboard';
import { FacilitatorView } from './components/FacilitatorView';
import { OnboardingModal } from './components/OnboardingModal'; 
import { TransitionLoader } from './components/TransitionLoader'; 
import { LandingPage } from './components/LandingPage';
import { StorageService } from './services/storageService';
import { UserProfile, StepId } from './types';
import { Button } from './components/Button';
import { Modal, ModalProps } from './components/Modal';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<'login' | 'dashboard' | 'admin' | 'facilitator' | StepId>('login');
  const [unlockedSteps, setUnlockedSteps] = useState<StepId[]>([StepId.INTRO]);
  const [completedSteps, setCompletedSteps] = useState<StepId[]>([]);
  
  const [showLanding, setShowLanding] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [modal, setModal] = useState<ModalProps>({ isOpen: false, onClose: () => {}, message: '' });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState('');
  const [isInit, setIsInit] = useState(true);

  // 진행 상황 복구 및 상태 동기화 함수
  const restoreProgress = async () => {
    const currentUser = StorageService.getUser();
    if (!currentUser) return;

    // 최신 데이터 가져오기
    const data = await StorageService.getWorkshopData();

    const unlocked = new Set<StepId>([StepId.INTRO]);
    const completed = new Set<StepId>(completedSteps);

    // [Step 0 완료 판정 로직]
    const hasMyProfile = !!data.step0_aiProfile;
    const hasNextProgress = !!(data.step1_mission || data.step2_vision || (data.step3_votes && data.step3_votes.length > 0));

    if (hasMyProfile || hasNextProgress) {
      completed.add(StepId.INTRO);
      unlocked.add(StepId.MISSION); 
    }
    
    // 이후 단계 체크
    if (data.step1_mission) {
      completed.add(StepId.MISSION);
      unlocked.add(StepId.VISION);
    }
    if (data.step2_vision) {
      completed.add(StepId.VISION);
      unlocked.add(StepId.VALUE);
    }
    if (data.step3_votes && data.step3_votes.length > 0) {
      completed.add(StepId.VALUE);
      unlocked.add(StepId.INTERNALIZATION);
    }
    if (data.step4_templateId) { 
      completed.add(StepId.INTERNALIZATION);
      unlocked.add(StepId.OUTRO);
    }
    if (data.step5_feedback) {
      completed.add(StepId.OUTRO);
    }

    setUnlockedSteps(Array.from(unlocked));
    setCompletedSteps(Array.from(completed));
  };

  useEffect(() => {
    const initApp = async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'facilitator') {
          await StorageService.checkDbConnection();
          setCurrentView('facilitator');
          setIsInit(false);
          return;
      }

      await StorageService.checkDbConnection();
      const savedUser = StorageService.getUser();
      if (savedUser) {
        setUser(savedUser);
        setShowLanding(false);
        if (savedUser.isReadOnly) {
            setCurrentView(StepId.OUTRO);
        } else {
            setCurrentView('dashboard');
            await restoreProgress(); 
        }
      }
      setIsInit(false);
    };
    initApp();
  }, []);

  // 대시보드 뷰로 바뀔 때 동기화
  useEffect(() => {
    if (currentView === 'dashboard' && user) {
        restoreProgress();
    }
  }, [currentView]);

  const refreshUser = () => {
    const updatedUser = StorageService.getUser();
    if (updatedUser) {
      setUser(updatedUser);
      restoreProgress();
    }
  };

  const handleLogin = async (newUser: UserProfile) => {
    setUser(newUser);
    setTransitionMessage("워크숍 환경을 구성하는 중입니다...");
    setIsTransitioning(true);
    await new Promise(r => setTimeout(r, 1200));
    
    if (newUser.isReadOnly) {
        setCurrentView(StepId.OUTRO);
        setIsTransitioning(false);
    } else {
        setCurrentView('dashboard');
        setIsTransitioning(false);
        setShowOnboarding(true); 
        await restoreProgress();
    }
  };

  const handleLogout = () => {
    StorageService.logout();
    setUser(null);
    setCurrentView('login');
    setUnlockedSteps([StepId.INTRO]);
    setCompletedSteps([]);
    setShowOnboarding(false);
    setShowLanding(true);
  };

  const handleStepComplete = async (step: StepId) => {
    setTransitionMessage("결과를 저장하고 다음 단계를 시작합니다...");
    setIsTransitioning(true);
    
    setCompletedSteps(prev => Array.from(new Set([...prev, step])));
    const nextStep = step + 1;
    if (nextStep <= StepId.OUTRO) {
      setUnlockedSteps(prev => Array.from(new Set([...prev, nextStep])));
      setCurrentView(nextStep as StepId); 
    } else {
      setCurrentView('dashboard'); 
    }
    
    await restoreProgress();
    setIsTransitioning(false);
  };

  const handleStepEnter = async (step: StepId) => {
    setTransitionMessage("데이터를 불러오는 중입니다...");
    setIsTransitioning(true);

    if (user && !user.isCaptain && (step === StepId.MISSION || step === StepId.VISION)) {
      try {
        const items = await StorageService.getBoardItems(step);
        const decisionItem = items.find(i => 
          i.authorGroup === user.group && 
          (i.category === 'MISSION_DECISION' || i.category === 'VISION_DECISION')
        );

        if (decisionItem) {
          let status = '';
          try { status = JSON.parse(decisionItem.extraInfo || '{}').status; } catch(e) {}

          if (status === 'CONFIRMED') {
             const currentData = await StorageService.getWorkshopData();
             let synced = false;
             
             if (step === StepId.MISSION && (!currentData.step1_mission || currentData.step1_mission !== decisionItem.content)) {
                 await StorageService.saveWorkshopData({ step1_mission: decisionItem.content });
                 synced = true;
             } else if (step === StepId.VISION && (!currentData.step2_vision || currentData.step2_vision !== decisionItem.content)) {
                 await StorageService.saveWorkshopData({ step2_vision: decisionItem.content });
                 synced = true;
             }

             if (synced || !completedSteps.includes(step)) {
                 await restoreProgress(); 
                 setIsTransitioning(false);
                 setModal({
                   isOpen: true,
                   onClose: () => setModal(prev => ({ ...prev, isOpen: false })),
                   type: 'alert',
                   title: 'STEP COMPLETED',
                   message: '조장이 최종 의사결정을 완료했습니다.\n자동으로 완료 처리되어 다음 단계가 잠금 해제되었습니다.'
                 });
                 return;
             }
          }
        }
      } catch (error) {
        console.error("Step check failed", error);
      }
    }

    await new Promise(resolve => setTimeout(resolve, 800));
    setCurrentView(step);
    setIsTransitioning(false);
  };

  if (isInit) {
    return <TransitionLoader message="시스템 연결 상태를 확인 중입니다..." />;
  }

  if (showLanding && !user) {
    return <LandingPage onStart={() => setShowLanding(false)} />;
  }

  const renderContent = () => {
    if (currentView === 'facilitator') {
      return (
        <FacilitatorView 
            onClose={() => {
                const params = new URLSearchParams(window.location.search);
                if (params.get('mode') === 'facilitator') {
                    window.location.href = window.location.pathname;
                } else {
                    setCurrentView('admin');
                }
            }} 
        />
      );
    }

    if (currentView === 'admin') {
      return (
        <AdminDashboard 
          onClose={() => setCurrentView(user ? 'dashboard' : 'login')} 
          onOpenFacilitator={() => setCurrentView('facilitator')}
          isPreAuthenticated={isAdminLoggedIn}
          onLoginSuccess={() => setIsAdminLoggedIn(true)}
        />
      );
    }

    if (!user) {
      return (
        <Login 
          onLogin={handleLogin} 
          onAdminEnter={() => setCurrentView('admin')} 
          onShowLanding={() => setShowLanding(true)}
        />
      );
    }

    if (currentView === 'dashboard') {
      return (
        <div className="flex flex-col h-full animate-fade-in-up relative">
          <Dashboard 
            unlockedSteps={unlockedSteps} 
            completedSteps={completedSteps}
            onSelectStep={handleStepEnter} 
          />
          <div className="mt-12 flex justify-center">
             <Button variant="secondary" onClick={handleLogout} className="text-sm py-2 px-6 opacity-70 hover:opacity-100 bg-slate-800/50">
               로그아웃 (처음부터 다시하기)
             </Button>
          </div>
          {showOnboarding && (
            <OnboardingModal 
              userName={user.name} 
              onClose={() => setShowOnboarding(false)} 
            />
          )}
        </div>
      );
    }

    return (
      <div className="w-full animate-fade-in-up">
        {!user.isReadOnly && (
            <div className="mb-10">
              <button 
                  onClick={async () => {
                      setIsTransitioning(true);
                      await restoreProgress(); 
                      setCurrentView('dashboard');
                      setIsTransitioning(false);
                  }}
                  className="group relative inline-flex items-center gap-3 bg-white border-[3px] border-black px-6 py-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                  <div className="w-8 h-8 bg-black flex items-center justify-center text-white font-black group-hover:rotate-12 transition-transform">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M15 19l-7-7 7-7"></path></svg>
                  </div>
                  <span className="text-black font-black text-xl uppercase italic tracking-tighter">Dashboard</span>
              </button>
            </div>
        )}

        {currentView === StepId.INTRO && (
          <Step0_Intro 
            user={user} 
            onComplete={() => handleStepComplete(StepId.INTRO)} 
            onUserUpdate={refreshUser}
          />
        )}
        {currentView === StepId.MISSION && <Step1_Mission user={user} onComplete={() => handleStepComplete(StepId.MISSION)} />}
        {currentView === StepId.VISION && <Step2_Vision user={user} onComplete={() => handleStepComplete(StepId.VISION)} />}
        {currentView === StepId.VALUE && <Step3_Value user={user} onComplete={() => handleStepComplete(StepId.VALUE)} />}
        {currentView === StepId.INTERNALIZATION && <Step4_Internalization user={user} onComplete={() => handleStepComplete(StepId.INTERNALIZATION)} />}
        {currentView === StepId.OUTRO && <Step5_Outro user={user} onReset={handleLogout} />}
      </div>
    );
  };

  return (
    <Layout fullWidth={currentView === 'facilitator'}>
      <Modal {...modal} />
      {isTransitioning && <TransitionLoader message={transitionMessage} />}
      {renderContent()}
    </Layout>
  );
};

export default App;
