import React from 'react';

interface ErrorMessageProps {
  message: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 my-6 rounded-lg shadow-lg relative" role="alert">
      <div className="flex items-center">
        {/* FIX: Replaced malformed and conflicting SVG paths with a single, clean "X in a circle" error icon. */}
        <svg className="fill-current h-6 w-6 text-red-400 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
        </svg>
        <div>
          <strong className="font-bold text-red-300">An Error Occurred</strong>
          <span className="block sm:inline ml-2 text-red-200">{message}</span>
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;
