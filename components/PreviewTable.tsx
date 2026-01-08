import React, { useMemo } from 'react';
import { FileData, MappingEntry } from '../types';

interface PreviewTableProps {
  mappings: MappingEntry[];
  sourceData: FileData;
}

const PreviewTable: React.FC<PreviewTableProps> = ({ mappings, sourceData }) => {
  // Generate preview data for the first sheet found in mappings
  const previewData = useMemo(() => {
    if (mappings.length === 0) return { headers: [], rows: [] };

    // Group by sheet first
    const sheetNames = Array.from(new Set(mappings.map(m => m.targetSheet)));
    const firstSheet = sheetNames[0];
    const sheetMappings = mappings.filter(m => m.targetSheet === firstSheet).sort((a, b) => a.targetColumnIndex - b.targetColumnIndex);

    // Build headers
    const headers = sheetMappings.map(m => m.targetHeaderName);

    // Build rows (limit to 5)
    const sourceRowsSlice = sourceData.rows.slice(0, 5);
    const rows = sourceRowsSlice.map((rowValues, rowIndex) => {
      return sheetMappings.map(m => {
        // Handle Auto Sequence
        const isSequence = /(^| - )(序号|No\.?|序列号|顺序)$/i.test(m.targetHeaderName.trim());
        if (isSequence) return rowIndex + 1;

        if (!m.sourceColumn) return '';
        const sourceIdx = sourceData.headers.indexOf(m.sourceColumn);
        if (sourceIdx === -1) return '';
        return rowValues[sourceIdx];
      });
    });

    return { sheetName: firstSheet, headers, rows };
  }, [mappings, sourceData]);

  if (!previewData.sheetName) return <div className="text-center text-slate-500">无预览数据</div>;

  return (
    <div className="overflow-x-auto border rounded-lg">
      <div className="bg-slate-100 px-4 py-2 border-b text-xs font-semibold text-slate-500 uppercase tracking-wider">
        预览: {previewData.sheetName}
      </div>
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {previewData.headers.map((h, i) => (
              <th key={i} scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {previewData.rows.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {cell !== undefined && cell !== null ? String(cell) : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PreviewTable;