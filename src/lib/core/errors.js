export class AppError extends Error {
    code;
    safeMessage;
    statusCode;
    retryable;
    details;
    cause;
    constructor(options) {
        super(options.message);
        this.name = 'AppError';
        this.code = options.code;
        this.safeMessage = options.safeMessage || 'Ocorreu um erro interno no sistema.';
        this.statusCode = options.statusCode || 500;
        this.retryable = options.retryable || false;
        this.details = options.details;
        this.cause = options.cause;
    }
    toStructured() {
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
