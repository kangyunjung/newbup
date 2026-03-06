
import React from 'react';
import { Card } from './Card';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: React.ReactNode;
  type?: 'alert' | 'confirm' | 'danger';
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'alert',
  onConfirm,
  confirmText = '확인',
  cancelText = '취소'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-white/80 backdrop-blur-sm animate-fade-in">
      <Card className={`w-full max-w-md p-0 overflow-hidden shadow-[8px_8px_0px_0px_#000] border-[3px] border-black ${type === 'danger' ? 'bg-[#fff1f2]' : 'bg-white'}`}>
        <div className="p-6 md:p-8 border-b-[3px] border-black">
          {title && (
            <h3 className={`text-2xl font-black mb-4 uppercase ${type === 'danger' ? 'text-red-600' : 'text-black'}`}>
              {title}
            </h3>
          )}
          <div className="text-black text-lg font-bold leading-relaxed whitespace-pre-wrap">
            {message}
          </div>
        </div>
        
        <div className="flex bg-gray-50 p-4 gap-3 justify-end">
          {(type === 'confirm' || type === 'danger') && (
            <Button 
              variant="outline" 
              onClick={onClose}
              className="px-6 py-2 text-sm h-auto"
            >
              {cancelText}
            </Button>
          )}
          
          <Button 
            onClick={() => {
              if (onConfirm) onConfirm();
              else onClose();
            }}
            variant={type === 'danger' ? 'danger' : 'primary'}
            className="px-8 py-2 text-sm h-auto"
          >
            {confirmText}
          </Button>
        </div>
      </Card>
    </div>
  );
};
