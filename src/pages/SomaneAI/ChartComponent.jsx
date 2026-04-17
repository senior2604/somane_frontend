import React from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const ChartComponent = ({ type = 'line', data = [], title = '', colors = ['#8b5cf6', '#ec4899', '#14b8a6'] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-100 rounded-lg p-4 text-center text-gray-500">
        Aucune donnée disponible
      </div>
    );
  }

  const chartProps = {
    width: '100%',
    height: 300,
    data: data,
  };

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer {...chartProps}>
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {Object.keys(data[0])
                .filter(key => key !== 'name')
                .map((key, idx) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={colors[idx % colors.length]}
                    strokeWidth={2}
                    dot={{ r: 5 }}
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        );
      case 'bar':
        return (
          <ResponsiveContainer {...chartProps}>
            <BarChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {Object.keys(data[0])
                .filter(key => key !== 'name')
                .map((key, idx) => (
                  <Bar key={key} dataKey={key} fill={colors[idx % colors.length]} />
                ))}
            </BarChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8b5cf6"
                dataKey={Object.keys(data[0]).find(k => k !== 'name')}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer {...chartProps}>
            <AreaChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {Object.keys(data[0])
                .filter(key => key !== 'name')
                .map((key, idx) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    fill={colors[idx % colors.length]}
                    stroke={colors[idx % colors.length]}
                    fillOpacity={0.6}
                  />
                ))}
            </AreaChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-md">
      {title && <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>}
      {renderChart()}
    </div>
  );
};

export default ChartComponent;
