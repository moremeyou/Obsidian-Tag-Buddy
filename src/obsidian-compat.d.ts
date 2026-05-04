import type { App, EventRef } from 'obsidian';

declare module 'obsidian' {
    interface App {
        isMobile: boolean;
        on(name: string, callback: (...args: unknown[]) => unknown, ctx?: unknown): EventRef;
    }

    interface MetadataCache {
        getTags(): Record<string, number>;
    }
}

declare global {
    const app: App;
    type EditorEvent = unknown;
}

export {};
