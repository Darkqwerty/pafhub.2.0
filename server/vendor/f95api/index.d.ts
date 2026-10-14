// Minimal type declarations for the vendored F95API client
// (compiled CommonJS source under server/vendor/f95api).
// Only the surface used by server/src/importers/f95.ts is declared.

export interface LoginResult {
  success: boolean;
  code: number;
  message: string;
}

export declare class Game {
  id: number;
  name: string;
  overview: string;
  version: string;
  url: string;
  category?: string;
  tags?: string[];
  authors?: unknown[];
  changelog?: unknown[];
  lastThreadUpdate?: Date | string;
  threadPublishingDate?: Date | string;
  lastRelease?: Date | string;
  [key: string]: unknown;
}

export declare function login(
  username: string,
  password: string,
  captchaToken?: () => Promise<string>,
  cb2fa?: () => Promise<number>,
): Promise<LoginResult>;

export declare function logout(): Promise<void>;

export declare function isLogged(): boolean;

export declare function getHandiworkFromURL<T>(url: string, type: new () => T): Promise<T>;
