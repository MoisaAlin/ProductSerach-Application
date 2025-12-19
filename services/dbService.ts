import Dexie, { type Table } from 'dexie';
import type { SearchHistoryEntry, ProductInfo, PriceHistoryEntry } from '../types';

// Omit 'id' for creation as it's auto-generated
export type SearchHistoryCreationEntry = Omit<SearchHistoryEntry, 'id'>;

// FIX: Switched to the recommended Dexie subclassing pattern for robust TypeScript support. This correctly defines the database schema and tables, resolving the type error on `db.version()`.
class GeminiProductFinderDB extends Dexie {
  searchHistory!: Table<SearchHistoryEntry>;
  priceHistory!: Table<PriceHistoryEntry>;

  constructor() {
    super('GeminiProductFinderDB');
    this.version(1).stores({
      // Primary key 'id' is auto-incrementing. 'timestamp' is indexed for sorting.
      searchHistory: '++id, timestamp',
    });
    this.version(2).stores({
      // Compound key of productIdentifier and date ensures only one price entry per product, per day.
      priceHistory: '++id, &[productIdentifier+date], productIdentifier',
    });
  }
}

const db = new GeminiProductFinderDB();

const MAX_HISTORY_ITEMS = 50;

/**
 * Adds a new search entry to the history and trims old entries if the limit is exceeded.
 * @param entry The search history entry to add, without the 'id'.
 * @returns The id of the newly created entry.
 */
export const addSearchHistory = async (entry: SearchHistoryCreationEntry): Promise<number> => {
  const newId = await db.searchHistory.add(entry as SearchHistoryEntry);

  // Maintain history size limit
  const count = await db.searchHistory.count();
  if (count > MAX_HISTORY_ITEMS) {
    const toDeleteCount = count - MAX_HISTORY_ITEMS;
    // Find the oldest entries and delete them
    const oldestEntries = await db.searchHistory.orderBy('timestamp').limit(toDeleteCount).toArray();
    const idsToDelete = oldestEntries.map(e => e.id).filter((id): id is number => id !== undefined);
    if(idsToDelete.length > 0) {
      await db.searchHistory.bulkDelete(idsToDelete);
    }
  }

  return newId;
};

/**
 * Retrieves all search history entries, sorted with the most recent first.
 * @returns A promise that resolves to an array of search history entries.
 */
export const getSearchHistory = async (): Promise<SearchHistoryEntry[]> => {
  // Order by timestamp in descending order to get newest first.
  return await db.searchHistory.orderBy('timestamp').reverse().toArray();
};

/**
 * Clears all entries from the search history.
 */
export const clearSearchHistory = async (): Promise<void> => {
  await db.searchHistory.clear();
};


const parsePriceToNumber = (priceStr: string): number | null => {
    if (!priceStr) return null;
    // Remove currency symbols, commas, words. Handles ranges by taking the first number.
    const cleanedStr = priceStr.replace(/[^0-9.,-]+/g, '').trim();
    // Look for a number (integer or float)
    const match = cleanedStr.match(/(\d+\.?\d*)/);
    if (match && match[0]) {
        return parseFloat(match[0]);
    }
    return null;
};

/**
 * Updates the price history with products from a new search.
 * It only adds one price per product per day.
 * @param products An array of products from a search result.
 */
export const updatePriceHistory = async (products: ProductInfo[]): Promise<void> => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const priceEntries: Omit<PriceHistoryEntry, 'id'>[] = [];

    for (const product of products) {
        const price = parsePriceToNumber(product.price);
        // Only store entries with a valid name, domain, and price
        if (price !== null && product.name && product.domain) {
            const productIdentifier = `${product.name.toLowerCase().trim()}|${product.domain.toLowerCase().trim()}`;
            priceEntries.push({
                productIdentifier,
                price,
                date: today,
            });
        }
    }

    if (priceEntries.length > 0) {
        // `bulkAdd` with `allKeys: true` will add new entries and ignore any duplicates 
        // based on the `&[productIdentifier+date]` compound key, preventing multiple entries on the same day.
        await db.priceHistory.bulkAdd(priceEntries, { allKeys: true }).catch(Dexie.BulkError, () => {
            console.log("Some price history entries for today already exist and were ignored.");
        });
    }
};

/**
 * Retrieves all price history for a specific product, sorted by date.
 * @param productIdentifier The unique identifier for the product (e.g., 'product name|domain.com').
 * @returns A promise that resolves to an array of price history entries.
 */
export const getPriceHistoryForProduct = async (productIdentifier: string): Promise<PriceHistoryEntry[]> => {
    return db.priceHistory
        .where('productIdentifier')
        .equals(productIdentifier)
        .sortBy('date');
};