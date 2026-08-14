const sensitiveKeys = ['token', 'key', 'password', 'secret', 'cpf', 'phone', 'email'];
function sanitize(data) {
    if (!data)
        return data;
    if (typeof data !== 'object')
        return data;
    const sanitized = Array.isArray(data) ? [...data] : { ...data };
    for (const key in sanitized) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
            sanitized[key] = '[REDACTED]';
        }
        else if (typeof sanitized[key] === 'object') {
            sanitized[key] = sanitize(sanitized[key]);
        }
    }
    return sanitized;
}
export const logger = {
    log(level, event, message, metadata, options) {
        const entry = {
            event,
            level,
            timestamp: new Date().toISOString(),
            message,
            metadata: sanitize(metadata),
            ...options
        };
        // Auditoria CRÍTICA de CPF
        if (message?.includes("CPF") || JSON.stringify(metadata || {}).includes("CPF")) {
            const stack = new Error().stack;
            console.warn(`[AUDIT] CPF_DETECTED in log: event=${event}, message=${message}, stack=${stack}`);
            // Não redigimos o evento de auditoria para fins de depuração interna no console de erro seguro
            entry.metadata = { ...entry.metadata, audit_stack: stack };
        }
        const logFn = level === 'error' || level === 'critical' ? console.error : level === 'warn' ? console.warn : console.log;
        logFn(`[${entry.timestamp}] [${level.toUpperCase()}] [${event}] ${message || ''}`, JSON.stringify(entry.metadata || {}));
    },
    debug(event, message, metadata) {
        this.log('debug', event, message, metadata);
    },
    info(event, message, metadata) {
        this.log('info', event, message, metadata);
    },
    warn(event, message, metadata) {
        this.log('warn', event, message, metadata);
    },
    error(event, message, metadata) {
        this.log('error', event, message, metadata);
    },
    critical(event, message, metadata) {
        this.log('critical', event, message, metadata);
    },
    audit(event, message, metadata) {
        const stack = new Error().stack;
        this.log('warn', event, message, { ...metadata, full_stack: stack });
    }
};
