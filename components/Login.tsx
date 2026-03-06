
import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Modal, ModalProps } from './Modal';
import { StorageService } from '../services/storageService';
import { UserProfile, WorkshopSessionConfig } from '../types';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
  onAdminEnter: () => void;
  onShowLanding: () => void; // [New Prop]
}

export const Login: React.FC<LoginProps> = ({ onLogin, onAdminEnter, onShowLanding }) => {
  const [name, setName] = useState('');
  
  // Selection Mode State
  const [sessions, setSessions] = useState<WorkshopSessionConfig[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  
  // Manual Input Mode State
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualCompany, setManualCompany] = useState('');
  const [manualBatch, setManualBatch] = useState('');
  const [manualGroup, setManualGroup] = useState('');

  // DB Status State
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  // Modal State
  const [modal, setModal] = useState<ModalProps>({ isOpen: false, onClose: () => {}, message: '' });
  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

  // Loading State
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Check DB Connection Status
    const checkDb = async () => {
      const isConnected = await StorageService.checkDbConnection();
      setDbStatus(isConnected ? 'connected' : 'disconnected');
    };
    checkDb();

    // Load sessions created by Admin
    const loadSessions = async () => {
      const loadedSessions = await StorageService.getSessions();
      setSessions(loadedSessions);
      
      // Default selection
      if (loadedSessions.length > 0) {
        setSelectedSessionId(loadedSessions[0].id);
        setSelectedGroup('1조');
      } else {
        // If no sessions exist, fallback to manual mode
        setIsManualMode(true);
      }
    };
    loadSessions();
  }, []);

  const activeSession = sessions.find(s => s.id === selectedSessionId);
  const groupOptions = activeSession 
    ? Array.from({ length: activeSession.totalGroups }, (_, i) => `${i + 1}조`) 
    : [];

  // Check if session is expired
  const isSessionExpired = activeSession?.endDate ? Date.now() > activeSession.endDate : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setModal({ isOpen: true, onClose: closeModal, type: 'alert', title: '체크!', message: '이름을 입력해주세요.' });
      return;
    }

    const targetCompany = isManualMode ? manualCompany.trim() : activeSession?.company.trim();
    const targetBatch = isManualMode ? manualBatch.trim() : activeSession?.batch.trim();
    const targetGroup = isManualMode ? manualGroup.trim() : selectedGroup.trim();

    if (!targetCompany || !targetBatch || !targetGroup) {
      setModal({ isOpen: true, onClose: closeModal, type: 'alert', title: '체크!', message: '모든 정보를 입력해주세요.' });
      return;
    }

    setIsChecking(true);
    let user: UserProfile;

    try {
      // 1. DB에서 기존 프로필 정보를 먼저 확인 (조장 권한 복구를 위해)
      // 조(targetGroup) 정보를 함께 넘겨서 엉뚱한 조의 기록을 가져오지 않도록 함
      const existingProfile = await StorageService.findParticipant(targetCompany, targetBatch, name.trim(), targetGroup);
      
      if (existingProfile) {
        // 기존 정보가 있다면 해당 정보를 바탕으로 유저 객체 생성
        user = {
          name: existingProfile.name,
          company: existingProfile.company,
          batch: existingProfile.batch,
          group: existingProfile.group, // 기존에 참여했던 조 정보 유지
          isCaptain: existingProfile.isCaptain,
          isReadOnly: isSessionExpired
        };
      } else {
        // 기존 정보가 없는 신규 유저인 경우 (단, 종료된 세션은 입장 불가)
        if (isSessionExpired) {
          setModal({ 
              isOpen: true, 
              onClose: closeModal, 
              type: 'alert', 
              title: '입장 제한', 
              message: '이미 종료된 Workshop입니다.\n참가자 명단에 귀하의 이름이 확인되지 않아 입장할 수 없습니다.' 
          });
          setIsChecking(false);
          return;
        }

        user = {
          name: name.trim(),
          company: targetCompany,
          batch: targetBatch,
          group: targetGroup,
          isReadOnly: false
        };
      }
      
      StorageService.saveUser(user);
      onLogin(user);
    } catch (error) {
      console.error("Login failed", error);
      setModal({ isOpen: true, onClose: closeModal, type: 'alert', title: '오류', message: '로그인 중 오류가 발생했습니다. 다시 시도해주세요.' });
    } finally {
      setIsChecking(false);
    }
  };

  const inputStyle = "w-full px-5 py-3.5 rounded-none border-[3px] border-black bg-white focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0px_0px_#2563eb] transition-all text-black font-bold placeholder-gray-400 text-lg";
  const labelStyle = "block text-sm font-black text-black mb-2 uppercase tracking-wide";

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[80vh] relative">
      <Modal {...modal} />
      
      {/* Top Right Controls */}
      <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
        {/* Landing Page Button */}
        <button 
            onClick={onShowLanding}
            className="bg-white px-4 py-3 border-[3px] border-black rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-bold text-sm flex items-center gap-2"
        >
            <span className="text-xl">✨</span>
            <span className="hidden md:inline">서비스 소개</span>
        </button>

        {/* Admin Gear Button */}
        <button 
            onClick={onAdminEnter}
            className="bg-white p-3 border-[3px] border-black rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all group"
            title="관리자 모드 진입"
        >
            <svg className="w-6 h-6 text-black group-hover:rotate-90 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
        </button>
      </div>

      {/* DB Status Indicator */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className={`flex items-center gap-2 px-3 py-1.5 border-[2px] border-black text-xs font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)] ${
          dbStatus === 'connected' ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#f3f4f6] text-gray-500'
        }`}>
          {dbStatus === 'checking' && (
            <>
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
              <span>시스템 확인 중...</span>
            </>
          )}
          {dbStatus === 'connected' && (
            <>
              <div className="w-2 h-2 rounded-full bg-[#166534] animate-pulse"></div>
              <span>시스템 온라인 (Cloud)</span>
            </>
          )}
          {dbStatus === 'disconnected' && (
            <>
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              <span>로컬 모드 (Offline)</span>
            </>
          )}
        </div>
      </div>

      <div className="text-center mb-10 space-y-4 max-w-4xl px-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#a855f7] border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform -rotate-2 mb-4">
           <span className="text-xs font-black text-white tracking-wide">Core value solution</span>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black leading-none text-black tracking-tighter break-keep drop-shadow-sm">
          Build Up<br/>
          <span className="text-[#2563eb] italic">Workshop</span>
        </h1>
        
        <p className="text-black font-bold text-xl leading-relaxed mt-4 bg-white inline-block px-2 border-2 border-black">
          우리 조직의 미래를 함께 그려보는 시간
        </p>
      </div>

      <div className="w-full max-w-xl px-4">
        <Card className="bg-[#fff1f2] border-[4px] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8 md:p-10 relative">
          
          <div className="absolute top-6 right-6">
            <button 
              type="button"
              onClick={() => setIsManualMode(!isManualMode)}
              className="text-xs font-bold text-black hover:text-[#2563eb] underline decoration-2 decoration-black hover:decoration-[#2563eb] transition-all"
            >
              {isManualMode ? "교육 과정 선택하기" : "정보 직접 입력하기"}
            </button>
          </div>

          <div className="mb-8 border-b-[3px] border-black pb-4">
            <h2 className="text-3xl font-black text-black">Enter Workshop</h2>
            <p className="text-black font-medium text-sm mt-2">
              {isManualMode 
                ? "참여 정보를 직접 입력해주세요." 
                : "개설된 교육 과정을 선택하고 입장해주세요."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Common: Name Input */}
            <div>
              <label className={labelStyle}>이름</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="성함을 입력하세요"
                className={inputStyle}
              />
            </div>

            {isManualMode ? (
              /* Manual Input Mode */
              <>
                <div>
                  <label className={labelStyle}>회사명</label>
                  <input 
                    type="text" 
                    value={manualCompany}
                    onChange={(e) => setManualCompany(e.target.value)}
                    placeholder="예: 레퍼런스 주식회사"
                    className={inputStyle}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelStyle}>차수</label>
                    <input 
                      type="text" 
                      value={manualBatch}
                      onChange={(e) => setManualBatch(e.target.value)}
                      placeholder="예: 1차수"
                      className={inputStyle}
                    />
                  </div>
                  <div>
                    <label className={labelStyle}>조</label>
                    <input 
                      type="text" 
                      value={manualGroup}
                      onChange={(e) => setManualGroup(e.target.value)}
                      placeholder="예: 1조"
                      className={inputStyle}
                    />
                  </div>
                </div>
              </>
            ) : (
              /* Selection Mode (Connected to Admin Data) */
              <>
                <div>
                  <label className={labelStyle}>교육 과정</label>
                  {sessions.length > 0 ? (
                    <div className="relative">
                      <select 
                        value={selectedSessionId}
                        onChange={(e) => {
                          setSelectedSessionId(e.target.value);
                          // Reset group to 1조 when session changes
                          setSelectedGroup('1조');
                        }}
                        className={`${inputStyle} appearance-none cursor-pointer`}
                      >
                        {sessions.map(s => {
                            const expired = s.endDate && Date.now() > s.endDate;
                            return (
                                <option key={s.id} value={s.id}>
                                    {s.company} - {s.batch} {expired ? '(종료됨)' : ''}
                                </option>
                            );
                        })}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-black">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 border-[3px] border-dashed border-gray-400 bg-gray-50 text-gray-500 text-center text-sm font-bold">
                      현재 개설된 교육 과정이 없습니다.<br/>
                      <span className="text-[#2563eb] cursor-pointer hover:underline" onClick={() => setIsManualMode(true)}>직접 입력 모드</span>를 사용하세요.
                    </div>
                  )}
                </div>

                {sessions.length > 0 && (
                  <div>
                    {isSessionExpired ? (
                        <div className="p-4 bg-red-50 border-2 border-red-500 text-red-600 font-bold text-center">
                            ⚠️ 종료된 Workshop입니다.<br/>
                            <span className="text-xs">이름을 입력하면 결과물을 조회할 수 있습니다.</span>
                        </div>
                    ) : (
                        <>
                            <label className={labelStyle}>조</label>
                            <div className="relative">
                            <select 
                                value={selectedGroup}
                                onChange={(e) => setSelectedGroup(e.target.value)}
                                className={`${inputStyle} appearance-none cursor-pointer`}
                            >
                                {groupOptions.map(g => (
                                <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-black">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                            </div>
                        </>
                    )}
                  </div>
                )}
              </>
            )}
            
            <Button type="submit" loading={isChecking} className={`w-full mt-8 text-xl h-16 ${isSessionExpired ? 'bg-black text-white hover:bg-gray-800' : 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]'}`}>
              {isSessionExpired ? '결과 확인하기 (읽기 전용)' : 'Start Workshop →'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
