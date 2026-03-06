import { useState, useEffect, useCallback } from 'react';
import { StorageService } from '../services/storageService';
import { BoardItem, StepId, UserProfile } from '../types';

export const useBoard = (stepId: StepId, user: UserProfile, isLocalEditMode: boolean = false) => {
  const [boardItems, setBoardItems] = useState<BoardItem[]>([]);
  const [finalCandidates, setFinalCandidates] = useState<BoardItem[]>([]);
  const [decisionItem, setDecisionItem] = useState<BoardItem | null>(null);
  const [loading, setLoading] = useState(false);

  const loadBoard = useCallback(async () => {
    // setLoading(true); // 폴링 시 깜빡임 방지를 위해 로딩 상태는 최초 혹은 명시적일 때만 사용하는 것이 좋음
    try {
      const allItems = await StorageService.getBoardItems(stepId);
      
      // 카테고리 필터링 로직
      const isIdea = (c: string | undefined) => 
        c !== 'FINAL_CANDIDATE' && c !== 'MISSION_DECISION' && 
        c !== 'FINAL_VISION_CANDIDATE' && c !== 'VISION_DECISION';
        
      const isCandidate = (c: string | undefined) => 
        c === 'FINAL_CANDIDATE' || c === 'FINAL_VISION_CANDIDATE';
        
      const isDecision = (c: string | undefined) => 
        c === 'MISSION_DECISION' || c === 'VISION_DECISION';

      const ideas = allItems.filter(i => isIdea(i.category));
      const candidates = allItems.filter(i => isCandidate(i.category)).sort((a,b) => b.votes - a.votes);
      const decision = allItems.find(i => isDecision(i.category) && i.authorGroup === user.group);
      
      const groupItems = ideas.filter(i => i.authorGroup === user.group);
      
      setBoardItems(groupItems);
      setFinalCandidates(candidates);
      
      if (!isLocalEditMode) {
        setDecisionItem(decision || null);
      }
    } catch (error) {
      console.error("Failed to load board items:", error);
    }
  }, [stepId, user.group, isLocalEditMode]);

  useEffect(() => {
    loadBoard();
    const interval = setInterval(() => {
      if (!isLocalEditMode) {
        loadBoard();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [loadBoard, isLocalEditMode]);

  const addItem = async (content: string) => {
    const newItem: BoardItem = {
      id: Date.now().toString() + "_" + user.name,
      stepId: stepId,
      authorName: user.name,
      authorGroup: user.group,
      company: user.company,
      batch: user.batch,
      content: content,
      votes: 0,
      votedUserIds: [],
      timestamp: Date.now()
    };
    await StorageService.addBoardItem(newItem);
    await loadBoard();
  };

  const voteItem = async (itemId: string, listType: 'IDEAS' | 'CANDIDATES') => {
    const list = listType === 'IDEAS' ? boardItems : finalCandidates;
    const previouslyVotedItem = list.find(item => item.votedUserIds?.includes(user.name));

    if (previouslyVotedItem && previouslyVotedItem.id !== itemId) {
      await StorageService.voteBoardItem(previouslyVotedItem.id, user.name);
    }

    await StorageService.voteBoardItem(itemId, user.name);
    await loadBoard();
  };

  const updateItem = async (itemId: string, content: string) => {
    await StorageService.updateBoardItem(itemId, content);
    await loadBoard();
  };

  const deleteItem = async (itemId: string) => {
    await StorageService.deleteBoardItem(itemId);
    await loadBoard();
  };

  return {
    boardItems,
    finalCandidates,
    decisionItem,
    setDecisionItem,
    loadBoard,
    addItem,
    voteItem,
    updateItem,
    deleteItem
  };
};
