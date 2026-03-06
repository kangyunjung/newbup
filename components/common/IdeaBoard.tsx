import React, { useState } from 'react';
import { BoardItem, UserProfile } from '../../types';
import { Button } from '../Button';

interface IdeaBoardProps {
  title: string;
  items: BoardItem[];
  user: UserProfile;
  onVote: (itemId: string) => void;
  onEdit: (itemId: string, content: string) => void;
  onDelete: (itemId: string) => void;
  onSynthesize?: () => void;
  isSynthesizing?: boolean;
  canSynthesize?: boolean;
  top3ColorClass?: string; // e.g., "bg-[#fef08a]"
  top3BadgeColorClass?: string; // e.g., "bg-[#facc15]"
}

export const IdeaBoard: React.FC<IdeaBoardProps> = ({
  title,
  items,
  user,
  onVote,
  onEdit,
  onDelete,
  onSynthesize,
  isSynthesizing = false,
  canSynthesize = false,
  top3ColorClass = "bg-[#fef08a]",
  top3BadgeColorClass = "bg-[#facc15]"
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const startEditing = (item: BoardItem) => {
    setEditingId(item.id);
    setEditContent(item.content);
  };

  const handleSaveEdit = (itemId: string) => {
    if (!editContent.trim()) return;
    onEdit(itemId, editContent);
    setEditingId(null);
    setEditContent('');
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-end px-2 gap-4">
        <div>
          <h3 className="text-3xl font-black text-black flex items-center gap-2">
            {title}
            <span className="text-sm font-bold text-white bg-black px-2 py-1 ml-2">{items.length} Ideas</span>
          </h3>
          <p className="text-black text-sm mt-1 font-medium break-keep">
            나와 우리 조원들이 생각한 아이디어를 살펴 보고, <strong>가장 공감되는 하나</strong>에 투표합니다.
          </p>
        </div>
        
        {canSynthesize && onSynthesize && (
          <Button 
            onClick={onSynthesize} 
            disabled={isSynthesizing || items.length < 3} 
            className="bg-[#d946ef] hover:bg-[#c026d3] text-white shadow-[6px_6px_0px_0px_#000]"
            loading={isSynthesizing}
          >
            ✨ AI 종합 (초안 생성)
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item, idx) => {
          const isVoted = item.votedUserIds?.includes(user.name);
          const isAuthor = item.authorName === user.name;
          const isEditing = editingId === item.id;
          
          const rank = items.sort((a,b) => b.votes - a.votes).findIndex(i => i.id === item.id) + 1;
          const isTop3 = rank <= 3 && item.votes > 0;

          return (
            <div key={item.id} className={`relative p-6 border-[3px] border-black transition-all shadow-[6px_6px_0px_0px_#000] ${isTop3 ? top3ColorClass : 'bg-white'}`}>
              {isTop3 && (
                <div className={`absolute -top-4 -right-4 w-10 h-10 flex items-center justify-center ${top3BadgeColorClass} border-[3px] border-black rounded-full font-black text-black text-lg z-10 shadow-sm`}>
                  {rank}
                </div>
              )}

              {isEditing ? (
                <div className="mb-4">
                  <textarea 
                    value={editContent} 
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full bg-white p-3 border-2 border-black focus:outline-none h-24 text-sm text-black font-bold resize-none"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => setEditingId(null)} className="text-xs text-black underline font-bold">취소</button>
                    <button onClick={() => handleSaveEdit(item.id)} className="text-xs bg-black text-white px-2 py-1 font-bold">저장</button>
                  </div>
                </div>
              ) : (
                <p className="text-lg text-black font-bold mb-4 leading-relaxed min-h-[4rem] group relative break-keep">
                  {item.content}
                  {isAuthor && (
                     <div className="absolute top-0 right-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-black p-1">
                       <button onClick={() => startEditing(item)} className="text-black hover:text-[#a855f7]" title="수정">✏️</button>
                       <button onClick={() => onDelete(item.id)} className="text-black hover:text-red-600" title="삭제">🗑️</button>
                     </div>
                  )}
                </p>
              )}
              
              <div className="flex justify-between items-center pt-4 border-t-2 border-black">
                <div className="flex flex-col">
                  <span className="text-xs font-black text-black uppercase">{item.authorName}</span>
                  <span className="text-[10px] font-bold text-gray-600">{item.authorGroup}</span>
                </div>
                <button 
                  onClick={() => onVote(item.id)}
                  className={`flex items-center gap-2 px-3 py-1 border-2 border-black transition-all font-bold ${isVoted ? 'bg-[#ff6b6b] text-white' : 'bg-white text-black hover:bg-gray-100'}`}
                >
                  <span>❤️</span>
                  <span>{item.votes}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
