
export interface StructuredResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    safeMessage?: string;
    retryable?: boolean;
    details?: any;
    cause?: any;
  };
}

export class AppError extends Error {
  public code: string;
  public safeMessage: string;
  public statusCode: number;
  public retryable: boolean;
  public details?: any;
  public cause?: any;

  constructor(options: {
    code: string;
    message: string;
    safeMessage?: string;
    statusCode?: number;
    retryable?: boolean;
    details?: any;
    cause?: any;
  }) {
    super(options.message);
    this.name = 'AppError';
    this.code = options.code;
    this.safeMessage = options.safeMessage || 'Ocorreu um erro interno no sistema.';
    this.statusCode = options.statusCode || 500;
    this.retryable = options.retryable || false;
    this.details = options.details;
    this.cause = options.cause;
  }

  toStructured(): StructuredResponse<never> {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        safeMessage: this.safeMessage,
        retryable: this.retryable,
        details: this.details,
        cause: this.cause
      }
    };
  }
}
