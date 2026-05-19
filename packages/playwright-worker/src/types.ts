export interface WorkerConfig {
  profileDir: string;
  artifactsDir: string;
  perplexityUrl: string;
  headless: boolean;
  defaultTimeoutMs: number;
  allowFileUpload: boolean;
  allowModelSwitch: boolean;
}
