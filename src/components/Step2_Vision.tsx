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

interface Step2Props {
  user: UserProfile;
  onComplete: () => void;
}

export const Step2_Vision: React.FC<Step2Props> = ({ user, onComplete }) => {
  const [vision, setVision] = useState('');
  const [showBoard, setShowBoard] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  
  // Final Selection & Editing
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
  } = useBoard(StepId.VISION, user, isLocalEditMode);

  useEffect(() => {
    if (decisionItem && !isCaptain) {
        let status = 'REVIEW';
        try { status = JSON.parse(decisionItem.extraInfo || '{}').status; } catch(e) {}
        if (status === 'CONFIRMED') {
            StorageService.saveWorkshopData({ step2_vision: decisionItem.content }).then(onComplete);
        }
    }
  }, [decisionItem, isCaptain, onComplete]);

  const handlePost = async () => {
    if (vision.length < 5) return;
    await addItem(vision);
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
      setModal({ isOpen: true, onClose: closeModal, type: 'alert', title: '데이터 부족', message: '최소 3개 이상의 비전이 모여야 AI 종합이 가능합니다.' });
      return;
    }
    setSynthesizing(true);
    try {
      const top3 = boardItems.slice(0, 3).map(item => item.content);
      const results = await GeminiService.synthesizeOpinions('Vision', user.company, top3);
      await Promise.all(results.map(async (text, idx) => {
         const candidateItem: BoardItem = {
           id: `vision_final_${Date.now()}_${idx}`,
           stepId: StepId.VISION,
           authorName: 'AI Consultant',
           authorGroup: 'System',
           company: user.company,
           batch: user.batch,
           content: text,
           category: 'FINAL_VISION_CANDIDATE',
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
              id: `vision_decision_${user.group}_${Date.now()}`,
              stepId: StepId.VISION,
              authorName: user.name,
              authorGroup: user.group,
              company: user.company,
              batch: user.batch,
              content: finalEditText.trim(),
              category: 'VISION_DECISION',
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
          message: '이 비전으로 최종 확정하시겠습니까? 확정 후에는 수정할 수 없습니다.',
          confirmText: '최종 확정',
          onConfirm: async () => {
              closeModal();
              await StorageService.updateBoardItemExtended(decisionItem.id, {
                  extraInfo: JSON.stringify({ status: 'CONFIRMED' })
              });
              await StorageService.saveWorkshopData({ step2_vision: decisionItem.content });
              onComplete();
          }
      });
  };

  let decisionStatus = 'NONE';
  if (decisionItem) {
      try { decisionStatus = JSON.parse(decisionItem.extraInfo || '{}').status; } catch(e) {}
  }

  return (
    <StepLayout title="Step 2. 비전(What)" borderColorClass="border-t-[#ff6b6b]">
      <Modal {...modal} />
      
      <div className="bg-[#ffe4e6] border-[3px] border-black p-8 mb-8 text-center shadow-[6px_6px_0px_0px_#000]">
         <h3 className="text-2xl md:text-3xl font-black text-black mb-6 leading-snug">
           "3년 뒤, 우리 회사가 큰 성장을 이루었습니다.<br className="md:hidden" /> 과연 <span className="text-[#ff6b6b]">어떤 성과</span>들을 이루었을까요?"
         </h3>
         <div className="inline-block bg-white border-2 border-black px-6 py-3">
           <p className="text-black text-lg font-bold flex items-center gap-2 justify-center">
             <span>🚀</span>
             <span>미래의 주요 성과를 <strong>뉴스 헤드라인</strong> 형태로 상상해보세요.</span>
           </p>
         </div>
      </div>

      <p className="text-black text-lg text-center mb-8 font-medium">
        구체적인 성공의 모습을 입력하고 공유해주세요.<br/>
        <span className="text-white bg-[#ff6b6b] px-2 font-bold">동료들의 비전</span>과 합쳐져 우리 조의 멋진 미래가 완성됩니다.
      </p>

      {!showBoard && (
        <div className="animate-fade-in-up">
          <div className="relative mb-8">
            <div className="absolute top-0 left-0 px-4 py-2 bg-[#ff6b6b] text-white text-sm font-black border-[3px] border-black border-b-0 -translate-y-full ml-4">
              뉴스 헤드라인
            </div>
            <textarea
              value={vision}
              onChange={(e) => setVision(e.target.value)}
              placeholder="예: [특종] 우리 회사, 업계 최초 고객 만족도 100점 달성하며 글로벌 시장 1위 등극"
              className="w-full h-60 px-8 py-8 bg-white border-[3px] border-black text-black text-2xl font-bold focus:outline-none focus:shadow-[8px_8px_0px_0px_#ff6b6b] transition-all resize-none placeholder-gray-400"
            />
          </div>

          <div className="flex justify-between items-center">
            <button onClick={() => setShowBoard(true)} className="text-gray-500 underline text-sm font-bold hover:text-black">
              작성 없이 게시판 보기
            </button>
            <Button onClick={handlePost} disabled={vision.length < 5} className="bg-[#ff6b6b] hover:bg-[#ff5252] text-white text-xl py-4 px-12 shadow-[6px_6px_0px_0px_#000]">
              게시판에 공유하기
            </Button>
          </div>
        </div>
      )}

      {(showBoard || boardItems.length > 0) && (
        <IdeaBoard 
            title="📰 비전 헤드라인 게시판"
            items={boardItems}
            user={user}
            onVote={(id) => voteItem(id, 'IDEAS')}
            onEdit={updateItem}
            onDelete={handleDeleteItem}
            onSynthesize={handleSynthesize}
            isSynthesizing={synthesizing}
            canSynthesize={isCaptain && !isLocalEditMode && finalCandidates.length === 0 && !decisionItem}
            top3ColorClass="bg-[#ffedd5]"
            top3BadgeColorClass="bg-[#fb923c]"
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
            themeColorClass="bg-[#fff1f2]"
            accentColorClass="text-[#ff6b6b]"
            voteButtonColorClass="bg-[#db2777]"
        />
      )}
    </StepLayout>
  );
};
