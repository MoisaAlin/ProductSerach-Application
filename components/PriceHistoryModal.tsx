import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { ProductInfo } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PriceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductInfo | null;
  chartData: {
    labels: string[];
    datasets: any[];
  };
}

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8' /* slate-400 */, font: { size: 10 } },
        grid: { color: '#334155' /* slate-700 */ },
      },
      y: {
        ticks: {
          color: '#94a3b8', /* slate-400 */
          callback: (value: string | number) => `$${value}`,
        },
        grid: { color: '#334155' /* slate-700 */ },
      },
    },
    interaction: {
        intersect: false,
        mode: 'index' as const,
    },
};


const PriceHistoryModal: React.FC<PriceHistoryModalProps> = ({ isOpen, onClose, product, chartData }) => {
  if (!isOpen) return null;

  const hasEnoughData = chartData.labels.length > 1;

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="chart-title"
    >
      <div 
        className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl ring-1 ring-slate-700 transform transition-transform duration-300 scale-95 animate-scaleIn"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-700">
            <div className="flex items-center space-x-3 min-w-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-sky-400 flex-shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                </svg>
                <div className="min-w-0">
                    <h2 id="chart-title" className="text-lg font-semibold text-slate-100 truncate" title={product?.name}>
                        {product?.name || 'Price History'}
                    </h2>
                    <p className="text-sm text-slate-400 truncate" title={product?.domain}>{product?.domain || 'N/A'}</p>
                </div>
            </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors" aria-label="Close chart">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        
        <div className="p-4 sm:p-6 h-80">
            {hasEnoughData ? (
                <Line options={chartOptions} data={chartData} />
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-slate-600 mb-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                     </svg>
                     <p className="font-semibold text-lg text-slate-300">Not Enough Data to Display Chart</p>
                     <p>At least two data points are needed. Perform more searches over time to collect price history for this product.</p>
                </div>
            )}
        </div>
      </div>
      <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes scaleIn {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
          .animate-scaleIn { animation: scaleIn 0.2s ease-out; }
        `}</style>
    </div>
  );
};

export default PriceHistoryModal;
