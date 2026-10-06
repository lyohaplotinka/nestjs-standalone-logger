import { isObject } from './shared.utils'
import { ConsoleLogger } from './console-logger.service'
import { isLogLevelEnabled, type LogLevel } from './log-levels'

export { LOG_LEVELS, type LogLevel } from './log-levels'

export interface LoggerService {
  /**
   * Write a 'log' level log.
   */
  log(message: any, ...optionalParams: any[]): any

  /**
   * Write an 'error' level log.
   */
  error(message: any, ...optionalParams: any[]): any

  /**
   * Write a 'warn' level log.
   */
  warn(message: any, ...optionalParams: any[]): any

  /**
   * Write a 'debug' level log.
   */
  debug?(message: any, ...optionalParams: any[]): any

  /**
   * Write a 'verbose' level log.
   */
  verbose?(message: any, ...optionalParams: any[]): any

  /**
   * Write a 'fatal' level log.
   */
  fatal?(message: any, ...optionalParams: any[]): any

  /**
   * Set log levels.
   * @param levels log levels
   */
  setLogLevels?(levels: LogLevel[]): any
}

interface LogBufferRecord {
  methodRef: Function
  arguments: unknown[]
}

const DEFAULT_LOGGER = new ConsoleLogger()

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  day: '2-digit',
  month: '2-digit',
})

export class Logger implements LoggerService {
  protected static logBuffer = new Array<LogBufferRecord>()
  protected static staticInstanceRef?: LoggerService = DEFAULT_LOGGER
  protected static logLevels?: LogLevel[]
  private static isBufferAttached: boolean

  protected localInstanceRef?: LoggerService

  constructor()
  constructor(context: string)
  constructor(context: string, options?: { timestamp?: boolean })
  constructor(
    protected context?: string,
    protected options: { timestamp?: boolean } = {},
  ) {}

  get localInstance(): LoggerService {
    if (Logger.staticInstanceRef === DEFAULT_LOGGER) {
      return this.registerLocalInstanceRef()
    } else if (Logger.staticInstanceRef instanceof Logger) {
      const prototype = Object.getPrototypeOf(Logger.staticInstanceRef)
      if (prototype.constructor === Logger) {
        return this.registerLocalInstanceRef()
      }
    }
    return Logger.staticInstanceRef!
  }

  error(message: any, stack?: string, context?: string): void
  error(message: any, ...optionalParams: [...any, string?, string?]): void
  error(message: any, ...optionalParams: any[]) {
    optionalParams = this.context
      ? (optionalParams.length ? optionalParams : [undefined]).concat(this.context)
      : optionalParams

    this.localInstance?.error(message, ...optionalParams)
  }

  log(message: any, context?: string): void
  log(message: any, ...optionalParams: [...any, string?]): void
  log(message: any, ...optionalParams: any[]) {
    optionalParams = this.context ? optionalParams.concat(this.context) : optionalParams
    this.localInstance?.log(message, ...optionalParams)
  }

  warn(message: any, context?: string): void
  warn(message: any, ...optionalParams: [...any, string?]): void
  warn(message: any, ...optionalParams: any[]) {
    optionalParams = this.context ? optionalParams.concat(this.context) : optionalParams
    this.localInstance?.warn(message, ...optionalParams)
  }

  debug(message: any, context?: string): void
  debug(message: any, ...optionalParams: [...any, string?]): void
  debug(message: any, ...optionalParams: any[]) {
    optionalParams = this.context ? optionalParams.concat(this.context) : optionalParams
    this.localInstance?.debug?.(message, ...optionalParams)
  }

  verbose(message: any, context?: string): void
  verbose(message: any, ...optionalParams: [...any, string?]): void
  verbose(message: any, ...optionalParams: any[]) {
    optionalParams = this.context ? optionalParams.concat(this.context) : optionalParams
    this.localInstance?.verbose?.(message, ...optionalParams)
  }

  fatal(message: any, context?: string): void
  fatal(message: any, ...optionalParams: [...any, string?]): void
  fatal(message: any, ...optionalParams: any[]) {
    optionalParams = this.context ? optionalParams.concat(this.context) : optionalParams
    this.localInstance?.fatal?.(message, ...optionalParams)
  }

  static error(message: any, stackOrContext?: string): void
  static error(message: any, context?: string): void
  static error(message: any, stack?: string, context?: string): void
  static error(message: any, ...optionalParams: [...any, string?, string?]): void
  static error(message: any, ...optionalParams: any[]) {
    this.staticInstanceRef?.error(message, ...optionalParams)
  }

  static log(message: any, context?: string): void
  static log(message: any, ...optionalParams: [...any, string?]): void
  static log(message: any, ...optionalParams: any[]) {
    this.staticInstanceRef?.log(message, ...optionalParams)
  }

  static warn(message: any, context?: string): void
  static warn(message: any, ...optionalParams: [...any, string?]): void
  static warn(message: any, ...optionalParams: any[]) {
    this.staticInstanceRef?.warn(message, ...optionalParams)
  }

  static debug(message: any, context?: string): void
  static debug(message: any, ...optionalParams: [...any, string?]): void
  static debug(message: any, ...optionalParams: any[]) {
    this.staticInstanceRef?.debug?.(message, ...optionalParams)
  }

  static verbose(message: any, context?: string): void
  static verbose(message: any, ...optionalParams: [...any, string?]): void
  static verbose(message: any, ...optionalParams: any[]) {
    this.staticInstanceRef?.verbose?.(message, ...optionalParams)
  }

  static fatal(message: any, context?: string): void
  static fatal(message: any, ...optionalParams: [...any, string?]): void
  static fatal(message: any, ...optionalParams: any[]) {
    this.staticInstanceRef?.fatal?.(message, ...optionalParams)
  }

  /**
   * Print buffered logs and detach buffer.
   */
  static flush() {
    this.isBufferAttached = false
    this.logBuffer.forEach((item) => item.methodRef(...(item.arguments as [string])))
    this.logBuffer = []
  }

  /**
   * Attach buffer. Turns on initialization logs buffering.
   */
  static attachBuffer() {
    this.isBufferAttached = true
  }

  /**
   * Detach buffer. Turns off initialization logs buffering.
   */
  static detachBuffer() {
    this.isBufferAttached = false
  }

  static getTimestamp() {
    return dateTimeFormatter.format(Date.now())
  }

  static overrideLogger(logger: LoggerService | LogLevel[] | boolean) {
    if (Array.isArray(logger)) {
      Logger.logLevels = logger
      return this.staticInstanceRef?.setLogLevels?.(logger)
    }
    if (isObject(logger)) {
      if (logger instanceof Logger && logger.constructor !== Logger) {
        const errorMessage = `Using the "extends Logger" instruction is not allowed. Please, use "extends ConsoleLogger" instead.`
        this.staticInstanceRef?.error(errorMessage)
        throw new Error(errorMessage)
      }
      this.staticInstanceRef = logger as LoggerService
    } else {
      this.staticInstanceRef = undefined
    }
  }

  static isLevelEnabled(level: LogLevel): boolean {
    const logLevels = Logger.logLevels
    return isLogLevelEnabled(level, logLevels)
  }

  private registerLocalInstanceRef() {
    if (this.localInstanceRef) {
      return this.localInstanceRef
    }
    this.localInstanceRef = new ConsoleLogger(this.context!, {
      timestamp: this.options?.timestamp,
      logLevels: Logger.logLevels,
    })
    return this.localInstanceRef
  }

  private static bufferMethod(obj: any, key: string) {
    const originalFn = obj[key]
    obj[key] = function (...args: unknown[]) {
      if (Logger.isBufferAttached) {
        Logger.logBuffer.push({
          methodRef: originalFn.bind(this),
          arguments: args,
        })
        return
      }
      return originalFn.call(this, ...args)
    }
  }

  static {
    ;(['error', 'log', 'warn', 'debug', 'verbose', 'fatal'] as const).forEach((key) => {
      Logger.bufferMethod(Logger.prototype, key)
      Logger.bufferMethod(Logger, key)
    })
  }
}
