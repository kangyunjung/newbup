
import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Modal, ModalProps } from './Modal';
import { GeminiService } from '../services/geminiService';
import { StorageService } from '../services/storageService';
import { UserProfile, BoardItem, StepId } from '../types';

interface Step0Props {
  user: UserProfile;
  onComplete: () => void;
  onUserUpdate: () => void; // Prop to refresh user state
}

const GENDER_OPTIONS = [
  { value: 'Neutral', label: '무관' },
  { value: 'Female', label: '여성' },
  { value: 'Male', label: '남성' },
];

const STYLE_OPTIONS = [
  { value: '3D Character', label: '3D 캐릭터' },
  { value: 'Clay Style', label: '클레이(점토)' },
  { value: 'Watercolor', label: '수채화' },
  { value: 'Pixel Art', label: '픽셀 아트' },
  { value: 'Futuristic', label: '미래지향적' }
];

export const Step0_Intro: React.FC<Step0Props> = ({ user, onComplete, onUserUpdate }) => {
  const [dept, setDept] = useState('');
  const [dailyLife, setDailyLife] = useState('');
  const [keyword, setKeyword] = useState('');
  const [condition, setCondition] = useState<number>(80); 
  const [gender, setGender] = useState('Neutral');
  const [style, setStyle] = useState('3D Character');
  
  const [loading, setLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiImage, setAiImage] = useState<string | null>(null);

  const [isShared, setIsShared] = useState(false);
  const [teamProfiles, setTeamProfiles] = useState<BoardItem[]>([]);
  
  // Captain Selection State
  const [captain, setCaptain] = useState<string | null>(null);

  const [modal, setModal] = useState<ModalProps>({ isOpen: false, onClose: () => {}, message: '' });
  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

  useEffect(() => {
    const initData = async () => {
      const savedData = await StorageService.getWorkshopData();
      if (savedData.step0_aiProfile) setAiResult(savedData.step0_aiProfile);
      if (savedData.step0_aiProfileImage) setAiImage(savedData.step0_aiProfileImage);
      if (savedData.step0_dept) setDept(savedData.step0_dept);
      if (savedData.step0_dailyLife) setDailyLife(savedData.step0_dailyLife);
      if (savedData.step0_condition !== undefined) setCondition(savedData.step0_condition);
      
      // Load Participants to check captain
      const allUsers = await StorageService.getAllParticipants();
      const groupCaptain = allUsers.find(u => u.company === user.company && u.batch === user.batch && u.group === user.group && (u.isCaptain === true || String(u.isCaptain) === "true"));
      if (groupCaptain) {
        setCaptain(groupCaptain.name);
      }
      
      loadTeamProfiles();
    };
    initData();
    const interval = setInterval(() => {
        loadTeamProfiles();
        checkCaptainStatus();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const checkCaptainStatus = async () => {
      const allUsers = await StorageService.getAllParticipants();
      const groupCaptain = allUsers.find(u => u.company === user.company && u.batch === user.batch && u.group === user.group && (u.isCaptain === true || String(u.isCaptain) === "true"));
      if (groupCaptain && groupCaptain.name !== captain) {
        setCaptain(groupCaptain.name);
      }
      // Sync local user state if I became captain
      if (groupCaptain && groupCaptain.name === user.name && !user.isCaptain) {
          onUserUpdate();
      }
  };

  const loadTeamProfiles = async () => {
    const items = await StorageService.getBoardItems(StepId.INTRO);
    const groupItems = items.filter(item => item.authorGroup === user.group);
    setTeamProfiles(groupItems);
  };

  const handleGenerate = async () => {
    if (!keyword.trim() || !dept.trim() || !dailyLife.trim()) {
      setModal({ isOpen: true, onClose: closeModal, type: 'alert', title: '체크!', message: '모든 정보를 입력해주세요.' });
      return;
    }
    setLoading(true);
    setAiResult(null); 
    setAiImage(null);
    setIsShared(false);
    
    try {
      const [textResult, imageResult] = await Promise.all([
        GeminiService.generateProfile(keyword, user.name, dept, dailyLife, condition),
        GeminiService.generateProfileImage(keyword, gender, style)
      ]);

      setAiResult(textResult);
      setAiImage(imageResult);
      
      await StorageService.saveWorkshopData({ 
        step0_aiProfile: textResult,
        step0_aiProfileImage: imageResult || undefined,
        step0_dept: dept,
        step0_dailyLife: dailyLife,
        step0_condition: condition
      });
      // 프로필 생성 즉시 상태 새로고침 (App.tsx에서 완료 체크 표시되도록)
      setTimeout(() => onUserUpdate(), 500);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!aiResult || isSharing) return; 
    
    setIsSharing(true);
    try {
      const newItem: BoardItem = {
        id: `profile_${Date.now()}`,
        stepId: StepId.INTRO,
        authorName: user.name,
        authorGroup: user.group,
        company: user.company,
        batch: user.batch,
        content: aiResult,
        imageUrl: aiImage || undefined,
        extraInfo: JSON.stringify({ dept, dailyLife, condition }),
        votes: 0,
        timestamp: Date.now()
      };
      await StorageService.addBoardItem(newItem);
      await loadTeamProfiles();
      setIsShared(true);
      setModal({ isOpen: true, onClose: closeModal, type: 'alert', title: '공유 완료!', message: '우리 조원들에게 프로필이 공유되었습니다!' });
    } finally {
      setIsSharing(false);
    }
  };

  const handleDelete = (itemId: string) => {
    setModal({
      isOpen: true,
      onClose: closeModal,
      type: 'danger',
      title: '프로필 삭제',
      message: '공유된 프로필 카드를 삭제하시겠습니까?',
      confirmText: '삭제',
      onConfirm: async () => {
        closeModal();
        await StorageService.deleteBoardItem(itemId);
        await loadTeamProfiles();
        setIsShared(false); 
      }
    });
  };

  const handleVote = async (itemId: string) => {
      await StorageService.voteBoardItem(itemId, user.name);
      await loadTeamProfiles();
  };

  // 조장 확정 및 다음 단계로 즉시 이동
  const handleFinalizeCaptainAndProceed = async (candidateName: string) => {
      setLoading(true);
      try {
          await StorageService.setGroupCaptain(user.company, user.batch, user.group, candidateName);
          setCaptain(candidateName);
          // 상태 동기화 후 다음 단계로 이동
          onUserUpdate();
          setTimeout(() => onComplete(), 300);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const getConditionEmoji = (score: number) => {
    if (score >= 90) return "🤩"; 
    if (score >= 70) return "🙂"; 
    if (score >= 40) return "😐"; 
    return "😱"; 
  };

  // Styles
  const labelStyle = "block text-sm font-black text-black mb-2 uppercase tracking-wide bg-yellow-200 inline-block px-1 border border-black";
  const inputStyle = "w-full px-4 py-3 rounded-none bg-white border-[3px] border-black text-black font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_#2563eb] transition-all placeholder-gray-400";

  // Captain Candidate Logic (가장 많은 투표를 받은 사람)
  const sortedProfiles = [...teamProfiles].sort((a, b) => b.votes - a.votes);
  const topCandidate = sortedProfiles.length > 0 ? sortedProfiles[0] : null;

  // Step 0의 내 프로필 생성 여부 (App.tsx에서 이미 체크 표시됨)
  const hasMyProfile = !!aiResult;

  return (
    <div className="space-y-8 w-full max-w-6xl mx-auto pb-20">
      <Modal {...modal} />
      <Card className="border-t-[8px] border-t-[#2563eb] relative">
        {/* Completed Indicator Box - 내 프로필만 있으면 즉시 완료 표시 */}
        {hasMyProfile && (
          <div className="absolute -top-4 -right-4 z-30 animate-fade-in">
             <div className="bg-[#10b981] text-white border-[3px] border-black px-6 py-2 font-black text-lg shadow-[6px_6px_0px_0px_#000] uppercase tracking-tighter rotate-3">
               프로필 생성 완료
             </div>
          </div>
        )}

        <h2 className="text-4xl font-black mb-6 text-black italic">Step 0. Warm Up</h2>
        <p className="text-black text-xl mb-10 leading-relaxed font-bold">
          서로를 알아가는 시간입니다. 나의 요즘 일상과 컨디션을 공유하고,<br/> 
          <span className="text-white bg-black px-2">AI가 만들어주는 특별한 프로필</span>을 완성하여 팀원들에게 소개해보세요.
        </p>

        <div className="space-y-6">
           {/* Row 1 */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
               <label className={labelStyle}>이름</label>
               <input type="text" value={user.name} disabled className={`${inputStyle} bg-gray-100 text-gray-500`} />
             </div>
             <div>
               <label className={labelStyle}>소속 부서/팀</label>
               <input type="text" value={dept} onChange={(e) => setDept(e.target.value)} placeholder="예: 마케팅팀, 개발 1팀" disabled={loading} className={inputStyle} />
             </div>
           </div>

           {/* Row 2 */}
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="lg:col-span-2">
                <label className={labelStyle}>내가 하는 일, 요즘의 일상(가장 큰 관심사), 나의 강점 한 가지!</label>
                <textarea
                  value={dailyLife}
                  onChange={(e) => setDailyLife(e.target.value)}
                  placeholder="예: 마케팅 프로젝트를 담당하고 있으며, 최근에는 건강을 위해 클라이밍을 시작했습니다. 꼼꼼하게 일처리를 하는 것이 저의 강점입니다."
                  disabled={loading}
                  className={`${inputStyle} h-32 resize-none`}
                />
             </div>
             <div>
                <label className={labelStyle}>오늘의 컨디션 점수</label>
                <div className="bg-white border-[3px] border-black p-6 flex flex-col items-center justify-center h-32 shadow-[4px_4px_0px_0px_#000]">
                  <div className="text-4xl mb-2 flex items-center gap-2">
                    <span>{getConditionEmoji(condition)}</span>
                    <span className="font-black text-black">{condition}</span>
                    <span className="text-sm text-gray-500 font-bold self-end mb-2">/ 100</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" value={condition} onChange={(e) => setCondition(Number(e.target.value))} disabled={loading}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                  />
                </div>
             </div>
           </div>

           <hr className="border-2 border-black border-dashed my-6" />

           {/* Row 3 */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div>
                <label className={labelStyle}>오늘의 기분 키워드</label>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="예: 열정, 기대감, 피곤함, 설렘"
                  className={inputStyle}
                  disabled={loading}
                />
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className={labelStyle}>성별</label>
                   <select value={gender} onChange={(e) => setGender(e.target.value)} disabled={loading} className={`${inputStyle} appearance-none`}>
                     {GENDER_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                   </select>
                </div>
                <div>
                   <label className={labelStyle}>이미지 스타일</label>
                   <select value={style} onChange={(e) => setStyle(e.target.value)} disabled={loading} className={`${inputStyle} appearance-none`}>
                     {STYLE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                   </select>
                </div>
             </div>
           </div>

           <div className="pt-4">
              <Button onClick={handleGenerate} loading={loading} className="w-full md:w-auto text-xl h-16 shadow-[6px_6px_0px_0px_#000]">
                {loading ? '생성 중...' : '✨ AI 프로필 생성!'}
              </Button>
           </div>
        </div>
      </Card>

      {/* Result Area */}
      {(aiResult || aiImage) && (
        <Card className="bg-[#e0e7ff] border-[4px]">
          <div className="flex items-center justify-between mb-8 border-b-[3px] border-black pb-4">
             <div className="flex items-center gap-4">
               <h3 className="font-black text-black text-3xl">나의 AI 프로필 결과</h3>
             </div>
             {!isShared ? (
               <Button onClick={handleShare} disabled={isSharing} variant="secondary" className="animate-pulse">
                 {isSharing ? '공유 중...' : '📢 팀원들에게 공유하기'}
               </Button>
             ) : (
               <span className="text-black font-black px-4 py-2 bg-[#10b981] border-2 border-black shadow-[4px_4px_0px_0px_#000]">
                 ✅ 공유됨
               </span>
             )}
          </div>

          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
             <div className="shrink-0">
               {aiImage ? (
                 <div className="w-64 h-64 md:w-80 md:h-80 overflow-hidden border-[4px] border-black shadow-[8px_8px_0px_0px_#000] bg-white">
                    <img src={aiImage} alt="AI Generated Profile" className="w-full h-full object-cover" />
                 </div>
               ) : (
                 <div className="w-64 h-64 md:w-80 md:h-80 bg-white flex flex-col items-center justify-center border-[4px] border-black text-black font-bold">
                    <span className="text-4xl mb-2">🖼️</span>
                    <span>이미지 생성 실패</span>
                 </div>
               )}
             </div>

             <div className="flex-1 space-y-6 w-full">
                <div className="bg-white p-8 border-[3px] border-black shadow-[6px_6px_0px_0px_#000] h-full flex flex-col">
                  <h4 className="text-black font-black text-sm mb-4 tracking-widest flex justify-between border-b-2 border-black pb-2">
                    <span>페르소나 분석</span>
                    <span className="text-[#2563eb]">{user.name} / {dept}</span>
                  </h4>
                  <p className="text-black text-lg font-medium leading-relaxed whitespace-pre-wrap mb-6 flex-1">
                    {aiResult}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-100 p-4 border-2 border-black">
                       <p className="text-xs text-black font-black mb-1">나의 일상</p>
                       <p className="text-sm text-black italic truncate">"{dailyLife}"</p>
                    </div>
                    <div className="bg-gray-100 p-4 border-2 border-black flex items-center justify-between">
                       <p className="text-xs text-black font-black">오늘의 컨디션</p>
                       <div className="flex items-center gap-2">
                          <span className="text-lg">{getConditionEmoji(condition)}</span>
                          <span className="font-black text-black">{condition}</span>
                       </div>
                    </div>
                  </div>
                </div>
             </div>
          </div>
          
          <div className="mt-12 flex justify-end gap-4 border-t-2 border-black border-dashed pt-6">
             <Button variant="outline" onClick={() => { setAiResult(null); setAiImage(null); }} className="px-8">
               다시 만들기
             </Button>
          </div>
        </Card>
      )}

      {/* Team Board */}
      {teamProfiles.length > 0 && (
        <div className="mt-16">
           <h3 className="text-3xl font-black text-black mb-6 flex items-center gap-3 bg-white border-[3px] border-black p-4 shadow-[6px_6px_0px_0px_#000] w-fit">
             👥 <span className="text-[#2563eb]">{user.group}</span> 멤버 프로필
             <span className="bg-black text-white text-sm px-2 py-1 ml-2">{teamProfiles.length}명 참여 중</span>
           </h3>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
             {teamProfiles.map((item) => {
               let extra: any = {};
               try { extra = item.extraInfo ? JSON.parse(item.extraInfo) : {}; } catch(e) {}
               const itemCondition = extra.condition ?? 50;
               const isMyItem = item.authorName === user.name;
               const isVoted = item.votedUserIds?.includes(user.name);
               const isCurrentCaptain = captain === item.authorName;

               return (
                 <div key={item.id} className={`bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_#000] overflow-hidden group hover:shadow-[8px_8px_0px_0px_#000] transition-all relative ${isCurrentCaptain ? 'ring-4 ring-[#facc15] ring-offset-2' : ''}`}>
                    
                    {isCurrentCaptain && (
                        <div className="absolute top-2 left-2 z-20 bg-[#facc15] text-black border-2 border-black px-3 py-1 font-black text-xs shadow-md">
                            👑 조장
                        </div>
                    )}

                    {isMyItem && (
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="absolute top-2 right-2 z-20 w-8 h-8 flex items-center justify-center bg-white border-2 border-black hover:bg-red-100 text-red-600 font-bold shadow-sm"
                        title="삭제하기"
                      >
                        🗑️
                      </button>
                    )}

                    <div className="h-80 bg-gray-100 relative overflow-hidden border-b-[3px] border-black">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.authorName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 bg-white">
                          <span className="text-6xl">👤</span>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 w-full bg-white/90 border-t-[3px] border-black p-3 flex justify-between items-center">
                        <div>
                            <h4 className="text-lg font-black text-black leading-none">{item.authorName}</h4>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-black bg-black text-white px-1.5 py-0.5">{item.authorGroup}</span>
                                <span className="text-xs text-[#2563eb] font-bold">{extra.dept || '소속 미입력'}</span>
                            </div>
                        </div>
                        <div className="text-2xl">{getConditionEmoji(itemCondition)}</div>
                      </div>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="text-sm text-black font-medium leading-relaxed bg-gray-50 p-3 border-2 border-black whitespace-pre-wrap">
                        {item.content}
                      </div>
                      
                      <button 
                        onClick={() => handleVote(item.id)}
                        className={`w-full py-2 border-2 border-black font-bold flex items-center justify-center gap-2 transition-all ${isVoted ? 'bg-[#ff6b6b] text-white' : 'bg-white text-black hover:bg-gray-100'}`}
                      >
                         <span>{isVoted ? '❤️ 좋아요' : '🤍 좋아요'}</span>
                         <span>{item.votes}</span>
                      </button>
                    </div>
                 </div>
               );
             })}
           </div>

           {/* Captain Selection Section */}
           <Card className="bg-[#f0f9ff] border-t-[6px] border-t-[#2563eb] animate-fade-in-up">
              <div className="text-center mb-8">
                  <h3 className="text-2xl font-black text-black mb-2">👑 조장 선출</h3>
                  <p className="text-black font-bold text-lg">
                      가장 많은 투표를 받은 팀원이 조장으로 추천됩니다.<br/>
                      <span className="text-[#2563eb]">조장에게는 팀의 의견을 취합하여 선택하는 역할이 부여됩니다.</span>
                  </p>
              </div>

              {captain ? (
                  <div className="text-center p-8 bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_#000]">
                      <p className="text-gray-500 font-bold mb-2">현재 우리 조 조장</p>
                      <h2 className="text-4xl font-black text-[#2563eb] mb-6">{captain}</h2>
                      <div className="mt-8 flex justify-center">
                        <Button onClick={onComplete} className="px-12 text-lg h-16 shadow-[4px_4px_0px_0px_#000]">
                            다음 단계로 이동 →
                        </Button>
                      </div>
                  </div>
              ) : (
                  <div className="flex flex-col items-center">
                      {topCandidate ? (
                          <div className="bg-white p-8 border-[3px] border-black text-center shadow-lg mb-6 max-w-md w-full relative">
                              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-1 text-xs font-black uppercase tracking-widest">Candidate</div>
                              <div className="w-24 h-24 bg-gray-200 mx-auto mb-4 border-2 border-black overflow-hidden rounded-full">
                                  {topCandidate.imageUrl ? <img src={topCandidate.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>}
                              </div>
                              <h4 className="text-3xl font-black text-black mb-1">{topCandidate.authorName}</h4>
                              <p className="text-gray-500 font-bold mb-8">{topCandidate.votes}표 획득 (가장 많은 좋아요)</p>
                              
                              <Button 
                                onClick={() => handleFinalizeCaptainAndProceed(topCandidate.authorName)} 
                                loading={loading}
                                className="w-full bg-[#2563eb] text-white py-6 text-xl shadow-[6px_6px_0px_0px_#000] leading-tight"
                              >
                                {topCandidate.authorName}님을 조장으로 확정하고<br />다음단계로 이동 →
                              </Button>
                          </div>
                      ) : (
                          <p className="text-gray-500 font-bold py-8">아직 투표된 프로필이 없습니다. 서로의 프로필에 좋아요를 눌러주세요!</p>
                      )}
                  </div>
              )}
           </Card>
        </div>
      )}
    </div>
  );
};
