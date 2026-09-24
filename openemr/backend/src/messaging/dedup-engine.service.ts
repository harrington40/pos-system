import { Injectable, Logger } from '@nestjs/common';

/**
 * Smart Deduplication Engine
 * 
 * Prevents duplicate messages from being processed within a sliding window.
 * Uses composite key: topic + type + sender + recipient + content hash.
 */
@Injectable()
export class DedupEngine {
  private readonly logger = new Logger(DedupEngine.name);
  private readonly cache = new Map<string, number>();
  private readonly WINDOW_MS = 300_000; // 5 minutes
  private readonly MAX_CACHE = 50_000;

  /**
   * Check if an event is a duplicate.
   * Returns true if the same key was seen within the dedup window.
   */
  isDuplicate(event: {
    topic: string;
    type: string;
    source?: { userId?: number };
    payload?: any;
  }): boolean {
    const key = this.buildKey(event);
    const now = Date.now();
    const lastSeen = this.cache.get(key);

    if (lastSeen && now - lastSeen < this.WINDOW_MS) {
      this.logger.debug(`Dedup: blocked duplicate — ${key}`);
      return true;
    }

    this.cache.set(key, now);
    this.prune();
    return false;
  }

  /**
   * Force-clear a key (e.g., after successful processing).
   */
  clear(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Build composite dedup key.
   */
  private buildKey(event: {
    topic: string;
    type: string;
    source?: { userId?: number };
    payload?: any;
  }): string {
    const sender = event.source?.userId ?? 'anon';
    const recipient =
      event.payload?.pid ??
      event.payload?.recipientId ??
      event.payload?.to ??
      'unknown';
    const contentHash = this.hash(String(event.payload?.body ?? event.payload?.title ?? ''));
    return `${event.topic}:${event.type}:${sender}:${recipient}:${contentHash}`;
  }

  private hash(str: string): string {
    // Simple FNV-1a style hash for dedup key
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  private prune(): void {
    if (this.cache.size <= this.MAX_CACHE) return;
    const now = Date.now();
    for (const [key, ts] of this.cache.entries()) {
      if (now - ts > this.WINDOW_MS * 2) {
        this.cache.delete(key);
      }
    }
  }
}
