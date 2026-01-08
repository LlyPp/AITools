import React, { useRef } from 'react';
import { Upload, CheckCircle, Files } from 'lucide-react';

interface DropZoneProps {
  label: string;
  subLabel: string;
  file?: File | null;
  fileCount?: number;
  onFileSelect: (file: File | FileList) => void;
  accept?: string;
  multiple?: boolean;
}

const DropZone: React.FC<DropZoneProps> = ({ label, subLabel, file, fileCount, onFileSelect, accept = ".xlsx,.xls,.csv", multiple = false }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (multiple) {
          onFileSelect(e.target.files);
      } else {
          onFileSelect(e.target.files[0]);
      }
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const isSelected = file || (fileCount && fileCount > 0);

  return (
    <div 
      onClick={handleClick}
      className={`
        relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
        ${isSelected
          ? 'border-brand-500 bg-brand-50' 
          : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'
        }
      `}
    >
      <input 
        type="file" 
        ref={inputRef} 
        onChange={handleChange} 
        accept={accept} 
        className="hidden" 
        multiple={multiple}
      />
      
      <div className="flex flex-col items-center gap-3">
        {isSelected ? (
          <>
            <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-600">
              {multiple ? <Files size={28} /> : <CheckCircle size={28} />}
            </div>
            <div>
              {multiple ? (
                  <p className="font-semibold text-brand-900 px-4">已选择 {fileCount} 个文件</p>
              ) : (
                  <>
                    <p className="font-semibold text-brand-900 line-clamp-1 break-all px-4">{file?.name}</p>
                    <p className="text-sm text-brand-600 mt-1">{(file!.size / 1024).toFixed(1)} KB</p>
                  </>
              )}
            </div>
            <p className="text-xs text-brand-400 absolute bottom-2">{multiple ? '点击添加更多' : '点击更换'}</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50 transition-colors">
              <Upload size={24} />
            </div>
            <div>
              <p className="font-medium text-slate-700">{label}</p>
              <p className="text-sm text-slate-400 mt-1">{subLabel}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DropZone;
