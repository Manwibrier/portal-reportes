import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const IngresosConsolidados = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/finanzas/ingresos-consolidados');
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching data', error);
    } finally {
      setLoading(false);
    }
  };

  const totalDolares = data.reduce((acc, curr) => acc + Number(curr.monto_dolares || 0), 0);
  const totalBolivares = data.reduce((acc, curr) => acc + Number(curr.monto_base || 0), 0);

  const donutData = [
    { name: 'BsD', value: totalBolivares, color: '#1f77b4' },
    { name: 'USD', value: totalDolares, color: '#2ca02c' }
  ];

  const barChartData = []; 

  if (loading) return <div className="p-4 text-gray-500">Cargando ingresos...</div>;

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-50 min-h-screen">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 shadow rounded flex flex-col items-center">
          <span className="text-sm font-bold text-gray-500">TOTAL DÓLARES</span>
          <span className="text-xl font-bold text-gray-800">{totalDolares.toLocaleString()}</span>
        </div>
        <div className="bg-white p-4 shadow rounded flex flex-col items-center">
          <span className="text-sm font-bold text-gray-500">TOTAL BOLÍVARES</span>
          <span className="text-xl font-bold text-gray-800">{totalBolivares.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 shadow rounded lg:col-span-1">
          <h3 className="text-sm font-bold text-gray-600 mb-2">DISTRIBUCIÓN DE INGRESO POR MONEDA</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 shadow rounded lg:col-span-2 overflow-x-auto">
           <table className="min-w-full text-xs text-right text-gray-600">
             <thead className="border-b bg-gray-50">
               <tr>
                 <th className="p-2 text-center">Día</th>
                 <th className="p-2">USD ENE</th>
                 <th className="p-2">USD FEB</th>
               </tr>
             </thead>
             <tbody>
             </tbody>
           </table>
        </div>
      </div>

      <div className="bg-white p-4 shadow rounded">
        <h3 className="text-sm font-bold text-gray-600 mb-2">INGRESOS DIARIOS MAY - JUN - JUL</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="usdMay" fill="#1f77b4" name="USD MAY" />
              <Bar dataKey="usdJun" fill="#ff7f0e" name="USD JUN" />
              <Bar dataKey="usdJul" fill="#7f7f7f" name="USD JUL" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default IngresosConsolidados;
