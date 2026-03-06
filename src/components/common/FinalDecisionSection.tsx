import React from 'react';
import { Card } from '../Card';
import { Button } from '../Button';
import { BoardItem, UserProfile } from '../../types';

interface FinalDecisionSectionProps {
  candidates: BoardItem[];
  decisionItem: BoardItem | null;
  user: UserProfile;
  isCaptain: boolean;
  isLocalEditMode: boolean;
  selectedFinalContent: string | null;
  finalEditText: string;
  onVoteCandidate: (itemId: string) => void;
  onSelectCandidate: (content: string) => void;
  onSetFinalEditText: (text: string) => void;
  onShareForReview: () => void;
  onEnterEditMode: () => void;
  onMemberReady: () => void;
  onFinalize: () => void;
  decisionStatus: string;
  themeColorClass?: string; // e.g., "bg-[#faf5ff]"
  accentColorClass?: string; // e.g., "text-[#a855f7]"
  voteButtonColorClass?: string; // e.g., "bg-[#a855f7]"
}

export const FinalDecisionSection: React.FC<FinalDecisionSectionProps> = ({
  candidates,
  decisionItem,
  user,
  isCaptain,
  isLocalEditMode,
  selectedFinalContent,
  finalEditText,
  onVoteCandidate,
  onSelectCandidate,
  onSetFinalEditText,
  onShareForReview,
  onEnterEditMode,
  onMemberReady,
  onFinalize,
  decisionStatus,
  themeColorClass = "bg-[#faf5ff]",
  accentColorClass = "text-[#a855f7]",
  voteButtonColorClass = "bg-[#a855f7]"
}) => {
  return (
    <Card className={`animate-fade-in-up border-[4px] border-black ${themeColorClass} shadow-[12px_12px_0px_0px_#000] p-8 md:p-12 relative overflow-hidden`}>
       <div className="absolute top-0 left-0 w-full h-4 bg-[repeating-linear-gradient(45deg,#000,#000_10px,transparent_10px,transparent_20px)] opacity-10"></div>
       
       {/* If Review Mode Active */}
       {decisionItem && !isLocalEditMode ? (
           <div className="animate-fade-in">
               <div className="text-center mb-8">
                   <span className="bg-black text-white text-sm font-black px-3 py-1 uppercase tracking-widest border-2 border-white shadow-sm mb-4 inline-block">
                       {decisionStatus === 'CONFIRMED' ? '확정 완료' : '최종 확인 중'}
                   </span>
                   <h3 className="text-3xl font-black text-black uppercase mb-2">팀 합의 도출</h3>
                   <p className="text-gray-600 font-bold">
                       {isCaptain ? "팀원들의 동의를 확인하고 최종 확정해주세요." : "조장이 제안한 최종 문구입니다. 동의한다면 버튼을 눌러주세요."}
                   </p>
               </div>

               <div className="bg-white border-[3px] border-black p-8 md:p-10 mb-8 relative shadow-[6px_6px_0px_0px_#000]">
                   <div className="absolute -top-4 -left-4 text-6xl">❝</div>
                   <p className="text-2xl md:text-4xl font-black text-center text-black leading-snug break-keep">
                       {decisionItem.content}
                   </p>
                   <div className="absolute -bottom-8 -right-4 text-6xl rotate-180">❝</div>
               </div>

               <div className="flex flex-col items-center gap-6">
                   <div className="flex items-center gap-3 bg-white border-2 border-black px-6 py-3 rounded-full">
                       <span className="text-2xl">🙋‍♀️</span>
                       <span className="text-black font-black text-lg">
                           동의 인원: <span className={`${accentColorClass} text-2xl ml-2`}>{decisionItem.votes}</span>
                       </span>
                   </div>

                   {isCaptain ? (
                       <div className="flex gap-4">
                           <Button variant="outline" onClick={onEnterEditMode} className="border-2">
                               수정하기
                           </Button>
                           <Button onClick={onFinalize} className="bg-black text-white hover:bg-gray-800 px-10 py-4 text-lg shadow-[4px_4px_0px_0px_#000]">
                               최종 확정 및 완료 →
                           </Button>
                       </div>
                   ) : (
                       <Button 
                           onClick={onMemberReady} 
                           disabled={decisionItem.votedUserIds?.includes(user.name)}
                           className={`px-12 py-4 text-xl shadow-[4px_4px_0px_0px_#000] ${decisionItem.votedUserIds?.includes(user.name) ? 'bg-green-500 text-white border-green-700' : `${voteButtonColorClass} text-white`}`}
                       >
                           {decisionItem.votedUserIds?.includes(user.name) ? '✅ 준비 완료!' : '👍 네, 동의합니다!'}
                       </Button>
                   )}
               </div>
           </div>
       ) : (
           <>
               <h3 className="text-3xl font-black text-black mb-6 text-center bg-white border-[3px] border-black inline-block px-6 py-2 shadow-[4px_4px_0px_0px_#000]">
                 🏆 최종 선정 투표
               </h3>
               <p className="text-black font-bold text-center mb-10 text-lg">
                 전체 의견을 종합하여 AI가 도출한 3가지 후보입니다.<br/>
                 <strong>가장 잘 나타낸 항목 하나</strong>에 투표하여 최종안을 결정해주세요. 
                 {isCaptain ? " (조장이 최종 확정합니다)" : " (최종 확정은 조장이 진행합니다)"}
               </p>

               <div className="grid gap-4 mb-10">
                 {candidates.map((candidate, idx) => {
                   const isVoted = candidate.votedUserIds?.includes(user.name);
                   const isSelected = selectedFinalContent === candidate.content;

                   return (
                     <div 
                       key={candidate.id}
                       className={`
                         p-6 border-[3px] border-black transition-all flex flex-col md:flex-row gap-4 justify-between items-center shadow-[6px_6px_0px_0px_#000]
                         ${isVoted ? 'bg-gray-100' : 'bg-white'}
                         ${isSelected ? `ring-4 ring-black ring-offset-2` : ''}
                       `}
                     >
                       <div className="flex items-start gap-4 flex-1">
                         <div className="w-10 h-10 flex items-center justify-center font-black text-xl shrink-0 border-[3px] border-black bg-black text-white">
                           {String.fromCharCode(65 + idx)}
                         </div>
                         <p className="text-xl font-bold leading-relaxed text-black">
                           {candidate.content}
                         </p>
                       </div>
                       
                       <div className="flex items-center gap-4 shrink-0">
                         <button 
                           onClick={() => onVoteCandidate(candidate.id)}
                           className={`flex items-center gap-2 px-6 py-3 border-[3px] border-black font-black transition-all shadow-[4px_4px_0px_0px_#000] active:shadow-none ${isVoted ? `${voteButtonColorClass} text-white` : 'bg-white text-black hover:bg-gray-100'}`}
                         >
                           <span>{isVoted ? '투표 완료' : '투표하기'}</span>
                           <span className="bg-black text-white px-2 rounded-full text-xs">{candidate.votes}</span>
                         </button>
                         
                         {isCaptain && (
                           <button
                              onClick={() => onSelectCandidate(candidate.content)}
                              className={`px-4 py-2 text-sm font-bold underline ${isSelected ? accentColorClass : 'text-gray-500 hover:text-black'}`}
                           >
                              선택하기
                           </button>
                         )}
                       </div>
                     </div>
                   );
                 })}
               </div>

               {/* Final Polishing Area */}
               {(selectedFinalContent || isLocalEditMode) && (
                 <div className="bg-white p-6 border-[3px] border-black animate-fade-in">
                    <label className="block text-black text-sm font-black mb-3 flex justify-between bg-gray-100 p-2 border-b-2 border-black">
                       <span>✏️ 최종 문구 다듬기</span>
                       <span className="text-gray-500 font-normal">조장은 필요시 문장을 다듬어주세요</span>
                    </label>
                    <textarea
                      value={finalEditText}
                      onChange={(e) => onSetFinalEditText(e.target.value)}
                      disabled={!isCaptain}
                      className="w-full p-4 bg-white border-2 border-gray-300 text-black text-xl font-bold focus:outline-none focus:border-black mb-6 min-h-[100px] leading-relaxed resize-none disabled:bg-gray-100 disabled:text-gray-500"
                    />
                    <div className="text-center">
                      {isCaptain ? (
                        <Button onClick={onShareForReview} className="bg-black text-white hover:bg-gray-800 px-12 py-4 text-lg w-full md:w-auto">
                          미리보기 및 팀원과 공유하기
                        </Button>
                      ) : (
                        <div className="p-4 bg-gray-100 border-2 border-black text-gray-500 font-bold">
                           조장이 최종 문구를 다듬고 공유할 때까지 대기해주세요.
                        </div>
                      )}
                    </div>
                 </div>
               )}
           </>
       )}
    </Card>
  );
};
