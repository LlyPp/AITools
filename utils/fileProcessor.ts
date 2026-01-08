import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { FileData } from '../types';

/**
 * 将 Excel 列字母转换为从 0 开始的索引 (例如: A->0, R->17)
 */
const colToIndex = (col: string): number => {
  let column = col.toUpperCase();
  let sum = 0;
  for (let i = 0; i < column.length; i++) {
    sum *= 26;
    sum += (column.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
  }
  return sum - 1;
};

// 硬编码源文件列索引
const SRC_R = colToIndex('R'); // 17
const SRC_H = colToIndex('H'); // 7
const SRC_V = colToIndex('V'); // 21
const SRC_AF = colToIndex('AF'); // 31

/**
 * 解析上传的文件，区分模版和源数据
 */
export const processFile = async (file: File, isTemplate: boolean = false): Promise<FileData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer) { reject(new Error("无法读取文件内容")); return; }
        const workbook = XLSX.read(buffer, { type: 'array' });
        let headers: string[] = [];
        let rows: any[] = [];
        const sheetsInfo: FileData['sheets'] = {};

        if (isTemplate) {
          workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const jsonHeaderData = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: '' });
            
            // 设定模版表头行数，用于确定数据起始位置
            let headerRowCount = 1;
            const sName = sheetName.toLowerCase();
            if (sName.includes('sheet1') || sName.includes('sheet2') || workbook.SheetNames.indexOf(sheetName) < 2) {
              headerRowCount = 2; // Sheet 1 & 2 数据从第3行开始
            } else {
              headerRowCount = 1; // Sheet 3 数据从第2行开始
            }
            
            sheetsInfo[sheetName] = { 
                headers: [],
                rawHeaderRows: (jsonHeaderData as any[][]).slice(0, headerRowCount), 
                headerRowCount 
            };
          });
        } else {
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          if (!jsonData || jsonData.length === 0) throw new Error("源文件为空");
          const headerRow = jsonData[0] as any[];
          headers = Array.from(headerRow || []).map(h => String(h || '').trim());
          rows = jsonData.slice(1).filter(row => row && (row as any[]).length > 0);
        }
        resolve({ name: file.name, headers, rows, rawFile: file, buffer: buffer, sheets: isTemplate ? sheetsInfo : undefined });
      } catch (err) { console.error("解析文件出错:", err); reject(err); }
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * 执行单文件映射逻辑
 */
export const processSingleFileMapping = async (templateData: FileData, sourceData: FileData): Promise<{ url: string, fileName: string }> => {
  if (!templateData.buffer) throw new Error("模版缓存丢失");
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(templateData.buffer);

  // 寻找源文件中名为“来源详情”的列
  const sourceDetailIndex = sourceData.headers.findIndex(h => h.trim() === '来源详情');

  const getVal = (rowArr: any[], idx: number) => {
    if (idx < 0 || idx >= rowArr.length) return null;
    const val = rowArr[idx];
    return (val === undefined || val === null) ? null : val;
  };

  const processSheet = (sheetIndex: number, worksheet: ExcelJS.Worksheet) => {
    // 强制规则：
    // Sheet 1 & 2 (index 0, 1) 数据起始行为第 3 行
    // Sheet 3 (index 2) 数据起始行为第 2 行
    const firstDataRowIdx = (sheetIndex < 2) ? 3 : 2;
    
    // 1. 捕捉第一行数据的样式作为基准（通常模版第一行会有正确的边框/字体）
    const capturedStyles: Record<number, any> = {};
    const templateStyleRow = worksheet.getRow(firstDataRowIdx);
    templateStyleRow.eachCell({ includeEmpty: true }, (cell, colNumber) => { 
        capturedStyles[colNumber] = JSON.parse(JSON.stringify(cell.style)); 
    });

    // 2. 写入源数据
    sourceData.rows.forEach((sourceRowValues, idx) => {
        const targetRowIdx = firstDataRowIdx + idx;
        const row = worksheet.getRow(targetRowIdx);
        
        // 【关键修复】：清空当前行 B 列之后的所有内容，防止残留模版数据
        // 从第 2 列 (B) 开始清空到该表的最大列（额外多清空10列以防万一）
        const maxCols = Math.max(worksheet.columnCount, 50);
        for (let c = 2; c <= maxCols; c++) {
            row.getCell(c).value = null;
        }

        // A列：序号 (自动生成)
        row.getCell(1).value = idx + 1;

        // B列：来源详情 (对应源文件“来源详情”列)
        if (sourceDetailIndex !== -1) {
            row.getCell(2).value = getVal(sourceRowValues, sourceDetailIndex);
        }

        // C列及以后：按工作表应用具体的列映射规则
        if (sheetIndex === 0) {
            // Sheet 1: 源 R-U (17-20) -> 目标 C-F (3-6)
            for (let i = 0; i < 4; i++) {
                row.getCell(3 + i).value = getVal(sourceRowValues, SRC_R + i);
            }
            // Sheet 1: 源 H-Q (7-16) -> 目标 G-P (7-16)
            for (let i = 0; i < 10; i++) {
                row.getCell(7 + i).value = getVal(sourceRowValues, SRC_H + i);
            }
        } else if (sheetIndex === 1) {
            // Sheet 2: 源 V-AE (21-30) -> 目标 C-L (3-12)
            for (let i = 0; i < 10; i++) {
                row.getCell(3 + i).value = getVal(sourceRowValues, SRC_V + i);
            }
        } else if (sheetIndex === 2) {
            // Sheet 3: 源 AF-AK (31-36) -> 目标 C-H (3-8)
            for (let i = 0; i < 6; i++) {
                row.getCell(3 + i).value = getVal(sourceRowValues, SRC_AF + i);
            }
        }

        // 重新应用捕获的样式，确保表格美观
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (capturedStyles[colNumber]) {
                cell.style = capturedStyles[colNumber];
            }
        });

        row.commit();
    });

    // 3. 清理多余的行：如果源数据比模版示例少，删除后面多余的行
    const totalNewRows = sourceData.rows.length;
    const lastWrittenRowIdx = firstDataRowIdx + totalNewRows - 1;
    if (worksheet.rowCount > lastWrittenRowIdx) {
        const rowsToDelete = worksheet.rowCount - lastWrittenRowIdx;
        if (rowsToDelete > 0) {
            worksheet.spliceRows(lastWrittenRowIdx + 1, rowsToDelete);
        }
    }
  };

  // 依次处理前三个工作表
  workbook.worksheets.forEach((worksheet, index) => {
      if (index <= 2) {
          processSheet(index, worksheet);
      }
  });

  // 生成新的文件流并创建下载链接
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  
  return {
    url,
    fileName: `转换结果_${sourceData.name.replace(/\.[^/.]+$/, "")}.xlsx`
  };
};