export interface GroundingChunkWeb {
  uri: string;
  title: string;
}

export interface ProductInfo {
  name: string;
  price: string;
  website: string;
  country: string; // New field for country
  domain: string;  // New field for domain
}

export interface ProductSearchResult {
  products: ProductInfo[];
  sources: GroundingChunkWeb[];
}

export interface GeminiGroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  // Other types of chunks can exist, but we are interested in 'web'
}

export interface SearchHistoryEntry {
  id: number;
  searchTerm: string;
  searchCountry: string;
  products: ProductInfo[];
  sources: GroundingChunkWeb[];
  timestamp: string;
}

export interface PriceHistoryEntry {
  id?: number;
  productIdentifier: string; // a unique key, e.g., 'product name|domain.com'
  price: number;
  date: string; // YYYY-MM-DD
}