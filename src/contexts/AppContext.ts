import { createContext } from "react";

export type Theme = "dark" | "light" | "system";

/** Source of a relay configuration */
export type RelaySource = 'user' | 'fallback' | 'search';

export interface RelayConfig {
  url: string;
  read: boolean;
  write: boolean;
  /** Where this relay came from - helps UI distinguish user's relays from system defaults */
  source?: RelaySource;
}

export interface RelayMetadata {
  /** List of relays with read/write permissions */
  relays: RelayConfig[];
  /** Unix timestamp of when the relay list was last updated */
  updatedAt: number;
  /** Whether user has explicitly disabled fallback relays */
  fallbacksDisabled?: boolean;
}

export interface AppConfig {
  /** Current theme */
  theme: Theme;
  /** NIP-65 relay list metadata */
  relayMetadata: RelayMetadata;
}

export interface AppContextType {
  /** Current application configuration */
  config: AppConfig;
  /** Update configuration using a callback that receives current config and returns new config */
  updateConfig: (updater: (currentConfig: Partial<AppConfig>) => Partial<AppConfig>) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
