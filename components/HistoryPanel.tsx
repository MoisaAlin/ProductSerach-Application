import React from 'react';
import { SearchHistoryEntry } from '../types';

interface HistoryPanelProps {
  isVisible: boolean;
  onClose: () => void;
  history: SearchHistoryEntry[];
  onItemClick: (id: number) => void;
  onClear: () => void;
  activeItemId: number | null;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ isVisible, onClose, history, onItemClick, onClear, activeItemId }) => {
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <aside 
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-panel-title"
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <h2 id="history-panel-title" className="text-xl font-semibold text-sky-300 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            Search History
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors" aria-label="Close history panel">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-grow overflow-y-auto">
          {history.length === 0 ? (
            <div className="text-center text-slate-400 p-8 flex flex-col items-center justify-center h-full">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-slate-600 mb-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
              <p className="font-semibold text-lg text-slate-300">No History Yet</p>
              <p>Your past product searches will appear here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-700">
              {history.map(item => (
                <li key={item.id}>
                  <button 
                    onClick={() => onItemClick(item.id)} 
                    className={`w-full text-left p-4 transition-colors duration-150 ${activeItemId === item.id ? 'bg-sky-900/50' : 'hover:bg-slate-700/70'}`}
                  >
                    <p className={`font-semibold truncate ${activeItemId === item.id ? 'text-sky-300' : 'text-slate-100'}`} title={item.searchTerm}>
                      {item.searchTerm}
                    </p>
                    <div className="text-xs text-slate-400 mt-1 flex justify-between items-center">
                      <span>{formatDate(item.timestamp)}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${activeItemId === item.id ? 'bg-sky-400/20 text-sky-300' : 'bg-slate-600 text-slate-300'}`}>
                        {item.products.length} {item.products.length === 1 ? 'result' : 'results'}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {history.length > 0 && (
          <footer className="p-4 border-t border-slate-700 flex-shrink-0">
            <button
              onClick={onClear}
              className="w-full bg-red-800/80 hover:bg-red-700 text-white font-semibold p-2.5 rounded-md shadow-md transition-colors duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
              <span>Clear All History</span>
            </button>
          </footer>
        )}
      </aside>
    </>
  );
};

export default HistoryPanel;
