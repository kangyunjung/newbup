import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Modal, ModalProps } from './Modal';
import { GeminiService } from '../services/geminiService';
import { StorageService } from '../services/storageService';
import { UserProfile, BoardItem, StepId } from '../types';
import { useBoard } from '../hooks/useBoard';
import { StepLayout } from './common/StepLayout';
import { IdeaBoard } from './common/IdeaBoard';
import { FinalDecisionSection } from './common/FinalDecisionSection';

interface Step1Props {
  user: UserProfile;
  onComplete: () => void;
}

export const Step1_Mission: React.FC<Step1Props> = ({ user, onComplete }) => {
  const [keyword, setKeyword] = useState('');
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [showBoard, setShowBoard] = useState(false);
  
  // Final Selection & Editing State
  const [selectedFinalContent, setSelectedFinalContent] = useState<string | null>(null);
  const [finalEditText, setFinalEditText] = useState(''); 
  const [isLocalEditMode, setIsLocalEditMode] = useState(false);

  const [modal, setModal] = useState<ModalProps>({ isOpen: false, onClose: () => {}, message: '' });
  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));
  
  const isCaptain = user.isCaptain;

  const { 
    boardItems, 
    finalCandidates, 
    decisionItem, 
    setDecisionItem,
    loadBoard, 
    addItem, 
    voteItem, 
    updateItem, 
    deleteItem 
  } = useBoard(StepId.MISSION, user, isLocalEditMode);

  useEffect(() => {
    if (decisionItem && !isCaptain) {
        let status = 'REVIEW';
        try { status = JSON.parse(decisionItem.extraInfo || '{}').status; } catch(e) {}
        if (status === 'CONFIRMED') {
            StorageService.saveWorkshopData({ step1_mission: decisionItem.content }).then(onComplete);
        }
    }
  }, [decisionItem, isCaptain, onComplete]);

  const handleRecommend = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    try {
      const results = await GeminiService.recommendMission(user.company, keyword);
      setRecommendations(results);
    } finally {
      setLoading(false);
    }
  };

  const handlePostToBoard = async (mission: string) => {
    await addItem(mission);
    setShowBoard(true);
  };

  const handleDeleteItem = (itemId: string) => {
    setModal({
      isOpen: true,
      onClose: closeModal,
      type: 'danger',
      title: '삭제하시겠습니까?',
      message: '정말로 삭제하시겠습니까?',
      confirmText: '삭제',
      onConfirm: async () => {
        closeModal();
        await deleteItem(itemId);
      }
    });
  };

  const handleSynthesize = async () => {
    if (!isCaptain) return;
    if (finalCandidates.length > 0) {
      setModal({ isOpen: true, onClose: closeModal, type: 'alert', title: '알림', message: '이미 최종 후보가 생성되어 있습니다.' });
      return;
    }
    if (boardItems.length < 3) {
      setModal({ isOpen: true, onClose: closeModal, type: 'alert', title: '데이터 부족', message: '최소 3개 이상의 의견이 모여야 AI 종합이 가능합니다.' });
      return;
    }
    setSynthesizing(true);
    try {
      const top3 = boardItems.sort((a,b) => b.votes - a.votes).slice(0, 3).map(item => item.content);
      const results = await GeminiService.synthesizeOpinions('Mission', user.company, top3);
      await Promise.all(results.map(async (text, idx) => {
         const candidateItem: BoardItem = {
           id: `mission_final_${Date.now()}_${idx}`,
           stepId: StepId.MISSION,
           authorName: 'AI Consultant',
           authorGroup: 'System',
           company: user.company,
           batch: user.batch,
           content: text,
           category: 'FINAL_CANDIDATE',
           votes: 0,
           votedUserIds: [],
           timestamp: Date.now() + idx
         };
         return StorageService.addBoardItem(candidateItem);
      }));
      await loadBoard();
    } finally {
      setSynthesizing(false);
    }
  };

  const handleSelectCandidate = (candidate: string) => {
    setSelectedFinalContent(candidate);
    setFinalEditText(candidate);
  };

  const handleShareForReview = async () => {
      if (!isCaptain) return;
      if (!finalEditText.trim()) {
          setModal({ isOpen: true, onClose: closeModal, type: 'alert', title: '알림', message: '공유할 문구를 입력해주세요.' });
          return;
      }

      if (decisionItem) {
          await StorageService.updateBoardItemExtended(decisionItem.id, { 
              content: finalEditText.trim(),
              extraInfo: JSON.stringify({ status: 'REVIEW' }) 
          });
      } else {
          const newItem: BoardItem = {
              id: `mission_decision_${user.group}_${Date.now()}`,
              stepId: StepId.MISSION,
              authorName: user.name,
              authorGroup: user.group,
              company: user.company,
              batch: user.batch,
              content: finalEditText.trim(),
              category: 'MISSION_DECISION',
              extraInfo: JSON.stringify({ status: 'REVIEW' }),
              votes: 0,
              votedUserIds: [],
              timestamp: Date.now()
          };
          await StorageService.addBoardItem(newItem);
      }
      setIsLocalEditMode(false);
      await loadBoard();
  };

  const handleMemberReady = async () => {
      if (!decisionItem) return;
      await voteItem(decisionItem.id, 'CANDIDATES'); 
  };

  const handleFinalize = async () => {
      if (!isCaptain || !decisionItem) return;
      
      setModal({
          isOpen: true,
          onClose: closeModal,
          type: 'confirm',
          title: '최종 확정',
          message: '이 문구로 최종 확정하시겠습니까? 확정 후에는 수정할 수 없습니다.',
          confirmText: '최종 확정',
          onConfirm: async () => {
              closeModal();
              await StorageService.updateBoardItemExtended(decisionItem.id, {
                  extraInfo: JSON.stringify({ status: 'CONFIRMED' })
              });
              await StorageService.saveWorkshopData({ step1_mission: decisionItem.content });
              onComplete();
          }
      });
  };

  let decisionStatus = 'NONE';
  if (decisionItem) {
      try { decisionStatus = JSON.parse(decisionItem.extraInfo || '{}').status; } catch(e) {}
  }

  const inputStyle = "w-full px-6 py-5 rounded-none bg-white border-[3px] border-black focus:outline-none focus:shadow-[4px_4px_0px_0px_#a855f7] transition-all text-black placeholder-gray-400 text-xl font-bold";

  return (
    <StepLayout title="Step 1. 미션(Why)" borderColorClass="border-t-[#a855f7]">
      <Modal {...modal} />
      
      <div className="bg-[#f3e8ff] border-[3px] border-black p-8 mb-8 text-center shadow-[6px_6px_0px_0px_#000]">
         <h3 className="text-2xl md:text-3xl font-black text-black mb-6 leading-snug">
           "우리가 존재하는 이유이자<br className="md:hidden" /> 본질적인 업(業)은 무엇인가요?"
         </h3>
         <div className="inline-block bg-white border-2 border-black px-6 py-3">
           <p className="text-black text-lg font-bold flex items-center gap-2">
             <span>🤔</span>
             <span>만약 우리가 세상에서 없어진다면, <strong>세상과 고객은 무엇을 잃게 될까요?</strong></span>
           </p>
         </div>
      </div>

      <p className="text-black text-lg text-center mb-8 font-medium">
        위 질문에 대한 나의 생각을 예시와 같이 구체적으로 입력하고, AI의 추천을 받아보세요.<br/>
        <span className="text-white bg-[#a855f7] px-2 font-bold">우리 조만의 미션</span>을 함께 만들어갑니다.
      </p>

      {!showBoard && (
        <div className="animate-fade-in-up">
          <div className="flex flex-col md:flex-row gap-6 mb-8">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="예 : 고객의 성장을 돕는 전문적인 지식과 최첨단 기술을 보유한 파트너, 필요로 하는 학습에 대한 맞춤식 교육"
              className={`${inputStyle} flex-1 text-center md:text-left`}
            />
            <Button onClick={handleRecommend} loading={loading} disabled={!keyword.trim()} className="bg-[#a855f7] text-white hover:bg-[#9333ea] px-10 text-xl font-black h-auto py-4 shadow-[4px_4px_0px_0px_#000]">
              AI추천받기
            </Button>
          </div>

          {recommendations.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-black font-black bg-yellow-200 inline-block px-2 border border-black mb-2">AI 추천 문구</p>
              {recommendations.map((mission, idx) => (
                <div 
                  key={idx}
                  className="flex justify-between items-center gap-4 p-6 border-[3px] border-black bg-white hover:bg-gray-50 transition-all shadow-[4px_4px_0px_0px_#000]"
                >
                  <p className="text-lg text-black font-bold flex-1 break-keep leading-relaxed">{mission}</p>
                  <Button 
                    onClick={() => handlePostToBoard(mission)} 
                    variant="outline" 
                    className="text-sm px-6 py-2 border-2 shrink-0 whitespace-nowrap h-auto"
                  >
                    공유하기
                  </Button>
                </div>
              ))}
            </div>
          )}
          
           <div className="mt-8 text-center">
              <button onClick={() => setShowBoard(true)} className="text-gray-500 underline text-sm font-bold hover:text-black transition-colors">
                이미 의견을 제출했다면? 전체 게시판으로 이동
              </button>
           </div>
        </div>
      )}

      {(showBoard || boardItems.length > 0) && (
        <IdeaBoard 
            title="🗳️ 아이디어 게시판"
            items={boardItems}
            user={user}
            onVote={(id) => voteItem(id, 'IDEAS')}
            onEdit={updateItem}
            onDelete={handleDeleteItem}
            onSynthesize={handleSynthesize}
            isSynthesizing={synthesizing}
            canSynthesize={isCaptain && !isLocalEditMode && finalCandidates.length === 0 && !decisionItem}
            top3ColorClass="bg-[#fef08a]"
            top3BadgeColorClass="bg-[#facc15]"
        />
      )}

      {(finalCandidates.length > 0 || decisionItem || isLocalEditMode) && (
        <FinalDecisionSection 
            candidates={finalCandidates}
            decisionItem={decisionItem}
            user={user}
            isCaptain={!!isCaptain}
            isLocalEditMode={isLocalEditMode}
            selectedFinalContent={selectedFinalContent}
            finalEditText={finalEditText}
            onVoteCandidate={(id) => voteItem(id, 'CANDIDATES')}
            onSelectCandidate={handleSelectCandidate}
            onSetFinalEditText={setFinalEditText}
            onShareForReview={handleShareForReview}
            onEnterEditMode={() => {
                setIsLocalEditMode(true);
                setDecisionItem(null);
                setFinalEditText(decisionItem?.content || '');
            }}
            onMemberReady={handleMemberReady}
            onFinalize={handleFinalize}
            decisionStatus={decisionStatus}
            themeColorClass="bg-[#faf5ff]"
            accentColorClass="text-[#a855f7]"
            voteButtonColorClass="bg-[#a855f7]"
        />
      )}
    </StepLayout>
  );
};
