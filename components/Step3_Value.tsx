
import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Modal, ModalProps } from './Modal';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { CORE_VALUE_OPTIONS } from '../constants';
import { UserProfile, BoardItem, StepId } from '../types';

interface Step3Props {
  user?: UserProfile; 
  onComplete: () => void;
}

export const Step3_Value: React.FC<Step3Props> = ({ user, onComplete }) => {
  // Board State
  const [obstacleItems, setObstacleItems] = useState<BoardItem[]>([]);
  const [strengthItems, setStrengthItems] = useState<BoardItem[]>([]);
  
  // Input State
  const [obstacleInput, setObstacleInput] = useState('');
  const [strengthInput, setStrengthInput] = useState('');

  // Phase & Data
  const [phase, setPhase] = useState<'reflection' | 'voting'>('reflection');
  const [selectedValues, setSelectedValues] = useState<string[]>([]); 
  const [recommendedValues, setRecommendedValues] = useState<string[]>([]);
  const [valueOptions, setValueOptions] = useState<string[]>(CORE_VALUE_OPTIONS);
  
  // Voting Status
  const [groupVoteCounts, setGroupVoteCounts] = useState<Record<string, number>>({});
  const [mySubmittedVotes, setMySubmittedVotes] = useState<string[]>([]);
  const [isVoteSubmitted, setIsVoteSubmitted] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [modal, setModal] = useState<ModalProps>({ isOpen: false, onClose: () => {}, message: '' });
  
  // Captain Features
  const [newValue, setNewValue] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  
  const currentUser = user || StorageService.getUser();
  const isCaptain = currentUser?.isCaptain;

  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    if (!currentUser) return;

    const allItems = await StorageService.getBoardItems(StepId.VALUE);
    const myGroupItems = allItems.filter(i => i.authorGroup === currentUser.group);
    
    setObstacleItems(myGroupItems.filter(i => i.category === 'OBSTACLE'));
    setStrengthItems(myGroupItems.filter(i => i.category === 'STRENGTH'));

    const phaseItem = myGroupItems.find(i => i.category === 'VALUE_PHASE_CONTROL');
    const decisionItem = myGroupItems.find(i => i.category === 'VALUE_DECISION');

    if (decisionItem) {
        let status = '';
        try { status = JSON.parse(decisionItem.extraInfo || '{}').status; } catch(e) {}
        if (status === 'CONFIRMED') {
            const currentData = await StorageService.getWorkshopData();
            if (!currentData.step3_votes || JSON.stringify(currentData.step3_votes) !== JSON.stringify(decisionItem.content.split(','))) {
                 await StorageService.saveWorkshopData({ step3_votes: decisionItem.content.split(',') });
            }
            onComplete();
            return;
        }
    }

    if (phaseItem) {
        try {
            const info = JSON.parse(phaseItem.extraInfo || '{}');
            if (info.status === 'VOTING') {
                setPhase('voting');
                if (info.recommendations) {
                    setRecommendedValues(info.recommendations);
                }
            }
        } catch (e) {
            console.error("Phase parsing error", e);
        }
    }

    const allUsers = await StorageService.getAllParticipants();
    const groupMembers = allUsers.filter(u => u.company === currentUser.company && u.batch === currentUser.batch && u.group === currentUser.group);
    
    const me = groupMembers.find(u => u.name === currentUser.name);
    if (me && me.step3_votes && me.step3_votes.length > 0) {
        setMySubmittedVotes(me.step3_votes);
        setIsVoteSubmitted(true);
        if (selectedValues.length === 0) setSelectedValues(me.step3_votes);
    }

    const counts: Record<string, number> = {};
    groupMembers.forEach(member => {
        if (member.step3_votes && Array.isArray(member.step3_votes)) {
            member.step3_votes.forEach(v => {
                counts[v] = (counts[v] || 0) + 1;
            });
        }
    });
    setGroupVoteCounts(counts);

    const sessions = await StorageService.getSessions();
    const mySession = sessions.find(s => s.company === currentUser.company && s.batch === currentUser.batch);
    if (mySession && mySession.coreValues && mySession.coreValues.length > 0) {
        setValueOptions(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(mySession.coreValues)) return mySession.coreValues || [];
            return prev;
        });
    }
  };

  const handlePostItem = async (type: 'OBSTACLE' | 'STRENGTH') => {
      if (!currentUser) return;
      const content = type === 'OBSTACLE' ? obstacleInput : strengthInput;
      if (!content.trim()) return;

      const newItem: BoardItem = {
          id: `${type}_${Date.now()}_${currentUser.name}`,
          stepId: StepId.VALUE,
          authorName: currentUser.name,
          authorGroup: currentUser.group,
          company: currentUser.company,
          batch: currentUser.batch,
          content: content,
          category: type,
          votes: 0,
          timestamp: Date.now()
      };

      await StorageService.addBoardItem(newItem);
      await loadData();
      
      if (type === 'OBSTACLE') setObstacleInput('');
      else setStrengthInput('');
  };

  const handleDeleteItem = async (itemId: string) => {
      setModal({
          isOpen: true,
          onClose: closeModal,
          type: 'danger',
          title: 'Delete',
          message: '해당 카드를 삭제하시겠습니까?',
          confirmText: '삭제',
          onConfirm: async () => {
              closeModal();
              await StorageService.deleteBoardItem(itemId);
              await loadData();
          }
      });
  };

  const handleAnalyzeAndStartVoting = async () => {
    if (!currentUser || !isCaptain) return;
    if (obstacleItems.length < 1 && strengthItems.length < 1) {
      setModal({ isOpen: true, onClose: closeModal, type: 'alert', title: 'Data needed', message: '최소한의 의견이 모여야 AI 분석이 가능합니다.' });
      return;
    }

    setAnalyzing(true);
    try {
      const obstaclesText = obstacleItems.map(i => i.content).join(", ");
      const strengthsText = strengthItems.map(i => i.content).join(", ");

      const recommendations = await GeminiService.recommendCoreValues(obstaclesText, strengthsText, valueOptions);
      const validRecommendations = recommendations
        .map(rec => {
          return valueOptions.find(opt => opt.includes(rec) || rec.includes(opt.split(' ')[0]));
        })
        .filter((r): r is string => !!r); 

      const phaseControlItem: BoardItem = {
          id: `phase_control_${currentUser.group}`,
          stepId: StepId.VALUE,
          authorName: 'System',
          authorGroup: currentUser.group,
          company: currentUser.company,
          batch: currentUser.batch,
          content: 'Phase Control',
          category: 'VALUE_PHASE_CONTROL',
          extraInfo: JSON.stringify({
              status: 'VOTING',
              recommendations: validRecommendations
          }),
          votes: 0,
          timestamp: Date.now()
      };
      
      await StorageService.addBoardItem(phaseControlItem);
      
      setRecommendedValues(validRecommendations);
      setPhase('voting');
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleSelection = (value: string) => {
    if (!isCaptain && isVoteSubmitted) return; 
    
    if (selectedValues.includes(value)) {
      setSelectedValues(prev => prev.filter(v => v !== value));
    } else {
      if (selectedValues.length >= 3) {
        setModal({ isOpen: true, onClose: closeModal, type: 'alert', title: 'Limit!', message: '핵심가치는 최대 3개까지 선택할 수 있습니다.' });
        return;
      }
      setSelectedValues(prev => [...prev, value]);
    }
  };

  const handleSubmitVotes = async () => {
    if (selectedValues.length !== 3) {
        setModal({ isOpen: true, onClose: closeModal, type: 'alert', title: 'Check', message: '핵심가치 3가지를 선택해주세요.' });
        return;
    }
    
    await StorageService.submitVotes(selectedValues);
    setIsVoteSubmitted(true);
    setMySubmittedVotes(selectedValues);
    
    setModal({ 
        isOpen: true, 
        onClose: closeModal, 
        type: 'alert', 
        title: 'Submitted', 
        message: '투표가 완료되었습니다. 조장이 최종 결정을 내릴 때까지 기다려주세요.' 
    });
  };

  const handleCaptainConfirm = () => {
      if (selectedValues.length !== 3) {
          setModal({ isOpen: true, onClose: closeModal, type: 'alert', title: 'Check', message: '최종 핵심가치 3가지를 선택해주세요.' });
          return;
      }
      setIsConfirming(true);
  };

  const handleFinalExecute = async () => {
      if (!currentUser) return;
      
      const decisionItem: BoardItem = {
          id: `value_decision_${currentUser.group}`,
          stepId: StepId.VALUE,
          authorName: currentUser.name,
          authorGroup: currentUser.group,
          company: currentUser.company,
          batch: currentUser.batch,
          content: selectedValues.join(','), 
          category: 'VALUE_DECISION',
          extraInfo: JSON.stringify({ status: 'CONFIRMED' }),
          votes: 0,
          timestamp: Date.now()
      };
      await StorageService.addBoardItem(decisionItem);

      await StorageService.submitVotes(selectedValues);
      onComplete();
  };

  const handleAddValue = async () => {
      if (!newValue.trim() || !currentUser) return;
      if (valueOptions.includes(newValue.trim())) {
          setModal({ isOpen: true, onClose: closeModal, type: 'alert', title: 'Duplicate', message: '이미 존재하는 키워드입니다.' });
          return;
      }
      const updatedOptions = [...valueOptions, newValue.trim()];
      await StorageService.updateSessionCoreValues(currentUser.company, currentUser.batch, updatedOptions);
      setValueOptions(updatedOptions);
      setNewValue('');
  };

  const handleDeleteValue = (valueToDelete: string) => {
      if (!currentUser) return;
      setModal({
          isOpen: true,
          onClose: closeModal,
          type: 'danger',
          title: 'Delete keyword',
          message: `'${valueToDelete}' 키워드를 삭제하시겠습니까?`,
          confirmText: '삭제',
          onConfirm: async () => {
              const updatedOptions = valueOptions.filter(v => v !== valueToDelete);
              await StorageService.updateSessionCoreValues(currentUser.company, currentUser.batch, updatedOptions);
              setValueOptions(updatedOptions);
              setSelectedValues(prev => prev.filter(v => v !== valueToDelete));
              closeModal();
          }
      });
  };

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto pb-20">
      <Modal {...modal} />
      <Card className="border-t-[8px] border-t-[#10b981]">
        <h2 className="text-4xl font-black mb-8 text-black italic">Step 3. 핵심가치(How)</h2>
        
        {phase === 'reflection' ? (
          <div className="animate-fade-in-up">
             <div className="mb-10 text-center">
               <p className="text-black text-xl leading-relaxed font-bold">
                 <strong>우리의 일하는 방식</strong>은 어떠해야 할까요?<br/>
                 우리의 <span className="text-white bg-[#ef4444] px-1">방해 요소</span>를 제거하고 <span className="text-white bg-[#10b981] px-1">강점</span>을 극대화하기 위한 솔루션을 찾아봅시다.
               </p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
               <div className="bg-[#fef2f2] p-4 border-[3px] border-black shadow-[6px_6px_0px_0px_#000] flex flex-col h-[500px]">
                 <div className="flex items-center gap-3 mb-4 border-b-2 border-black pb-2">
                   <div className="text-2xl">🚧</div>
                   <h3 className="text-xl font-black text-black uppercase">Obstacles ({obstacleItems.length})</h3>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto space-y-3 p-2 bg-white/50 border-2 border-dashed border-red-200 mb-4 custom-scrollbar">
                    {obstacleItems.length === 0 && (
                        <div className="text-center text-gray-400 font-bold py-10">의견을 등록해주세요.</div>
                    )}
                    {obstacleItems.map(item => (
                        <div key={item.id} className="bg-white p-3 border-2 border-black shadow-sm relative group">
                            <p className="text-black font-bold text-sm leading-snug">{item.content}</p>
                            <div className="flex justify-between items-center mt-2 border-t border-gray-100 pt-1">
                                <span className="text-[10px] font-black text-gray-500">{item.authorName}</span>
                                {item.authorName === currentUser?.name && (
                                    <button onClick={() => handleDeleteItem(item.id)} className="text-red-500 text-xs font-bold hover:underline">삭제</button>
                                )}
                            </div>
                        </div>
                    ))}
                 </div>

                 <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={obstacleInput} 
                        onChange={(e) => setObstacleInput(e.target.value)} 
                        placeholder="방해 요소 입력..."
                        className="flex-1 bg-white text-black border-2 border-black px-3 py-2 font-bold text-sm focus:outline-none focus:border-red-500"
                        onKeyPress={(e) => e.key === 'Enter' && handlePostItem('OBSTACLE')}
                    />
                    <Button onClick={() => handlePostItem('OBSTACLE')} disabled={!obstacleInput.trim()} className="bg-[#ef4444] text-white border-2 border-black h-auto py-2 px-4 shadow-none">
                        Post
                    </Button>
                 </div>
               </div>

               <div className="bg-[#ecfdf5] p-4 border-[3px] border-black shadow-[6px_6px_0px_0px_#000] flex flex-col h-[500px]">
                 <div className="flex items-center gap-3 mb-4 border-b-2 border-black pb-2">
                   <div className="text-2xl">🌱</div>
                   <h3 className="text-xl font-black text-black uppercase">Strengths ({strengthItems.length})</h3>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto space-y-3 p-2 bg-white/50 border-2 border-dashed border-green-200 mb-4 custom-scrollbar">
                    {strengthItems.length === 0 && (
                        <div className="text-center text-gray-400 font-bold py-10">의견을 등록해주세요.</div>
                    )}
                    {strengthItems.map(item => (
                        <div key={item.id} className="bg-white p-3 border-2 border-black shadow-sm relative group">
                            <p className="text-black font-bold text-sm leading-snug">{item.content}</p>
                            <div className="flex justify-between items-center mt-2 border-t border-gray-100 pt-1">
                                <span className="text-[10px] font-black text-gray-500">{item.authorName}</span>
                                {item.authorName === currentUser?.name && (
                                    <button onClick={() => handleDeleteItem(item.id)} className="text-red-500 text-xs font-bold hover:underline">삭제</button>
                                )}
                            </div>
                        </div>
                    ))}
                 </div>

                 <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={strengthInput} 
                        onChange={(e) => setStrengthInput(e.target.value)} 
                        placeholder="우리만의 강점 입력..."
                        className="flex-1 bg-white text-black border-2 border-black px-3 py-2 font-bold text-sm focus:outline-none focus:border-green-500"
                        onKeyPress={(e) => e.key === 'Enter' && handlePostItem('STRENGTH')}
                    />
                    <Button onClick={() => handlePostItem('STRENGTH')} disabled={!strengthInput.trim()} className="bg-[#10b981] text-white border-2 border-black h-auto py-2 px-4 shadow-none">
                        Post
                    </Button>
                 </div>
               </div>
             </div>

             <div className="text-center bg-gray-100 p-6 border-[3px] border-black">
               {isCaptain ? (
                   <div>
                       <p className="text-black font-bold mb-4">
                           팀원들의 의견이 충분히 모였나요?<br/>
                           AI 분석을 통해 우리에게 필요한 핵심가치를 추천받고 투표를 시작하세요.
                       </p>
                       <Button 
                         onClick={handleAnalyzeAndStartVoting} 
                         loading={analyzing}
                         className="bg-black text-white hover:bg-gray-800 text-xl px-12 py-4 shadow-[6px_6px_0px_0px_#2563eb]"
                       >
                         {analyzing ? 'Analyzing...' : '🚀 AI 분석 및 투표 시작'}
                       </Button>
                   </div>
               ) : (
                   <div className="flex flex-col items-center gap-4">
                       <div className="animate-spin w-8 h-8 border-4 border-black border-t-transparent rounded-full"></div>
                       <p className="text-black font-black text-lg">
                           조장이 AI 분석을 진행할 때까지 대기해주세요...
                       </p>
                       <p className="text-gray-500 text-sm">자신의 의견을 자유롭게 보드에 남겨주세요.</p>
                   </div>
               )}
             </div>
          </div>
        ) : (
          <div className="animate-fade-in-up relative">
            {isConfirming && (
                <div className="absolute inset-0 z-50 bg-[#fffdf5] flex flex-col items-center justify-center p-4 animate-fade-in">
                    <div className="max-w-4xl w-full text-center">
                        <span className="inline-block px-3 py-1 bg-black text-white text-xs font-black uppercase mb-4 border-2 border-black shadow-[4px_4px_0px_0px_#10b981]">
                            Final team agreement
                        </span>
                        <h3 className="text-3xl font-black text-black mb-2 leading-tight">
                            이 3가지 가치로 최종 확정하시겠습니까?
                        </h3>
                        <p className="text-black font-bold text-lg mb-10">
                            모든 조원에게 이 결과가 공유되며, 다음 단계로 함께 넘어갑니다.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                            {selectedValues.map((val, idx) => (
                                <div key={idx} className="bg-white border-[3px] border-black p-8 shadow-[8px_8px_0px_0px_#000] relative group hover:-translate-y-2 transition-transform duration-300">
                                    <div className="absolute -top-4 -left-4 w-10 h-10 bg-[#10b981] border-[3px] border-black flex items-center justify-center text-white font-black text-xl shadow-sm z-10">
                                        {idx + 1}
                                    </div>
                                    <h4 className="text-2xl font-black text-black break-keep leading-snug">
                                        {val.split(' (')[0]}
                                    </h4>
                                    <span className="block text-sm text-gray-500 font-bold mt-2">
                                        {val.match(/\(([^)]+)\)/)?.[1] || ''}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-4 justify-center">
                            <Button variant="outline" onClick={() => setIsConfirming(false)} className="px-8 py-3 border-2 h-auto text-base">
                                다시 선택하기
                            </Button>
                            <Button onClick={handleFinalExecute} className="bg-black text-white hover:bg-gray-800 px-12 py-3 h-auto text-xl shadow-[6px_6px_0px_0px_#10b981]">
                                👍 네, 모두 동의했습니다!
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className={`transition-opacity duration-300 ${isConfirming ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-gray-100 border-2 border-black p-4">
                <div>
                    <h3 className="text-2xl font-black text-black uppercase">Voting</h3>
                    <p className="text-black font-bold mt-1">
                    {isCaptain 
                        ? "조원들의 투표 결과를 확인하고, 우리 조의 최종 핵심가치 3가지를 선택해주세요." 
                        : "우리 조의 핵심가치로 삼고 싶은 3가지를 선택하고 제출해주세요."}
                    </p>
                </div>
                {isCaptain && (
                    <Button variant="outline" onClick={() => setPhase('reflection')} className="text-sm px-4 py-2 bg-white">
                        ↩ 다시 논의하기 (Reflection)
                    </Button>
                )}
                </div>

                {isCaptain && (
                    <div className="mb-8 p-4 bg-yellow-50 border-[3px] border-black flex flex-col md:flex-row items-center gap-4">
                        <div className="text-xs font-black bg-[#facc15] px-2 py-1 border border-black text-black uppercase shrink-0">
                            👑 Captain mode
                        </div>
                        <span className="text-sm font-bold text-black shrink-0">원하는 키워드가 없다면 직접 추가하세요:</span>
                        <div className="flex-1 w-full flex gap-2">
                            <input 
                                type="text" 
                                value={newValue} 
                                onChange={(e) => setNewValue(e.target.value)} 
                                placeholder="새로운 핵심가치 입력..."
                                className="flex-1 px-3 py-2 bg-white text-black border-2 border-black font-bold text-sm focus:outline-none"
                                onKeyPress={(e) => e.key === 'Enter' && handleAddValue()}
                            />
                            <Button onClick={handleAddValue} className="px-4 py-2 text-xs h-auto shadow-none border-2">Add</Button>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
                {valueOptions.map((option) => {
                    const isSelected = selectedValues.includes(option);
                    const isRecommended = recommendedValues.includes(option);
                    const voteCount = groupVoteCounts[option] || 0;

                    return (
                    <div
                        key={option}
                        onClick={() => toggleSelection(option)}
                        className={`
                        relative p-6 text-left transition-all duration-200 border-[3px] border-black h-40 flex flex-col justify-between group cursor-pointer
                        ${isSelected 
                            ? 'bg-[#10b981] text-white shadow-[6px_6px_0px_0px_#000] -translate-y-1' 
                            : isRecommended 
                            ? 'bg-[#ecfdf5] border-[#10b981] text-black hover:bg-[#d1fae5]' 
                            : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-black'
                        }
                        ${(!isCaptain && isVoteSubmitted) ? 'opacity-70 cursor-not-allowed' : ''}
                        `}
                    >
                        {isRecommended && !isSelected && (
                        <div className="absolute top-0 right-0 bg-[#10b981] text-white text-[10px] font-black px-2 py-1 border-l-2 border-b-2 border-black">
                            AI pick
                        </div>
                        )}

                        {isCaptain && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation(); 
                                    handleDeleteValue(option);
                                }}
                                className="absolute top-2 left-2 w-6 h-6 bg-red-100 hover:bg-red-500 hover:text-white text-red-500 border border-black flex items-center justify-center text-xs font-bold rounded-full z-20 transition-colors"
                                title="삭제 (Captain Only)"
                            >
                                X
                            </button>
                        )}
                        
                        <div className="flex justify-between items-start w-full relative z-10 mt-2">
                        <span className={`font-bold tracking-wide text-lg break-keep ${isSelected ? 'text-white' : 'text-black'}`}>
                            {option.split(' (')[0]}
                            <span className="block text-xs font-normal opacity-70 mt-1">
                            {option.match(/\(([^)]+)\)/)?.[1] || ''}
                            </span>
                        </span>
                        {isSelected && (
                            <div className="bg-black p-1 rounded-full shrink-0 text-white border-2 border-white">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                            </div>
                        )}
                        </div>

                        {isCaptain && voteCount > 0 && (
                            <div className={`mt-auto pt-2 border-t flex justify-end ${isSelected ? 'border-white/30' : 'border-black/10'}`}>
                                <div className={`flex items-center gap-1.5 px-3 py-1 text-sm font-black border-2 bg-white text-black border-black rounded-full`}>
                                    <span className="text-lg">🗳️</span>
                                    <span>{voteCount}표</span>
                                </div>
                            </div>
                        )}
                    </div>
                    );
                })}
                </div>

                <div className="fixed bottom-0 left-0 w-full bg-white border-t-[3px] border-black p-4 md:p-6 z-50 flex justify-center animate-fade-in-up">
                <div className="w-full max-w-6xl flex justify-between items-center">
                    <div className="hidden md:block text-black font-black text-xl">
                    Selected: <span className={`text-2xl ml-2 ${selectedValues.length === 3 ? 'text-[#10b981]' : 'text-gray-400'}`}>{selectedValues.length}</span> / 3
                    </div>
                    
                    {isCaptain ? (
                        <Button onClick={handleCaptainConfirm} disabled={selectedValues.length !== 3} className="w-full md:w-auto bg-black text-white hover:bg-gray-800 text-xl py-4 px-12 shadow-none border-0">
                            최종 확정 (Final confirm)
                        </Button>
                    ) : (
                        <Button 
                            onClick={handleSubmitVotes} 
                            disabled={isVoteSubmitted || selectedValues.length !== 3} 
                            className={`w-full md:w-auto text-xl py-4 px-12 shadow-none border-0 ${isVoteSubmitted ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-black text-white hover:bg-gray-800'}`}
                        >
                            {isVoteSubmitted ? "투표 완료 (대기 중)" : "투표 제출 (Submit)"}
                        </Button>
                    )}
                </div>
                </div>
                <div className="h-24"></div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
