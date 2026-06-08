/// <reference types="vite/client" />

declare module "heic2any" {
  export interface Heic2AnyOptions {
    blob: Blob;
    toType?: string;
    quality?: number;
  }

  const heic2any: (options: Heic2AnyOptions) => Promise<Blob | Blob[]>;
  export default heic2any;
}
