import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Simple in-memory history store
class ChunkHistory {
  private history: string[] = [];
  private maxSize: number;

  constructor(maxSize: number = 10) {
    this.maxSize = maxSize;
  }

  // Add chunk ID to history
  add(chunkId: string): void {
    this.history.push(chunkId);
    
    // Trim to max size
    if (this.history.length > this.maxSize) {
      this.history = this.history.slice(-this.maxSize);
    }
  }

  // Check if chunk ID is in history
  has(chunkId: string): boolean {
    return this.history.includes(chunkId);
  }

  // Get all history
  getAll(): string[] {
    return [...this.history];
  }

  // Clear history
  clear(): void {
    this.history = [];
  }

  // Persist to file
  persist(filePath: string): void {
    try {
      writeFileSync(filePath, JSON.stringify(this.history));
    } catch (error) {
      console.warn('Failed to persist history:', error);
    }
  }

  // Load from file
  load(filePath: string): void {
    try {
      const data = readFileSync(filePath, 'utf8');
      this.history = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, start fresh
      this.history = [];
    }
  }
}

// Singleton instance
let historyInstance: ChunkHistory | null = null;

export function getHistory(maxSize: number = 10): ChunkHistory {
  if (!historyInstance) {
    historyInstance = new ChunkHistory(maxSize);
  }
  return historyInstance;
}

// Get history file path
export function getHistoryFilePath(): string {
  return join(process.cwd(), 'chunk-history.json');
}
