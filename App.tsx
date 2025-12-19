
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import SearchBar from './components/SearchBar';
import ResultsTable from './components/ResultsTable';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import GroundingSources from './components/GroundingSources';
import HistoryPanel from './components/HistoryPanel';
import PriceHistoryModal from './components/PriceHistoryModal';
import { searchProductsWithGemini } from './services/geminiService';
import { addSearchHistory, getSearchHistory, clearSearchHistory, updatePriceHistory, getPriceHistoryForProduct } from './services/dbService';
import { ProductInfo, GroundingChunkWeb, SearchHistoryEntry } from './types';

const PREDEFINED_SEARCH_COUNTRIES = ["Any Country",  "Romania", "USA", "Canada", "UK", "Germany", "France", "Australia", "Japan", "India", "Brazil"];
const MAX_HISTORY_ITEMS = 50;


const App: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchCountry, setSearchCountry] = useState<string>('');
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [sources, setSources] = useState<GroundingChunkWeb[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<string>('');
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<string>('default');

  const [isHistoryVisible, setIsHistoryVisible] = useState<boolean>(false);
  const [activeHistoryId, setActiveHistoryId] = useState<number | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);

  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [chartData, setChartData] = useState<{ labels: string[], datasets: any[] }>({ labels: [], datasets: [] });
  const [currentProductForChart, setCurrentProductForChart] = useState<ProductInfo | null>(null);


  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await getSearchHistory();
        setSearchHistory(history);
      } catch (e) {
        console.error("Failed to load search history from the database.", e);
        setError("Could not load search history.");
      }
    };
    loadHistory();
  }, []);


  const handleSearch = useCallback(async (query: string) => {
    setSearchTerm(query);
    setIsLoading(true);
    setError(null);
    setProducts([]);
    setSources([]);
    setHasSearched(true);
    setSelectedCountryFilter('');
    setSelectedDomainFilter('');
    setSortOrder('default');
    setActiveHistoryId(null); // This is a new search, not a historical one

    try {
      const result = await searchProductsWithGemini(query, searchCountry);
      setProducts(result.products);
      setSources(result.sources);
      
      if (result.products.length > 0) {
        // Silently update price history in the background
        updatePriceHistory(result.products).catch(e => console.error("Failed to update price history", e));
      }

      const newHistoryEntry: Omit<SearchHistoryEntry, 'id'> = {
        searchTerm: query,
        searchCountry: searchCountry,
        products: result.products,
        sources: result.sources,
        timestamp: new Date().toISOString(),
      };
      
      const newId = await addSearchHistory(newHistoryEntry);
      setSearchHistory(prev => [{ ...newHistoryEntry, id: newId }, ...prev].slice(0, MAX_HISTORY_ITEMS));
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred while searching.');
      }
      setProducts([]);
      setSources([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchCountry]);

  const handleViewHistoryItem = useCallback((historyId: number) => {
    const item = searchHistory.find(h => h.id === historyId);
    if (item) {
      setSearchTerm(item.searchTerm);
      setSearchCountry(item.searchCountry);
      setProducts(item.products);
      setSources(item.sources);
      setHasSearched(true);
      setIsLoading(false);
      setError(null);
      setSelectedCountryFilter('');
      setSelectedDomainFilter('');
      setSortOrder('default');
      setActiveHistoryId(item.id);
      setIsHistoryVisible(false);
    }
  }, [searchHistory]);

  const handleClearHistory = useCallback(async () => {
    try {
      await clearSearchHistory();
      setSearchHistory([]);
      setActiveHistoryId(null);
      setIsHistoryVisible(false);
      // Optionally reset main view
      setProducts([]);
      setSources([]);
      setHasSearched(false);
      setSearchTerm('');
    } catch (e) {
      console.error("Failed to clear search history from the database.", e);
      setError("Could not clear search history.");
    }
  }, []);

  const handleViewPriceHistory = useCallback(async (product: ProductInfo) => {
    if (!product.name || !product.domain) return;
    const productIdentifier = `${product.name.toLowerCase().trim()}|${product.domain.toLowerCase().trim()}`;
    
    try {
      const history = await getPriceHistoryForProduct(productIdentifier);
      const labels = history.map(entry => entry.date);
      const data = history.map(entry => entry.price);

      setChartData({
        labels,
        datasets: [{
          label: 'Price History',
          data,
          fill: true,
          borderColor: 'rgb(56, 189, 248)',
          backgroundColor: 'rgba(56, 189, 248, 0.2)',
          tension: 0.1,
        }]
      });
      setCurrentProductForChart(product);
      setIsChartModalOpen(true);
    } catch (e) {
      console.error("Failed to fetch price history", e);
      setError("Could not retrieve price history for this product.");
    }
  }, []);

  const uniqueCountriesForFilter = useMemo(() => {
    const countries = products.map(p => p.country).filter(Boolean);
    return [...new Set(countries)].sort();
  }, [products]);



  const uniqueDomainsForFilter = useMemo(() => {
    const domains = products.map(p => p.domain).filter(Boolean);
    return [...new Set(domains)].sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const countryMatch = selectedCountryFilter ? product.country === selectedCountryFilter : true;
      const domainMatch = selectedDomainFilter ? product.domain === selectedDomainFilter : true;
      return countryMatch && domainMatch;
    });
  }, [products, selectedCountryFilter, selectedDomainFilter]);

  const sortedProducts = useMemo(() => {
    const productsToSort = [...filteredProducts];

    const parsePrice = (priceStr: string): number => {
      if (!priceStr) return Infinity;
      // Remove currency symbols, commas, and non-numeric words. Handles ranges by taking the first number.
      const cleanedStr = priceStr.replace(/[$,€,£,¥,A-Za-z]/g, '').trim();
      const match = cleanedStr.match(/(\d+\.?\d*)/);
      if (match && match[0]) {
        return parseFloat(match[0]);
      }
      return Infinity; // Treat non-parsable prices as highest value for sorting
    };

    if (sortOrder === 'price_asc') {
      productsToSort.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    } else if (sortOrder === 'price_desc') {
      productsToSort.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    }
    // 'default' order requires no changes.
    return productsToSort;
  }, [filteredProducts, sortOrder]);

  const handleExport = useCallback(() => {
    if (sortedProducts.length === 0) return;

    const headers = ['Product Name', 'Estimated Price', 'Country', 'Domain', 'Website'];
    
    const escapeCsvField = (field: string | null | undefined): string => {
      if (field === null || field === undefined) {
        return '';
      }
      const str = String(field);
      if (str.match(/([",\n\r])/)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.join(','),
      ...sortedProducts.map(p => [
        escapeCsvField(p.name),
        escapeCsvField(p.price),
        escapeCsvField(p.country),
        escapeCsvField(p.domain),
        escapeCsvField(p.website),
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const safeSearchTerm = searchTerm.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `product_search_${safeSearchTerm || 'results'}.csv`;
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [sortedProducts, searchTerm]);

  return (
    <>
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center p-4 sm:p-6 md:p-8 selection:bg-sky-500 selection:text-white">
        <header className="w-full max-w-3xl mx-auto text-center mb-8 sm:mb-10 relative">
          <div className="flex items-center justify-center space-x-3 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-sky-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-400 to-teal-300">
              Gemini Product Finder
            </h1>
          </div>
          <p className="text-slate-400 text-sm sm:text-base md:text-lg">
            Discover products, prices, and websites with AI-powered search.
          </p>
          <button
              onClick={() => setIsHistoryVisible(true)}
              className="absolute top-0 right-0 p-2 text-slate-400 hover:text-sky-400 transition-colors"
              aria-label="View search history"
              title="View search history"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
           </button>
        </header>

        <main className="w-full max-w-3xl mx-auto flex-grow">
          <div className="w-full max-w-2xl mx-auto mb-8">
            <div className="flex flex-col sm:flex-row gap-3 items-start">
              <div className="flex-grow w-full">
                <SearchBar onSearch={handleSearch} isLoading={isLoading} />
              </div>
              <div className="w-full sm:w-auto sm:min-w-[180px]">
                <label htmlFor="search-country-selector" className="block text-sm font-medium text-slate-300 mb-1">
                  Search In:
                </label>
                <select
                  id="search-country-selector"
                  value={searchCountry}
                  onChange={(e) => setSearchCountry(e.target.value)}
                  disabled={isLoading}
                  className="w-full p-3 border border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-slate-700 text-slate-100 placeholder-slate-400 transition-colors h-[50px] disabled:opacity-70 appearance-none"
                  aria-label="Search for products in a specific country"
                  style={{ backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1.5em 1.5em', backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")` }}

                >
                  {PREDEFINED_SEARCH_COUNTRIES.map(country => (
                    <option key={country} value={country === "Any Country" ? "" : country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {isLoading && <LoadingSpinner />}
          {error && !isLoading && <ErrorMessage message={error} />}
          
          {!isLoading && !error && hasSearched && (
            <div className="mt-6 animate-fadeIn">
              {products.length > 0 && (
                <div className="mb-6 p-4 bg-slate-800 rounded-lg shadow-md ring-1 ring-slate-700/50 flex flex-col sm:flex-row gap-4 items-end">
                  {uniqueCountriesForFilter.length > 0 && (
                    <div className="flex-1 w-full sm:w-auto">
                      <label htmlFor="country-filter" className="block text-sm font-medium text-slate-300 mb-1">
                        Filter by Country:
                      </label>
                      <select
                        id="country-filter"
                        value={selectedCountryFilter}
                        onChange={(e) => setSelectedCountryFilter(e.target.value)}
                        className="w-full p-2.5 border border-slate-600 rounded-md shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-slate-700 text-slate-100 placeholder-slate-400 transition-colors appearance-none"
                        aria-label="Filter products by country"
                        style={{ backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1.5em 1.5em', backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")` }}
                      >
                        <option value="">All Countries</option>
                        {uniqueCountriesForFilter.map(country => (
                          <option key={country} value={country}>{country}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {uniqueDomainsForFilter.length > 0 && (
                    <div className="flex-1 w-full sm:w-auto">
                      <label htmlFor="domain-filter" className="block text-sm font-medium text-slate-300 mb-1">
                        Filter by Domain:
                      </label>
                      <select
                        id="domain-filter"
                        value={selectedDomainFilter}
                        onChange={(e) => setSelectedDomainFilter(e.target.value)}
                        className="w-full p-2.5 border border-slate-600 rounded-md shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-slate-700 text-slate-100 placeholder-slate-400 transition-colors appearance-none"
                        aria-label="Filter products by domain"
                        style={{ backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1.5em 1.5em', backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")` }}
                      >
                        <option value="">All Domains</option>
                        {uniqueDomainsForFilter.map(domain => (
                          <option key={domain} value={domain}>{domain}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex-1 w-full sm:w-auto">
                    <label htmlFor="sort-order" className="block text-sm font-medium text-slate-300 mb-1">
                      Sort by:
                    </label>
                    <select
                      id="sort-order"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="w-full p-2.5 border border-slate-600 rounded-md shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-slate-700 text-slate-100 placeholder-slate-400 transition-colors appearance-none"
                      aria-label="Sort products by price"
                      style={{ backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1.5em 1.5em', backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")` }}
                    >
                      <option value="default">Default Order</option>
                      <option value="price_asc">Price: Low to High</option>
                      <option value="price_desc">Price: High to Low</option>
                    </select>
                  </div>
                  
                  <div className="flex-grow hidden sm:block"></div>
                  
                  <div className="flex-shrink-0 w-full sm:w-auto">
                    <label className="block text-sm font-medium mb-1 invisible hidden sm:block">
                      &nbsp;
                    </label>
                    <button
                      onClick={handleExport}
                      disabled={sortedProducts.length === 0}
                      className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold p-2.5 rounded-md shadow-md transition-colors duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      aria-label="Export results to CSV"
                      title={sortedProducts.length === 0 ? "No products to export" : "Export current view to CSV"}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      <span>Export CSV</span>
                    </button>
                  </div>

                </div>
              )}
              <ResultsTable products={sortedProducts} searchTerm={searchTerm} onRowClick={handleViewPriceHistory} />
              {sources.length > 0 && <GroundingSources sources={sources} />}
            </div>
          )}

          {!isLoading && !hasSearched && (
              <div className="text-center text-slate-500 mt-12 p-8 bg-slate-800/50 border border-dashed border-slate-700 rounded-lg animate-fadeIn">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto mb-5 text-slate-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                  <h2 className="text-2xl font-semibold text-slate-300 mb-2">Ready to find some products?</h2>
                  <p className="text-slate-400">Enter a search term above to get started.</p>
              </div>
          )}
        </main>

        <footer className="w-full max-w-3xl mx-auto text-center mt-10 sm:mt-16 py-6 border-t border-slate-700/50">
          <p className="text-xs sm:text-sm text-slate-500">
            Powered by <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:underline hover:text-sky-400 transition-colors">Google Gemini API</a>. 
            Product information may be enhanced by Google Search.
          </p>
        </footer>
        <style>{`
          .animate-fadeIn {
            animation: fadeIn 0.5s ease-out;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          select {
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
          }
        `}</style>
      </div>
      <HistoryPanel 
        isVisible={isHistoryVisible} 
        onClose={() => setIsHistoryVisible(false)}
        history={searchHistory}
        onItemClick={handleViewHistoryItem}
        onClear={handleClearHistory}
        activeItemId={activeHistoryId}
      />
      <PriceHistoryModal
        isOpen={isChartModalOpen}
        onClose={() => setIsChartModalOpen(false)}
        product={currentProductForChart}
        chartData={chartData}
      />
    </>
  );
};

export default App;