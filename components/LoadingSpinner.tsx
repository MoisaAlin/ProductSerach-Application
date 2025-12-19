import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center my-12" aria-label="Loading results">
      <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent border-solid rounded-full animate-spin"></div>
      <p className="mt-4 text-lg text-slate-300">Searching for products...</p>
      <p className="text-sm text-slate-400">This may take a moment.</p>
    </div>
  );
};

export default LoadingSpinner;
