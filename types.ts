export interface FileData {
  name: string;
  headers: string[]; 
  rows: any[];
  rawFile: File;
  buffer: ArrayBuffer;
  sheets?: {
    [sheetName: string]: {
      headers: string[];
      rawHeaderRows: any[][];
      headerRowCount: number;
    }
  };
}

export interface MappingEntry {
  targetSheet: string;
  targetHeaderName: string;
  targetColumnIndex: number;
  sourceColumn: string | null;
  confidence: 'exact' | 'ai-high' | 'ai-low' | 'manual';
  reasoning?: string;
}

export interface AppState {
  step: 'upload' | 'processing' | 'finished';
  sourceFiles: FileData[];
  templateFile: FileData | null;
  isProcessing: boolean;
  processedCount: number;
}