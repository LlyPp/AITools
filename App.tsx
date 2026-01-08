import React, { useState } from 'react';
import { FileData, AppState } from './types';
import { processFile, processSingleFileMapping } from './utils/fileProcessor';
import DropZone from './components/DropZone';
import { FileDown, Loader2, RotateCcw, FileSpreadsheet, Play, CheckCircle2 } from 'lucide-react';

const App = () => {
  const [state, setState] = useState<AppState>({ 
    step: 'upload', 
    sourceFiles: [], 
    templateFile: null, 
    isProcessing: false,
    processedCount: 0
  });

  const handleSourceUpload = async (fileOrFiles: File | FileList) => { 
    try { 
      setState(prev => ({ ...prev, isProcessing: true })); 
      
      const files: File[] = fileOrFiles instanceof FileList 
        ? Array.from(fileOrFiles) 
        : [fileOrFiles as File];

      const processedFiles: FileData[] = [];
      for (const f of files) {
        // Simple deduplication by name
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
      alert("部分文件读取失败，请确保格式正确"); 
      setState(prev => ({ ...prev, isProcessing: false })); 
    } 
  };

  const handleTemplateUpload = async (file: File) => { 
    try { 
      setState(prev => ({ ...prev, isProcessing: true })); 
      const parsed = await processFile(file, true); 
      setState(prev => ({ ...prev, templateFile: parsed, isProcessing: false })); 
    } catch (err) { 
      console.error(err);
      alert("无法读取模版文件"); 
      setState(prev => ({ ...prev, isProcessing: false })); 
    } 
  };

  const handleBatchProcess = async () => {
    if (!state.templateFile || state.sourceFiles.length === 0) return;
    
    setState(prev => ({ ...prev, step: 'processing', isProcessing: true, processedCount: 0 }));

    try {
        let count = 0;
        for (const sourceFile of state.sourceFiles) {
            const result = await processSingleFileMapping(state.templateFile, sourceFile);
            
            // Trigger download immediately
            const anchor = document.createElement('a');
            anchor.href = result.url;
            anchor.download = result.fileName;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            window.URL.revokeObjectURL(result.url);

            // Small delay to prevent browser blocking multiple downloads
            await new Promise(r => setTimeout(r, 500));
            
            count++;
            setState(prev => ({ ...prev, processedCount: count }));
        }
        setState(prev => ({ ...prev, step: 'finished', isProcessing: false }));
    } catch (e) {
        console.error(e);
        alert("批处理过程中发生错误");
        setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const removeSourceFile = (index: number) => {
    const newFiles = [...state.sourceFiles];
    newFiles.splice(index, 1);
    setState(prev => ({ ...prev, sourceFiles: newFiles }));
  };

  const reset = () => { 
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
            <h1 className="font-bold text-lg text-slate-800 tracking-tight">智能模版转换器 (固定规则版)</h1>
          </div>
          <button 
            onClick={reset} 
            className="text-sm text-slate-500 hover:text-brand-600 flex items-center gap-1 transition-colors"
          >
            <RotateCcw size={14} /> 重置/新任务
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Simple Progress Indicator */}
        <div className="flex items-center justify-center mb-10">
            <div className={`flex items-center gap-2 ${state.step === 'upload' ? 'text-brand-600 font-bold' : 'text-slate-400'}`}>
                1. 上传数据
            </div>
            <div className="w-12 h-0.5 bg-slate-200 mx-4"></div>
            <div className={`flex items-center gap-2 ${state.step === 'processing' ? 'text-brand-600 font-bold' : 'text-slate-400'}`}>
                2. 批量生成
            </div>
             <div className="w-12 h-0.5 bg-slate-200 mx-4"></div>
            <div className={`flex items-center gap-2 ${state.step === 'finished' ? 'text-green-600 font-bold' : 'text-slate-400'}`}>
                3. 完成
            </div>
        </div>

        {state.step === 'upload' && (
            <div className="animate-fade-in space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Template Upload */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                         <span className="bg-slate-200 text-slate-600 w-5 h-5 rounded-full inline-flex items-center justify-center text-xs">1</span>
                         目标模版 (必须包含3个Sheet)
                      </h3>
                      <DropZone 
                        label="上传模版文件" 
                        subLabel="支持 .xlsx" 
                        file={state.templateFile?.rawFile || null} 
                        onFileSelect={handleTemplateUpload}
                        accept=".xlsx,.xls"
                      />
                    </div>

                    {/* Source Upload (Batch) */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                        <span className="bg-slate-200 text-slate-600 w-5 h-5 rounded-full inline-flex items-center justify-center text-xs">2</span> 
                        源数据文件 (支持多选)
                      </h3>
                      <DropZone 
                        label="点击上传多个源文件" 
                        subLabel="支持批量 .xlsx, .csv" 
                        file={null}
                        fileCount={state.sourceFiles.length}
                        onFileSelect={handleSourceUpload} 
                        accept=".xlsx,.xls,.csv"
                        multiple={true}
                      />
                      
                      {/* File List */}
                      {state.sourceFiles.length > 0 && (
                          <div className="bg-white rounded-lg border border-slate-200 max-h-60 overflow-y-auto">
                              {state.sourceFiles.map((f, i) => (
                                  <div key={i} className="flex justify-between items-center px-4 py-2 border-b last:border-0 hover:bg-slate-50 text-sm">
                                      <span className="truncate max-w-[80%]">{f.name}</span>
                                      <button onClick={() => removeSourceFile(i)} className="text-red-400 hover:text-red-600">×</button>
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
                    className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-lg font-medium shadow-lg shadow-brand-500/30 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center gap-2 transition-all transform active:scale-95 text-lg"
                  >
                    {state.isProcessing ? (
                      <><Loader2 className="animate-spin" /> 读取中...</>
                    ) : (
                      <><Play size={18} /> 开始批量生成 ({state.sourceFiles.length} 个文件)</>
                    )}
                  </button>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 border border-blue-100">
                    <strong>规则说明：</strong>
                    <ul className="list-disc pl-5 mt-1 space-y-1 text-blue-700">
                        <li>"来源详情" 写入所有Sheet的第2列 (参训学员)</li>
                        <li>Sheet1: 源 R-U 写入 C-F; 源 H-Q 写入 G-P</li>
                        <li>Sheet2: 源 V-AE 写入 C-L</li>
                        <li>Sheet3: 源 AF-AK 写入 C-H</li>
                        <li>序号从1自动重排</li>
                    </ul>
                </div>
            </div>
        )}

        {state.step === 'processing' && (
            <div className="text-center py-20 animate-fade-in">
                <Loader2 className="animate-spin w-16 h-16 text-brand-500 mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-slate-800 mb-2">正在处理...</h2>
                <p className="text-slate-500">
                    已完成 {state.processedCount} / {state.sourceFiles.length} 个文件
                </p>
                <div className="w-64 h-2 bg-slate-200 rounded-full mx-auto mt-6 overflow-hidden">
                    <div 
                        className="h-full bg-brand-500 transition-all duration-300"
                        style={{ width: `${(state.processedCount / state.sourceFiles.length) * 100}%` }}
                    ></div>
                </div>
                <p className="text-sm text-slate-400 mt-4">请允许浏览器下载多个文件</p>
            </div>
        )}

        {state.step === 'finished' && (
            <div className="text-center py-20 animate-fade-in">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={40} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-4">全部完成!</h2>
                <p className="text-slate-600 mb-8">
                    成功处理并下载了 {state.processedCount} 个文件。
                </p>
                <button 
                    onClick={reset}
                    className="bg-slate-800 hover:bg-slate-900 text-white px-8 py-3 rounded-lg font-medium shadow-lg flex items-center gap-2 mx-auto"
                >
                    <RotateCcw size={18} /> 处理新任务
                </button>
            </div>
        )}
      </main>
    </div>
  );
};
export default App;
