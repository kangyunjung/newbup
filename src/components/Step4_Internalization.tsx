
import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Modal, ModalProps } from './Modal';
import { StorageService } from '../services/storageService';
import { UserProfile, BoardItem, StepId, WorkshopData } from '../types';

interface Step4Props {
  user: UserProfile;
  onComplete: () => void;
}

const TEMPLATES = [
  { id: 1, name: 'Trust blue', class: 'bg-[#eff6ff]', accent: 'text-blue-600', border: 'border-blue-200' },
  { id: 2, name: 'Growth green', class: 'bg-[#f0fdf4]', accent: 'text-green-600', border: 'border-green-200' },
  { id: 3, name: 'Passion red', class: 'bg-[#fef2f2]', accent: 'text-red-600', border: 'border-red-200' },
  { id: 4, name: 'Modern grey', class: 'bg-[#f9fafb]', accent: 'text-gray-600', border: 'border-gray-200' },
  { id: 5, name: 'Royal purple', class: 'bg-[#faf5ff]', accent: 'text-purple-600', border: 'border-purple-200' },
];

export const Step4_Internalization: React.FC<Step4Props> = ({ user, onComplete }) => {
  const [data, setData] = useState<WorkshopData>({});
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number>(1);
  const [actionInputs, setActionInputs] = useState<Record<string, string>>({});
  const [actionTypes, setActionTypes] = useState<Record<string, 'DO' | 'DONT'>>({});
  const [actionItems, setActionItems] = useState<BoardItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  
  const [captainSelection, setCaptainSelection] = useState<Record<string, { DO: string | null, DONT: string | null }>>({});
  const [decisionItem, setDecisionItem] = useState<BoardItem | null>(null);

  const [modal, setModal] = useState<ModalProps>({ isOpen: false, onClose: () => {}, message: '' });
  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

  const isCaptain = user.isCaptain;

  useEffect(() => {
    const init = async () => {
      const workshopData = await StorageService.getWorkshopData();
      setData(workshopData);
      if (workshopData.step3_votes) setSelectedValues(workshopData.step3_votes);
      if (workshopData.step4_templateId) setSelectedTemplateId(workshopData.step4_templateId);
      loadActionItems();
    };
    init();
    const interval = setInterval(loadActionItems, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadActionItems = async () => {
    const items = await StorageService.getBoardItems(StepId.INTERNALIZATION);
    const decision = items.find(i => i.category === 'INTERNALIZATION_DECISION' && i.authorGroup === user.group);
    const groupItems = items.filter(i => i.authorGroup === user.group && i.category !== 'INTERNALIZATION_DECISION');
    
    setActionItems(groupItems);
    setDecisionItem(decision || null);

    if (decision) {
        try {
            const selectionData = JSON.parse(decision.content);
            setCaptainSelection(selectionData);
            const status = JSON.parse(decision.extraInfo || '{}').status;
            if (status === 'CONFIRMED' && !isCaptain) {
                // Auto complete for member handled elsewhere
            }
        } catch(e) {
            console.error("Failed to parse decision", e);
        }
    }
  };

  const handleSelectTemplate = async (id: number) => {
    setSelectedTemplateId(id);
    await StorageService.saveWorkshopData({ step4_templateId: id });
  };

  const handlePostAction = async (valueCategory: string) => {
    const content = actionInputs[valueCategory];
    if (!content || content.length < 2) return;
    const type = actionTypes[valueCategory] || 'DO';
    const newItem: BoardItem = {
      id: Date.now().toString() + "_" + user.name,
      stepId: StepId.INTERNALIZATION,
      authorName: user.name,
      authorGroup: user.group,
      company: user.company,
      batch: user.batch,
      content: content,
      category: valueCategory,
      extraInfo: JSON.stringify({ type }), 
      votes: 0,
      timestamp: Date.now()
    };
    await StorageService.addBoardItem(newItem);
    await loadActionItems();
    setActionInputs(prev => ({ ...prev, [valueCategory]: '' }));
  };

  const handleVote = async (itemId: string) => {
    await StorageService.voteBoardItem(itemId, user.name);
    await loadActionItems();
  };

  const toggleActionType = (valueCategory: string, type: 'DO' | 'DONT') => {
    setActionTypes(prev => ({ ...prev, [valueCategory]: type }));
  };

  const startEditing = (item: BoardItem) => {
    setEditingId(item.id);
    setEditContent(item.content);
  };

  const saveEdit = async (itemId: string) => {
    if (!editContent.trim()) return;
    await StorageService.updateBoardItem(itemId, editContent);
    setEditingId(null);
    setEditContent('');
    await loadActionItems();
  };

  const deleteItem = (itemId: string) => {
    setModal({
      isOpen: true,
      onClose: closeModal,
      type: 'danger',
      title: 'Delete',
      message: '정말로 삭제하시겠습니까?',
      confirmText: '삭제',
      onConfirm: async () => {
        closeModal();
        await StorageService.deleteBoardItem(itemId);
        await loadActionItems();
      }
    });
  };

  const handleCaptainSelect = (category: string, type: 'DO' | 'DONT', content: string) => {
      if (!isCaptain) return;
      if (decisionItem && JSON.parse(decisionItem.extraInfo || '{}').status === 'CONFIRMED') return; 

      setCaptainSelection(prev => ({
          ...prev,
          [category]: {
              ...(prev[category] || { DO: null, DONT: null }),
              [type]: content
          }
      }));
  };

  const handleFinalConfirm = () => {
      const missing = selectedValues.some(val => !captainSelection[val]?.DO || !captainSelection[val]?.DONT);
      if (missing) {
          setModal({ isOpen: true, onClose: closeModal, type: 'alert', title: 'Check', message: '모든 핵심가치에 대해 Do/Don\'t를 하나씩 선택해주세요.' });
          return;
      }

      setModal({
          isOpen: true,
          onClose: closeModal,
          type: 'confirm',
          title: 'Final confirm',
          message: '이 내용으로 가치체계도를 확정하시겠습니까? 확정 후에는 수정할 수 없습니다.',
          confirmText: '최종 확정',
          onConfirm: async () => {
               closeModal();
               const newItem: BoardItem = {
                   id: `internalization_decision_${user.group}`,
                   stepId: StepId.INTERNALIZATION,
                   authorName: user.name,
                   authorGroup: user.group,
                   company: user.company,
                   batch: user.batch,
                   content: JSON.stringify(captainSelection),
                   category: 'INTERNALIZATION_DECISION',
                   extraInfo: JSON.stringify({ status: 'CONFIRMED' }),
                   votes: 0,
                   timestamp: Date.now()
               };
               
               if (decisionItem) {
                   await StorageService.updateBoardItemExtended(decisionItem.id, {
                       content: JSON.stringify(captainSelection),
                       extraInfo: JSON.stringify({ status: 'CONFIRMED' })
                   });
               } else {
                   await StorageService.addBoardItem(newItem);
               }
               
               onComplete();
          }
      });
  };

  const activeTemplate = TEMPLATES.find(t => t.id === selectedTemplateId) || TEMPLATES[0];
  const isConfirmed = decisionItem && JSON.parse(decisionItem.extraInfo || '{}').status === 'CONFIRMED';

  return (
    <div className="space-y-10 w-full max-w-7xl mx-auto pb-20">
      <Modal {...modal} />
      <Card className="border-t-[8px] border-t-[#f59e0b]">
        <h2 className="text-4xl font-black mb-8 text-black italic">Step 4. 내재화</h2>
        
        <div className="animate-fade-in-up mb-16">
           <h3 className="text-2xl font-black text-black mb-6 flex items-center gap-3">
             <span className="bg-[#f59e0b] text-white px-2 py-1 border-2 border-black shadow-[4px_4px_0px_0px_#000]">Part 1</span>
             Action plan brainstorming
           </h3>
           <p className="text-black font-bold mb-8 text-lg">
             구체적으로 <strong>해야 할 일(Do)</strong>과 <strong>하지 말아야 할 일(Don't)</strong>을 적어보세요.<br/>
             {isCaptain ? "조장은 팀원들의 의견 중 가장 적합한 것을 [Select]하여 최종안을 만듭니다." : "다양한 의견을 내고 투표하세요. 최종 선정은 조장이 진행합니다."}
           </p>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {selectedValues.map((value, idx) => {
               const shortValue = value.split(' (')[0];
               const categoryItems = actionItems.filter(i => i.category === value);
               const doCount = categoryItems.filter(i => !i.extraInfo || JSON.parse(i.extraInfo).type !== 'DONT').length;
               const dontCount = categoryItems.length - doCount;
               const currentType = actionTypes[value] || 'DO';
               const currentSelection = captainSelection[value] || { DO: null, DONT: null };

               return (
                 <div key={idx} className="bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_#000] p-4 flex flex-col h-[700px]">
                   <div className="text-center mb-4 pb-4 border-b-2 border-black">
                     <h4 className="text-2xl font-black text-black uppercase">{shortValue}</h4>
                     <p className="text-xs font-bold text-gray-500 mt-1 flex justify-center gap-3">
                       <span className="text-[#10b981]">Do: {doCount}</span>
                       <span className="text-black">|</span>
                       <span className="text-[#ef4444]">Don't: {dontCount}</span>
                     </p>
                   </div>

                   <div className="flex-1 overflow-y-auto space-y-3 p-2 bg-gray-100 border-2 border-black border-dashed mb-4 custom-scrollbar">
                     {categoryItems.length === 0 && (
                       <div className="text-center text-gray-400 text-sm py-10 font-bold">
                         아직 등록된 내용이 없습니다.
                       </div>
                     )}
                     {categoryItems.map(item => {
                       const isVoted = item.votedUserIds?.includes(user.name);
                       const isAuthor = item.authorName === user.name;
                       const isEditing = editingId === item.id;
                       let type = 'DO';
                       try { if (item.extraInfo) type = JSON.parse(item.extraInfo).type; } catch(e) {}
                       const isDo = type === 'DO';
                       const isSelected = isDo ? (currentSelection.DO === item.content) : (currentSelection.DONT === item.content);

                       return (
                         <div 
                           key={item.id} 
                           className={`
                             p-3 border-2 border-black shadow-[3px_3px_0px_0px_#000] relative transition-all
                             ${isDo ? 'bg-[#dcfce7]' : 'bg-[#fee2e2]'}
                             ${isEditing ? 'z-10 ring-2 ring-black' : ''}
                             ${isSelected ? 'ring-4 ring-[#f59e0b] ring-offset-1 z-10' : ''}
                           `}
                         >
                           <div className="absolute -top-3 left-2 flex gap-1">
                             {isDo ? (
                               <span className="bg-[#10b981] text-white text-[10px] font-black px-2 border border-black">Do</span>
                             ) : (
                               <span className="bg-[#ef4444] text-white text-[10px] font-black px-2 border border-black">Don't</span>
                             )}
                             {isSelected && (
                                <span className="bg-[#f59e0b] text-black text-[10px] font-black px-2 border border-black">Selected</span>
                             )}
                           </div>
                           
                           {isEditing ? (
                              <div className="mt-2">
                                <textarea 
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="w-full text-sm p-1 border border-black font-bold mb-1"
                                  rows={3}
                                />
                                <div className="flex justify-end gap-1">
                                  <button onClick={() => setEditingId(null)} className="px-2 bg-gray-300 text-xs font-bold border border-black">취소</button>
                                  <button onClick={() => saveEdit(item.id)} className="px-2 bg-black text-white text-xs font-bold border border-black">저장</button>
                                </div>
                              </div>
                           ) : (
                             <>
                               {isAuthor && !isConfirmed && (
                                 <div className="absolute top-1 right-1 flex gap-1 bg-white border border-black p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button onClick={() => startEditing(item)} className="w-4 h-4 flex items-center justify-center text-[10px]">✏️</button>
                                   <button onClick={() => deleteItem(item.id)} className="w-4 h-4 flex items-center justify-center text-[10px] text-red-600">🗑️</button>
                                 </div>
                               )}
                               <p className="font-bold text-sm mb-2 mt-2 leading-snug whitespace-pre-wrap text-black">{item.content}</p>
                               
                               <div className="flex justify-between items-center pt-2 border-t border-black/10">
                                 <span className="text-[10px] text-gray-500 font-bold">{item.authorName}</span>
                                 <div className="flex gap-2">
                                     <button onClick={() => handleVote(item.id)} className={`flex items-center gap-1 text-[10px] font-bold px-2 border border-black transition-colors ${isVoted ? 'bg-[#ff6b6b] text-white' : 'bg-white text-black'}`}>
                                        <span>♥</span> {item.votes}
                                     </button>
                                     {isCaptain && !isConfirmed && (
                                         <button 
                                            onClick={() => handleCaptainSelect(value, isDo ? 'DO' : 'DONT', item.content)}
                                            className={`text-[10px] font-black px-2 border border-black ${isSelected ? 'bg-black text-white' : 'bg-white text-gray-400 hover:text-black hover:border-black'}`}
                                         >
                                            {isSelected ? 'Picked' : 'Select'}
                                         </button>
                                     )}
                                 </div>
                               </div>
                             </>
                           )}
                         </div>
                       );
                     })}
                   </div>

                   {!isConfirmed && (
                       <div className="pt-2">
                            <div className="flex gap-2 mb-2">
                                <button onClick={() => toggleActionType(value, 'DO')} className={`flex-1 py-1 text-xs font-black border-2 border-black shadow-[2px_2px_0px_0px_#000] active:shadow-none transition-all ${currentType === 'DO' ? 'bg-[#10b981] text-white' : 'bg-white text-black'}`}>✅ Do</button>
                                <button onClick={() => toggleActionType(value, 'DONT')} className={`flex-1 py-1 text-xs font-black border-2 border-black shadow-[2px_2px_0px_0px_#000] active:shadow-none transition-all ${currentType === 'DONT' ? 'bg-[#ef4444] text-white' : 'bg-white text-black'}`}>🚫 Don't</button>
                            </div>
                            <textarea
                            value={actionInputs[value] || ''}
                            onChange={(e) => setActionInputs(prev => ({...prev, [value]: e.target.value}))}
                            placeholder="내용 입력..."
                            className={`w-full bg-white border-2 rounded-none p-2 text-black font-bold text-sm focus:outline-none resize-none h-16 mb-2 ${currentType === 'DO' ? 'border-[#10b981]' : 'border-[#ef4444]'}`}
                            />
                            <Button onClick={() => handlePostAction(value)} disabled={!actionInputs[value]} className={`w-full py-3 text-sm font-black border-2 border-black shadow-[3px_3px_0px_0px_#000] ${currentType === 'DO' ? 'bg-[#10b981] hover:bg-[#059669]' : 'bg-[#ef4444] hover:bg-[#dc2626]'} text-white`}>
                                Add card
                            </Button>
                        </div>
                   )}
                 </div>
               );
             })}
           </div>
        </div>

        <div className="animate-fade-in-up">
           <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4 border-t-[3px] border-black pt-10">
             <div>
               <h3 className="text-2xl font-black text-black mb-2 flex items-center gap-3">
                 <span className="bg-[#f59e0b] text-white px-2 py-1 border-2 border-black shadow-[4px_4px_0px_0px_#000]">Part 2</span>
                 Value structure
               </h3>
               <p className="text-black font-bold">
                   {isConfirmed 
                     ? "우리 조의 최종 가치체계도입니다." 
                     : (isCaptain ? "상단에서 Do/Don't를 선택하여 체계도를 완성하세요." : "조장이 최종 체계도를 완성 중입니다. 잠시만 기다려주세요.")}
               </p>
             </div>
           </div>

           {(isCaptain || isConfirmed) ? (
               <>
                    <div className="flex gap-4 mb-8 overflow-x-auto pb-4 custom-scrollbar">
                        {TEMPLATES.map(t => (
                        <button
                            key={t.id}
                            onClick={() => handleSelectTemplate(t.id)}
                            disabled={!isCaptain && !isConfirmed}
                            className={`shrink-0 w-32 h-20 border-[3px] transition-all flex items-center justify-center font-black text-sm shadow-[4px_4px_0px_0px_#000] ${selectedTemplateId === t.id ? 'bg-[#f59e0b] border-black text-white' : 'bg-white border-black text-black hover:bg-gray-100'}`}
                        >
                            {t.name}
                        </button>
                        ))}
                    </div>

                    <div className={`w-full border-[4px] border-black shadow-[12px_12px_0px_0px_#000] relative transition-all duration-500 ${activeTemplate.class}`}>
                        <div className="relative p-10 md:p-16 flex flex-col items-center text-center space-y-12">
                        
                        <div className="w-full flex justify-between items-center text-black/50 text-sm font-black uppercase tracking-widest border-b-2 border-black/10 pb-4">
                            <span>{user.company}</span>
                            <span>{user.group}</span>
                        </div>

                        <div className="w-full max-w-4xl bg-white border-[3px] border-black p-6 shadow-[6px_6px_0px_0px_#000]">
                            <span className={`block text-xs font-black uppercase tracking-widest mb-2 ${activeTemplate.accent}`}>Our mission</span>
                            <h2 className="text-3xl md:text-4xl font-black text-black leading-tight break-keep">
                            "{data.step1_mission || 'Undefined'}"
                            </h2>
                        </div>

                        <div className="w-[4px] h-12 bg-black"></div>

                        <div className="w-full max-w-4xl bg-white border-[3px] border-black p-6 shadow-[6px_6px_0px_0px_#000]">
                            <span className={`block text-xs font-black uppercase tracking-widest mb-2 ${activeTemplate.accent}`}>Our vision</span>
                            <h3 className="text-2xl md:text-3xl font-black text-black leading-snug break-keep">
                            "{data.step2_vision || 'Undefined'}"
                            </h3>
                        </div>

                        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                            {selectedValues.map((value, idx) => {
                                const sel = captainSelection[value] || { DO: null, DONT: null };
                                
                                return (
                                <div key={idx} className="bg-white border-[3px] border-black p-6 shadow-[6px_6px_0px_0px_#000] flex flex-col h-full">
                                    <div className="mb-6 border-b-2 border-black pb-4">
                                    <span className="text-4xl mb-2 block">💎</span>
                                    <h4 className="text-xl font-black text-black">{value.split(' (')[0]}</h4>
                                    </div>
                                    
                                    <div className="space-y-4 flex-1 text-left">
                                    <div className="bg-[#dcfce7] p-3 border-2 border-black">
                                        <span className="text-[10px] font-black text-black bg-[#10b981] text-white px-1 inline-block mb-1 border border-black">Do</span>
                                        <p className="text-sm text-black font-bold leading-relaxed">
                                        {sel.DO || <span className="opacity-50 italic">Not selected</span>}
                                        </p>
                                    </div>
                                    
                                    <div className="bg-[#fee2e2] p-3 border-2 border-black">
                                        <span className="text-[10px] font-black text-black bg-[#ef4444] text-white px-1 inline-block mb-1 border border-black">Don't</span>
                                        <p className="text-sm text-black font-bold leading-relaxed">
                                        {sel.DONT || <span className="opacity-50 italic">Not selected</span>}
                                        </p>
                                    </div>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                        </div>
                    </div>
               </>
           ) : (
               <div className="py-20 text-center border-[3px] border-black bg-gray-100 border-dashed">
                   <div className="animate-spin w-12 h-12 border-4 border-black border-t-transparent rounded-full mx-auto mb-4"></div>
                   <h3 className="text-2xl font-black text-black">Waiting for captain...</h3>
                   <p className="text-gray-500 font-bold">조장이 행동약속을 최종 선정하고 있습니다.</p>
               </div>
           )}
        </div>

        <div className="mt-12 text-center border-t-[3px] border-black pt-8">
           {isCaptain && !isConfirmed ? (
               <Button onClick={handleFinalConfirm} className="bg-black text-white hover:bg-gray-800 px-12 py-4 text-xl h-auto shadow-[6px_6px_0px_0px_#10b981]">
                    📝 Confirm & Complete
               </Button>
           ) : (
               <Button onClick={onComplete} disabled={!isConfirmed} className={`px-12 py-4 text-xl h-auto shadow-[6px_6px_0px_0px_#000] ${!isConfirmed ? 'bg-gray-300 cursor-not-allowed' : 'bg-black text-white'}`}>
                    최종 결과 확인하기 →
               </Button>
           )}
        </div>
      </Card>
    </div>
  );
};
