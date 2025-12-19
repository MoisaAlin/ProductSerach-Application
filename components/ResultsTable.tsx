

import React from 'react';
import { ProductInfo } from '../types';

interface ResultsTableProps {
  products: ProductInfo[];
  searchTerm: string;
  onRowClick: (product: ProductInfo) => void;
}

const ResultsTable: React.FC<ResultsTableProps> = ({ products, searchTerm, onRowClick }) => {
  if (products.length === 0) {
    return (
      <div className="text-center text-slate-400 mt-10 p-6 bg-slate-800 rounded-lg shadow-md">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto mb-3 text-slate-500">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
        </svg>
        <p className="text-lg">No products found for "{searchTerm}" with the current filters.</p>
        <p className="text-sm">Try adjusting your search, or changing the active country/domain filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto shadow-xl rounded-lg bg-slate-800 ring-1 ring-slate-700 md:bg-transparent md:ring-0 md:shadow-none">
      <table className="w-full text-sm text-left text-slate-300 responsive-table">
        <thead className="text-xs text-sky-300 uppercase bg-slate-700/50 hidden md:table-header-group">
          <tr>
            <th scope="col" className="px-6 py-4">Product Name</th>
            <th scope="col" className="px-6 py-4">Estimated Price</th>
            <th scope="col" className="px-6 py-4">Country</th>
            <th scope="col" className="px-6 py-4">Domain</th>
            <th scope="col" className="px-6 py-4">Website</th>
          </tr>
        </thead>
        <tbody className="block md:table-row-group">
          {products.map((product, index) => (
            <tr key={`${product.name}-${index}-${product.domain}-${product.country}`} 
                onClick={() => onRowClick(product)}
                className="block mb-4 md:mb-0 md:table-row bg-slate-800 rounded-lg md:rounded-none md:border-b md:border-slate-700 md:hover:bg-slate-700/70 transition-colors duration-150 md:[&>td]:align-middle even:bg-slate-800/60 cursor-pointer"
                title="Click to view price history">
              <td data-label="Product Name" className="px-4 pt-4 pb-2 md:px-6 md:py-4 font-semibold text-lg md:font-medium md:text-base text-slate-100 md:whitespace-nowrap">
                {product.name}
              </td>
              <td data-label="Estimated Price" className="px-4 py-2 md:px-6 md:py-4 text-slate-300">
                {product.price}
              </td>
              <td data-label="Country" className="px-4 py-2 md:px-6 md:py-4 text-slate-300">
                {product.country || 'N/A'}
              </td>
              <td data-label="Domain" className="px-4 py-2 md:px-6 md:py-4 text-slate-300">
                {product.domain || 'N/A'}
              </td>
              <td data-label="Website" className="px-4 pt-2 pb-4 md:px-6 md:py-4" onClick={(e) => e.stopPropagation()}>
                {product.website ? (
                  <a
                    href={product.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-white bg-sky-600 hover:bg-sky-700 transition-colors inline-flex items-center group justify-center w-full md:w-auto py-2 px-3 rounded-md md:bg-transparent md:p-0 md:text-sky-400 md:hover:text-sky-300 md:hover:underline"
                  >
                    View Product
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 ml-1.5 transform transition-transform duration-150 group-hover:translate-x-0.5">
                      <path fillRule="evenodd" d="M5.22 14.78a.75.75 0 0 0 1.06 0l7.22-7.22v5.69a.75.75 0 0 0 1.5 0v-7.5a.75.75 0 0 0-.75-.75h-7.5a.75.75 0 0 0 0 1.5h5.69l-7.22 7.22a.75.75 0 0 0 0 1.06Z" clipRule="evenodd" />
                    </svg>
                  </a>
                ) : (
                  <span className="text-slate-400 px-4 py-2 md:p-0">Not Available</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResultsTable;