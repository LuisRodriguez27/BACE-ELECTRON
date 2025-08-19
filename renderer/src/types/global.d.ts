export interface IElectronAPI {
  getData: () => Promise<any>;
}

declare global {
  interface Window {
    electron: IElectronAPI;
  }
}

export {};
