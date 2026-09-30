import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ModulePage from '../../../components/ModulePage';
import { apiGet } from '../../../core/services/api';

const IngresosConsolidados = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const result = await apiGet('/api/finanzas/ingresos-consolidados');
        if (!cancelled && result.success) {
          setData(result.data);
        }
      } catch (err) {
        if (!cancelled) setError('Error al cargar ingresos consolidados.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

  const metrics = useMemo(() => {
    const monthNames = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    
    const matrix = Array.from({ length: 31 }, (_, i) => ({
      day: i + 1,
      months: Array(12).fill(0)
    }));

    let totUsd = 0, totBs = 0, recBs = 0, recCop = 0, recUsd = 0;

    data.forEach(row => {
      const usd = Number(row.monto_dolares) || 0;
      const base = Number(row.monto_base) || 0;
      const sec = Number(row.monto_secundario) || 0;
      const monedaBase = (row.moneda_base || '').toUpperCase();
      const monedaSec = (row.moneda_secundaria || '').toUpperCase();
      
      totUsd += usd;
      totBs += base; 

      if (monedaBase === 'BS' || monedaSec === 'BS') recBs += base;
      if (monedaBase === 'COP' || monedaSec === 'COP') recCop += (monedaBase === 'COP' ? base : sec);
      if (monedaBase === 'USD' || monedaSec === 'USD') recUsd += (monedaBase === 'USD' ? base : sec);

      if (row.fecha) {
        const dateParts = row.fecha.split('T')[0].split('-');
        if (dateParts.length === 3) {
          const mIndex = parseInt(dateParts[1], 10) - 1;
          const dIndex = parseInt(dateParts[2], 10) - 1;
          
          if (matrix[dIndex] && mIndex >= 0 && mIndex < 12) {
            matrix[dIndex].months[mIndex] += usd;
          }
        }
      }
    });

    const barData = matrix.map(row => ({
      day: row.day,
      usdMay: row.months[4],
      usdJun: row.months[5],
      usdJul: row.months[6],
      usdAgo: row.months[7]
    }));

    const monthTotals = Array(12).fill(0);
    matrix.forEach(row => row.months.forEach((val, idx) => monthTotals[idx] += val));

    return { matrix, barData, monthTotals, monthNames, totUsd, totBs, recBs, recCop, recUsd };
  }, [data]);

  const donutData = [
    { name: 'BsD', value: metrics.recBs, color: '#1f77b4' },
    { name: 'COP', value: metrics.recCop, color: '#ff7f0e' },
    { name: 'USD', value: metrics.recUsd, color: '#2ca02c' }
  ];

  const formatCurrency = (val) => new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  return (
    <ModulePage
      title="Finanzas · Ingresos Consolidados"
      description="Dashboard de ingresos anuales consolidados por día y mes."
    >
      {loading ? (
        <div className="portal-feedback portal-feedback--loading">Cargando ingresos consolidados...</div>
      ) : error ? (
        <div className="portal-feedback portal-feedback--error">{error}</div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="kpi-grid">
            <article className="kpi-card kpi-card--compact">
              <span className="kpi-card__title">TOTAL DÓLARES</span>
              <strong className="kpi-card__value">{formatCurrency(metrics.totUsd)}</strong>
            </article>
            <article className="kpi-card kpi-card--compact">
              <span className="kpi-card__title">TOTAL BOLÍVARES</span>
              <strong className="kpi-card__value">{formatCurrency(metrics.totBs)}</strong>
            </article>
            <article className="kpi-card kpi-card--compact">
              <span className="kpi-card__title">RECIBIDO EN BS.</span>
              <strong className="kpi-card__value">{formatCurrency(metrics.recBs)}</strong>
            </article>
            <article className="kpi-card kpi-card--compact kpi-card--warning">
              <span className="kpi-card__title">RECIBIDO EN COP</span>
              <strong className="kpi-card__value">{formatCurrency(metrics.recCop)}</strong>
            </article>
            <article className="kpi-card kpi-card--compact kpi-card--success">
              <span className="kpi-card__title">RECIBIDO EN USD</span>
              <strong className="kpi-card__value">{formatCurrency(metrics.recUsd)}</strong>
            </article>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="portal-card lg:col-span-1">
              <header className="portal-card__header">
                <h3 className="portal-card__title">Ingreso por Moneda</h3>
              </header>
              <div className="portal-card__body h-64" style={{position:'relative', minHeight:'300px'}}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="portal-card lg:col-span-3">
               <div className="portal-table-responsive" style={{ maxHeight: '400px' }}>
                 <table className="portal-table">
                   <thead>
                     <tr>
                       <th>Día</th>
                       {metrics.monthNames.map(m => <th key={m} className="is-numeric">USD {m}</th>)}
                     </tr>
                   </thead>
                   <tbody>
                     {metrics.matrix.map((row) => (
                       <tr key={row.day}>
                         <td><strong>{row.day}</strong></td>
                         {row.months.map((val, idx) => (
                           <td key={idx} className="is-numeric">{val > 0 ? formatCurrency(val) : '0,00'}</td>
                         ))}
                       </tr>
                     ))}
                     <tr>
                       <td><strong>Total</strong></td>
                       {metrics.monthTotals.map((val, idx) => (
                         <td key={`tot-${idx}`} className="is-numeric"><strong>{formatCurrency(val)}</strong></td>
                       ))}
                     </tr>
                   </tbody>
                 </table>
               </div>
            </div>
          </div>

          <div className="portal-card">
            <header className="portal-card__header">
                <h3 className="portal-card__title">Ingresos Diarios May - Jun - Jul - Ago</h3>
            </header>
            <div className="portal-card__body" style={{position:'relative', minHeight:'350px'}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.barData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `${val / 1000}k`} />
                  <Tooltip cursor={{ fill: '#f8fbff' }} formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="usdMay" fill="#0057b8" name="USD MAY" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="usdJun" fill="#ff6b00" name="USD JUN" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="usdJul" fill="#64748b" name="USD JUL" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="usdAgo" fill="#8b5cf6" name="USD AGO" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </ModulePage>
  );
};

export default IngresosConsolidados;
