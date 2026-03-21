export interface ImageGenerateOptions {
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';
  style?: string;
  platform?: string;
}

export interface ImageGenerateResult {
  imageBase64: string;
  mimeType: string;
  prompt: string;
  model: string;
}
