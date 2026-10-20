import { isbot } from 'isbot';
import { UAParser } from 'ua-parser-js';
import { recordClickEvent } from './db';
import { hashIpAddress } from './security';
import { getCache } from './cache';
import { resolveRealGeo } from './geoip';

export interface TelemetryPayload {
  linkId: string;
  shortCode: string;
  ip: string;
  userAgent: string;
  referrer: string;
  timestamp: string;
  country?: string;
  city?: string;
}


// In-Memory Async Telemetry Queue (Decouples Redirection from DB Latency)
class TelemetryQueueWorker {
  private queue: TelemetryPayload[] = [];
  private isProcessing = false;
  private batchIntervalMs = 500; // Batch flush every 500ms
  private timer: NodeJS.Timeout | null = null;
  private listeners: Array<(event: any) => void> = [];

  constructor() {
    this.startBatchLoop();
  }

  private startBatchLoop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.processBatch();
    }, this.batchIntervalMs);
  }

  /**
   * Non-blocking enqueue (Zero user wait)
   */
  public enqueue(payload: TelemetryPayload): void {
    this.queue.push(payload);
    // Real-time atomic counter increment in cache
    getCache().atomicIncrement(payload.shortCode);
  }

  public subscribe(callback: (event: any) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    const batch = this.queue.splice(0, 50); // Process up to 50 items per batch

    for (const item of batch) {
      try {
        const isBot = isbot(item.userAgent) || item.userAgent.toLowerCase().includes('bot') || item.userAgent.toLowerCase().includes('crawler');
        
        // Parse UA
        const parser = new UAParser(item.userAgent);
        const browser = parser.getBrowser();
        const os = parser.getOS();
        const device = parser.getDevice();

        let deviceType: 'desktop' | 'mobile' | 'tablet' | 'bot' = 'desktop';
        if (isBot) {
          deviceType = 'bot';
        } else if (device.type === 'mobile') {
          deviceType = 'mobile';
        } else if (device.type === 'tablet') {
          deviceType = 'tablet';
        }

        // Real Geo-IP Resolution (Zero user wait during redirect, non-blocking background queue)
        const geo = await resolveRealGeo(item.ip, item.country, item.city);

        const cleanReferrer = item.referrer && item.referrer !== '' ? item.referrer : 'direct';

        const clickEvent = {
          linkId: item.linkId,
          timestamp: item.timestamp,
          ipHash: hashIpAddress(item.ip),
          isBot,
          country: geo.country,
          city: geo.city,
          deviceType,
          os: isBot ? 'Crawler' : (os.name || 'Unknown'),
          browser: isBot ? 'Bot' : (browser.name || 'Unknown'),
          referrer: cleanReferrer
        };

        // Persist to database
        recordClickEvent(clickEvent);

        // Notify live listeners for dashboard real-time updates
        for (const listener of this.listeners) {
          try {
            listener({ ...clickEvent, shortCode: item.shortCode });
          } catch {
            // ignore subscriber errors
          }
        }
      } catch (err) {
        console.error('Telemetry processing error:', err);
      }
    }

    this.isProcessing = false;
  }

  public getQueueLength(): number {
    return this.queue.length;
  }
}


declare global {
  // eslint-disable-next-line no-var
  var __linkpulse_worker: TelemetryQueueWorker | undefined;
}

export function getTelemetryWorker(): TelemetryQueueWorker {
  if (!global.__linkpulse_worker) {
    global.__linkpulse_worker = new TelemetryQueueWorker();
  }
  return global.__linkpulse_worker;
}
