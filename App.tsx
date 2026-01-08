import React, { useState } from 'react';
import { FileData, AppState } from './types';
import { processFile, processSingleFileMapping } from './utils/fileProcessor';
import DropZone from './components/DropZone';
import { FileDown, Loader2, RotateCcw, FileSpreadsheet, Play, CheckCircle2, AlertTriangle } from 'lucide-react';

const App = () => {
  const [state, setState] = useState<AppState>({ 
    step: 'upload', 
    sourceFiles: [], 
    templateFile: null, 
    isProcessing: false,
    processedCount: 0
  });
  const [error, setError] = useState<string | null>(null);

  const handleSourceUpload = async (fileOrFiles: File | FileList) => { 
    try { 
      setError(null);
      setState(prev => ({ ...prev, isProcessing: true })); 
      
      const files: File[] = fileOrFiles instanceof FileList 
        ? Array.from(fileOrFiles) 
        : [fileOrFiles as File];

      const processedFiles: FileData[] = [];
      for (const f of files) {
        if (!state.sourceFiles.some(existing => existing.name === f.name)) {
             const parsed = await processFile(f, false);
             processedFiles.push(parsed);
        }
      }

      setState(prev => ({ 
        ...prev, 
        sourceFiles: [...prev.sourceFiles, ...processedFiles], 
        isProcessing: false 
      })); 
    } catch (err) { 
      console.error(err);
      setError("源文件读取失败，请检查文件格式是否损坏。");
      setState(prev => ({ ...prev, isProcessing: false })); 
    } 
  };

  const handleTemplateUpload = async (file: File) => { 
    try { 
      setError(null);
      setState(prev => ({ ...prev, isProcessing: true })); 
      const parsed = await processFile(file, true); 
      setState(prev => ({ ...prev, templateFile: parsed, isProcessing: false })); 
    } catch (err) { 
      console.error(err);
      setError("模版文件解析失败，请确保是标准的 .xlsx 文件。");
      setState(prev => ({ ...prev, isProcessing: false })); 
    } 
  };

  const handleBatchProcess = async () => {
    if (!state.templateFile || state.sourceFiles.length === 0) return;
    
    setError(null);
    setState(prev => ({ ...prev, step: 'processing', isProcessing: true, processedCount: 0 }));

    try {
        let count = 0;
        for (const sourceFile of state.sourceFiles) {
            const result = await processSingleFileMapping(state.templateFile, sourceFile);
            
            const anchor = document.createElement('a');
            anchor.href = result.url;
            anchor.download = result.fileName;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            window.URL.revokeObjectURL(result.url);

            await new Promise(r => setTimeout(r, 600));
            
            count++;
            setState(prev => ({ ...prev, processedCount: count }));
        }
        setState(prev => ({ ...prev, step: 'finished', isProcessing: false }));
    } catch (e) {
        console.error(e);
        setError("批处理生成过程中发生内部错误，请检查模版结构是否符合要求。");
        setState(prev => ({ ...prev, isProcessing: false, step: 'upload' }));
    }
  };

  const removeSourceFile = (index: number) => {
    const newFiles = [...state.sourceFiles];
    newFiles.splice(index, 1);
    setState(prev => ({ ...prev, sourceFiles: newFiles }));
  };

  const reset = () => { 
    setError(null);
    setState({ 
      step: 'upload', 
      sourceFiles: [], 
      templateFile: null, 
      isProcessing: false,
      processedCount: 0
    }); 
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-brand-600 text-white p-1.5 rounded-lg">
              <FileSpreadsheet size={20} />
            </div>
            <h1 className="font-bold text-lg text-slate-800 tracking-tight">智能模版转换器</h1>
          </div>
          <button 
            onClick={reset} 
            className="text-sm text-slate-500 hover:text-brand-600 flex items-center gap-1 transition-colors"
          >
            <RotateCcw size={14} /> 重置
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700 animate-fade-in">
                <AlertTriangle className="flex-shrink-0 mt-0.5" size={18} />
                <div className="text-sm">{error}</div>
            </div>
        )}

        <div className="flex items-center justify-center mb-10">
            <div className={`flex items-center gap-2 ${state.step === 'upload' ? 'text-brand-600 font-bold' : 'text-slate-400'}`}>
                1. 上传
            </div>
            <div className="w-12 h-0.5 bg-slate-200 mx-4"></div>
            <div className={`flex items-center gap-2 ${state.step === 'processing' ? 'text-brand-600 font-bold' : 'text-slate-400'}`}>
                2. 处理
            </div>
             <div className="w-12 h-0.5 bg-slate-200 mx-4"></div>
            <div className={`flex items-center gap-2 ${state.step === 'finished' ? 'text-green-600 font-bold' : 'text-slate-400'}`}>
                3. 完成
            </div>
        </div>

        {state.step === 'upload' && (
            <div className="animate-fade-in space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                         <span className="bg-slate-200 text-slate-600 w-5 h-5 rounded-full inline-flex items-center justify-center text-xs font-bold">1</span>
                         目标模版 (.xlsx)
                      </h3>
                      <DropZone 
                        label="上传模版" 
                        subLabel="需包含3个工作表" 
                        file={state.templateFile?.rawFile || null} 
                        onFileSelect={handleTemplateUpload}
                        accept=".xlsx"
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                        <span className="bg-slate-200 text-slate-600 w-5 h-5 rounded-full inline-flex items-center justify-center text-xs font-bold">2</span> 
                        源数据 (支持多选)
                      </h3>
                      <DropZone 
                        label="上传源文件" 
                        subLabel="支持批量选择" 
                        file={null}
                        fileCount={state.sourceFiles.length}
                        onFileSelect={handleSourceUpload} 
                        accept=".xlsx,.csv"
                        multiple={true}
                      />
                      
                      {state.sourceFiles.length > 0 && (
                          <div className="bg-white rounded-lg border border-slate-200 max-h-40 overflow-y-auto">
                              {state.sourceFiles.map((f, i) => (
                                  <div key={i} className="flex justify-between items-center px-4 py-2 border-b last:border-0 hover:bg-slate-50 text-sm">
                                      <span className="truncate max-w-[80%] text-slate-600">{f.name}</span>
                                      <button onClick={() => removeSourceFile(i)} className="text-red-400 hover:text-red-600 p-1">×</button>
                                  </div>
                              ))}
                          </div>
                      )}
                    </div>
                </div>

                <div className="flex justify-center pt-8">
                  <button 
                    onClick={handleBatchProcess} 
                    disabled={!state.templateFile || state.sourceFiles.length === 0 || state.isProcessing} 
                    className="bg-brand-600 hover:bg-brand-700 text-white px-10 py-4 rounded-xl font-bold shadow-xl shadow-brand-500/20 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center gap-3 transition-all transform active:scale-95 text-lg"
                  >
                    {state.isProcessing ? (
                      <><Loader2 className="animate-spin" /> 解析中...</>
                    ) : (
                      <><Play size={20} fill="currentColor" /> 开始转换 ({state.sourceFiles.length})</>
                    )}
                  </button>
                </div>
            </div>
        )}

        {state.step === 'processing' && (
            <div className="text-center py-20 animate-fade-in bg-white rounded-2xl shadow-sm border border-slate-100">
                <Loader2 className="animate-spin w-16 h-16 text-brand-500 mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-slate-800 mb-2">正在转换数据结构...</h2>
                <p className="text-slate-500">
                    进度：{state.processedCount} / {state.sourceFiles.length}
                </p>
                <div className="w-64 h-2 bg-slate-100 rounded-full mx-auto mt-8 overflow-hidden">
                    <div 
                        className="h-full bg-brand-500 transition-all duration-500 ease-out"
                        style={{ width: `${(state.processedCount / state.sourceFiles.length) * 100}%` }}
                    ></div>
                </div>
                <p className="text-xs text-slate-400 mt-6 italic">提示：请允许浏览器连续下载多个文件</p>
            </div>
        )}

        {state.step === 'finished' && (
            <div className="text-center py-20 animate-fade-in bg-white rounded-2xl shadow-sm border border-slate-100">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={40} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-4">转换任务已完成!</h2>
                <p className="text-slate-600 mb-8 max-w-md mx-auto">
                    已成功处理 {state.processedCount} 个源文件。结果已自动触发浏览器下载。
                </p>
                <button 
                    onClick={reset}
                    className="bg-slate-800 hover:bg-slate-900 text-white px-8 py-3 rounded-lg font-medium shadow-lg flex items-center gap-2 mx-auto transition-transform active:scale-95"
                >
                    <RotateCcw size={18} /> 开始新任务
                </button>
            </div>
        )}
      </main>
    </div>
  );
};
export default App;