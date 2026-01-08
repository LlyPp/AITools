import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { FileData } from '../types';

// Helper to convert Column Letter to 0-based index (e.g., A->0, R->17)
const colToIndex = (col: string): number => {
  let column = col.toUpperCase();
  let sum = 0;
  for (let i = 0; i < column.length; i++) {
    sum *= 26;
    sum += (column.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
  }
  return sum - 1;
};

// Hardcoded Indices based on requirements
// Source R-U (17-20) -> Target C-F (2-5)
const SRC_R = colToIndex('R'); // 17
const SRC_U = colToIndex('U'); // 20
const TGT_C = colToIndex('C'); // 2

// Source H-Q (7-16) -> Target G-P (6-15)
const SRC_H = colToIndex('H'); // 7
const SRC_Q = colToIndex('Q'); // 16
const TGT_G = colToIndex('G'); // 6

// Source V-AE (21-30) -> Target C-L (2-11)
const SRC_V = colToIndex('V'); // 21
const SRC_AE = colToIndex('AE'); // 30

// Source AF-AK (31-36) -> Target C-H (2-7)
const SRC_AF = colToIndex('AF'); // 31
const SRC_AK = colToIndex('AK'); // 36

export const processFile = async (file: File, isTemplate: boolean = false): Promise<FileData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer) { reject(new Error("Failed to read file buffer")); return; }
        const workbook = XLSX.read(buffer, { type: 'array' });
        let headers: string[] = [];
        let rows: any[] = [];
        const sheetsInfo: FileData['sheets'] = {};

        if (isTemplate) {
          workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const jsonHeaderData = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: '' });
            // Detect header rows for template style preservation
            let headerRowCount = 1;
            const firstRows = jsonHeaderData.slice(0, 5) as any[][];
            if (firstRows[1] && firstRows[1].some(c => c)) headerRowCount = 2;
            if (firstRows[2] && firstRows[2].some(c => c)) headerRowCount = 3;
            
            sheetsInfo[sheetName] = { 
                headers: [], // Not strictly needed for fixed logic
                rawHeaderRows: firstRows.slice(0, headerRowCount), 
                headerRowCount 
            };
          });
        } else {
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          if (!jsonData || jsonData.length === 0) throw new Error("File is empty");
          const headerRow = jsonData[0] as any[];
          headers = Array.from(headerRow || []).map(h => String(h || '').trim());
          rows = jsonData.slice(1).filter(row => row && (row as any[]).length > 0);
        }
        resolve({ name: file.name, headers, rows, rawFile: file, buffer: buffer, sheets: isTemplate ? sheetsInfo : undefined });
      } catch (err) { console.error("Error processing file:", err); reject(err); }
    };
    reader.onerror = () => reject(new Error("File reading failed"));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Applies the hardcoded rules to a single source file and generates a downloadable blob URL.
 */
export const processSingleFileMapping = async (templateData: FileData, sourceData: FileData): Promise<{ url: string, fileName: string }> => {
  if (!templateData.buffer) throw new Error("Template buffer is missing");
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(templateData.buffer);

  // 1. Find "来源详情" column index in source
  // Normalize checking (remove extra spaces)
  const sourceDetailIndex = sourceData.headers.findIndex(h => h.trim() === '来源详情');

  // Helper to safely get source value
  const getVal = (rowArr: any[], idx: number) => {
    if (idx < 0 || idx >= rowArr.length) return null;
    return rowArr[idx];
  };

  // We need to process specific sheets by index (0, 1, 2)
  // Logic: 
  // Sheet 0: Rules 1, 2, 5
  // Sheet 1: Rules 1, 3, 5
  // Sheet 2: Rules 1, 4, 5
  
  const sheetNames = templateData.sheets ? Object.keys(templateData.sheets) : [];
  // Ensure we have at least 3 sheets to process if the rules require it, 
  // but we'll loop through available ones and apply rules if index matches.
  
  // Define rules per sheet index
  const processSheet = (sheetIndex: number, worksheet: ExcelJS.Worksheet) => {
    const headerRowCount = templateData.sheets?.[worksheet.name]?.headerRowCount || 1;
    const firstDataRowIdx = headerRowCount + 1;
    
    // Capture styles from the first data row (template row)
    const capturedStyles: Record<number, any> = {};
    if (worksheet.rowCount >= firstDataRowIdx) {
        const exampleRow = worksheet.getRow(firstDataRowIdx);
        exampleRow.eachCell({ includeEmpty: true }, (cell, colNumber) => { 
            capturedStyles[colNumber] = JSON.parse(JSON.stringify(cell.style)); 
        });
    }

    // Process rows
    sourceData.rows.forEach((sourceRowValues, idx) => {
        const targetRowIdx = firstDataRowIdx + idx;
        const row = worksheet.getRow(targetRowIdx);
        
        // --- Rule 5: Sequence (A列 / Col 1) ---
        row.getCell(1).value = idx + 1;

        // --- Rule 1: 来源详情 (B列 / Col 2) ---
        if (sourceDetailIndex !== -1) {
            row.getCell(2).value = getVal(sourceRowValues, sourceDetailIndex);
        }

        // --- Specific Sheet Rules ---
        if (sheetIndex === 0) {
            // Rule 2 part A: Source R-U (17-20) -> Target C-F (2-5) -> ExcelJS 3-6
            // ExcelJS uses 1-based indexing. 
            // Target C is index 3. Source R is index 17.
            // Loop 4 columns
            for (let i = 0; i < 4; i++) {
                row.getCell(3 + i).value = getVal(sourceRowValues, SRC_R + i);
            }
            // Rule 2 part B: Source H-Q (7-16) -> Target G-P (6-15) -> ExcelJS 7-16
            // Target G is index 7. Source H is index 7.
            // Loop 10 columns
            for (let i = 0; i < 10; i++) {
                row.getCell(7 + i).value = getVal(sourceRowValues, SRC_H + i);
            }
        } else if (sheetIndex === 1) {
            // Rule 3: Source V-AE (21-30) -> Target C-L (2-11) -> ExcelJS 3-12
            // Target C is index 3.
            // Loop 10 columns
            for (let i = 0; i < 10; i++) {
                row.getCell(3 + i).value = getVal(sourceRowValues, SRC_V + i);
            }
        } else if (sheetIndex === 2) {
            // Rule 4: Source AF-AK (31-36) -> Target C-H (2-7) -> ExcelJS 3-8
            // Target C is index 3.
            // Loop 6 columns
            for (let i = 0; i < 6; i++) {
                row.getCell(3 + i).value = getVal(sourceRowValues, SRC_AF + i);
            }
        }

        // Apply Styles
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (capturedStyles[colNumber]) {
                cell.style = capturedStyles[colNumber];
            }
        });

        row.commit();
    });

    // Clean up extra rows from template
    const nextRowIdx = firstDataRowIdx + sourceData.rows.length;
    if (worksheet.rowCount >= nextRowIdx) { 
        worksheet.spliceRows(nextRowIdx, worksheet.rowCount - nextRowIdx + 1); 
    }
  };

  // Iterate through sheets in the workbook (by index as requested)
  // Worksheets in ExcelJS are 1-based or accessed by array. 
  // workbook.worksheets returns array.
  workbook.worksheets.forEach((worksheet, index) => {
      // Only process the first 3 sheets if they exist
      if (index <= 2) {
          processSheet(index, worksheet);
      }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  
  return {
    url,
    fileName: `processed_${sourceData.name.replace(/\.[^/.]+$/, "")}_${templateData.name}`
  };
};
