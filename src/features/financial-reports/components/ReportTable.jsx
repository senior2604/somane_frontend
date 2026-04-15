// src/features/financial-reports/components/ReportTable.jsx
export default function ReportTable({ lines = [], columns = [] }) {
  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra w-full">
        <thead>
          <tr>
            <th>Désignation</th>
            {columns.map(col => (
              <th key={col.id} className="text-right">{col.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map(line => (
            <tr key={line.id} className={line.line_type === 'header' ? 'bg-gray-200 font-bold' : ''}>
              <td style={{ paddingLeft: `${(line.parent ? 2 : 0) * 20}px` }}>
                {line.name} <span className="text-gray-500 text-sm">({line.code})</span>
              </td>
              {columns.map(col => (
                <td key={col.id} className="text-right">0</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}