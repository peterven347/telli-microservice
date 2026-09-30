// upload-session.types.ts

export interface UploadSession {
  uploadId: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  wrappedKey: string;
  dir: string;
  receivedChunks: Set<number>;
  fileHash?: string;
  complete: boolean;
}

export interface InitUploadDto {
  fileName: string;
  fileSize: number;
  totalChunks: number;
  wrappedKey: string;
}

export interface CompleteUploadDto {
  fileHash: string;
}
