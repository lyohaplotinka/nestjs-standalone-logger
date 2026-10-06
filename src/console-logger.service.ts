import { inspect } from 'util'
import type { InspectOptions } from 'util'
import { clc, yellow, isColorAllowed } from './cli-colors.util'
import { isFunction, isPlainObject, isString, isUndefined } from './shared.utils'
import type { LoggerService, LogLevel } from './logger.service'
import { isLogLevelEnabled } from './log-levels'

const DEFAULT_DEPTH = 5

export interface ConsoleLoggerOptions {
  /**
   * Enabled log levels.
   */
  logLevels?: LogLevel[]
  /**
   * If enabled, will print timestamp (time difference) between current and previous log message.
   * Note: This option is not used when `json` is enabled.
   */
  timestamp?: boolean
  /**
   * A prefix to be used for each log message.
   * Note: This option is not used when `json` is enabled.
   */
  prefix?: string
  /**
   * If enabled, will print the log message in JSON format.
   */
  json?: boolean
  /**
   * If enabled, will print the log message in color.
   * Default true if json is disabled, false otherwise
   */
  colors?: boolean
  /**
   * The context of the logger.
   */
  context?: string
  /**
   * If enabled, will force the use of console.log/console.error instead of process.stdout/stderr.write.
   * @default false
   */
  forceConsole?: boolean
  /**
   * If enabled, will print the log message in a single line, even if it is an object with multiple properties.
   */
  compact?: boolean | number
  /**
   * @default 100
   */
  maxArrayLength?: number
  /**
   * @default 10000
   */
  maxStringLength?: number
  /**
   * If enabled, will sort keys while formatting objects.
   * @default false
   */
  sorted?: boolean | ((a: string, b: string) => number)
  /**
   * @default 5
   */
  depth?: number
  /**
   * @default false
   */
  showHidden?: boolean
  /**
   * Default Infinity when "compact" is true, 80 otherwise.
   */
  breakLength?: number
  /**
   * If enabled, plain objects passed after the message are treated as structured
   * metadata (params) attached to the log entry, instead of being logged as
   * separate messages.
   * @default true
   */
  structuredParams?: boolean
  /**
   * When true and `json` mode is enabled, structured params are spread into the root JSON object
   * instead of being nested under a `params` key.
   * @default false
   */
  flattenParams?: boolean
}

const DEFAULT_LOG_LEVELS: LogLevel[] = ['log', 'error', 'warn', 'debug', 'verbose', 'fatal']

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  day: '2-digit',
  month: '2-digit',
})

export class ConsoleLogger implements LoggerService {
  protected options: ConsoleLoggerOptions
  protected context?: string
  protected originalContext?: string
  protected inspectOptions: InspectOptions
  protected static lastTimestampAt?: number

  constructor(contextOrOptions?: string | ConsoleLoggerOptions, options?: ConsoleLoggerOptions) {
    let [context, opts] = isString(contextOrOptions)
      ? [contextOrOptions, options]
      : options
        ? [undefined, options]
        : [contextOrOptions?.context, contextOrOptions]

    opts = opts ?? {}
    opts.logLevels ??= DEFAULT_LOG_LEVELS
    opts.colors ??= opts.json ? false : isColorAllowed()
    opts.prefix ??= 'App'

    this.options = opts
    this.inspectOptions = this.getInspectOptions()

    if (context) {
      this.context = context
      this.originalContext = context
    }
  }

  log(message: any, context?: string): void
  log(message: any, ...optionalParams: [...any, string?]): void
  log(message: any, ...optionalParams: any[]) {
    if (!this.isLevelEnabled('log')) {
      return
    }
    const { messages, context, params } = this.getContextAndMessagesToPrint([
      message,
      ...optionalParams,
    ])
    this.printMessages(messages, context, 'log', 'stdout', undefined, params)
  }

  error(message: any, stackOrContext?: string): void
  error(message: any, stack?: string, context?: string): void
  error(message: any, ...optionalParams: [...any, string?, string?]): void
  error(message: any, ...optionalParams: any[]) {
    if (!this.isLevelEnabled('error')) {
      return
    }
    const { messages, context, stack, params } = this.getContextAndStackAndMessagesToPrint([
      message,
      ...optionalParams,
    ])

    this.printMessages(messages, context, 'error', 'stderr', stack, params)
    this.printStackTrace(stack!)
  }

  warn(message: any, context?: string): void
  warn(message: any, ...optionalParams: [...any, string?]): void
  warn(message: any, ...optionalParams: any[]) {
    if (!this.isLevelEnabled('warn')) {
      return
    }
    const { messages, context, params } = this.getContextAndMessagesToPrint([
      message,
      ...optionalParams,
    ])
    this.printMessages(messages, context, 'warn', 'stdout', undefined, params)
  }

  debug(message: any, context?: string): void
  debug(message: any, ...optionalParams: [...any, string?]): void
  debug(message: any, ...optionalParams: any[]) {
    if (!this.isLevelEnabled('debug')) {
      return
    }
    const { messages, context, params } = this.getContextAndMessagesToPrint([
      message,
      ...optionalParams,
    ])
    this.printMessages(messages, context, 'debug', 'stdout', undefined, params)
  }

  verbose(message: any, context?: string): void
  verbose(message: any, ...optionalParams: [...any, string?]): void
  verbose(message: any, ...optionalParams: any[]) {
    if (!this.isLevelEnabled('verbose')) {
      return
    }
    const { messages, context, params } = this.getContextAndMessagesToPrint([
      message,
      ...optionalParams,
    ])
    this.printMessages(messages, context, 'verbose', 'stdout', undefined, params)
  }

  fatal(message: any, context?: string): void
  fatal(message: any, ...optionalParams: [...any, string?]): void
  fatal(message: any, ...optionalParams: any[]) {
    if (!this.isLevelEnabled('fatal')) {
      return
    }
    const { messages, context, params } = this.getContextAndMessagesToPrint([
      message,
      ...optionalParams,
    ])
    this.printMessages(messages, context, 'fatal', 'stdout', undefined, params)
  }

  setLogLevels(levels: LogLevel[]) {
    if (!this.options) {
      this.options = {}
    }
    this.options.logLevels = levels
  }

  setContext(context: string) {
    this.context = context
  }

  resetContext() {
    this.context = this.originalContext
  }

  isLevelEnabled(level: LogLevel): boolean {
    const logLevels = this.options?.logLevels
    return isLogLevelEnabled(level, logLevels)
  }

  protected getTimestamp(): string {
    return dateTimeFormatter.format(Date.now())
  }

  protected printMessages(
    messages: unknown[],
    context = '',
    logLevel: LogLevel = 'log',
    writeStreamType?: 'stdout' | 'stderr',
    errorStack?: unknown,
    params?: Record<string, any>,
  ) {
    messages.forEach((message) => {
      if (this.options.json) {
        this.printAsJson(message, {
          context,
          logLevel,
          writeStreamType,
          errorStack,
          params,
        })
        return
      }
      const pidMessage = this.formatPid(process.pid)
      const contextMessage = this.formatContext(context)
      const timestampDiff = this.updateAndGetTimestampDiff()
      const formattedLogLevel = logLevel.toUpperCase().padStart(7, ' ')
      const formattedMessage = this.formatMessage(
        logLevel,
        message,
        pidMessage,
        formattedLogLevel,
        contextMessage,
        timestampDiff,
        params,
      )

      if (this.options.forceConsole) {
        if (writeStreamType === 'stderr') {
          console.error(formattedMessage.trim())
        } else {
          console.log(formattedMessage.trim())
        }
      } else {
        process[writeStreamType ?? 'stdout'].write(formattedMessage)
      }
    })
  }

  protected printAsJson(
    message: unknown,
    options: {
      context: string
      logLevel: LogLevel
      writeStreamType?: 'stdout' | 'stderr'
      errorStack?: unknown
      params?: Record<string, any>
    },
  ) {
    const logObject = this.getJsonLogObject(message, options)
    const formattedMessage =
      !this.options.colors && this.inspectOptions.compact === true
        ? JSON.stringify(logObject, this.stringifyReplacer)
        : inspect(logObject, this.inspectOptions)
    if (this.options.forceConsole) {
      if (options.writeStreamType === 'stderr') {
        console.error(formattedMessage)
      } else {
        console.log(formattedMessage)
      }
    } else {
      process[options.writeStreamType ?? 'stdout'].write(`${formattedMessage}\n`)
    }
  }

  protected getJsonLogObject(
    message: unknown,
    options: {
      context: string
      logLevel: LogLevel
      writeStreamType?: 'stdout' | 'stderr'
      errorStack?: unknown
      params?: Record<string, any>
    },
  ) {
    type JsonLogObject = {
      level: LogLevel
      pid: number
      timestamp: number
      message: unknown
      context?: string
      stack?: unknown
      params?: Record<string, any>
      [key: string]: unknown
    }

    const logObject: JsonLogObject = {
      level: options.logLevel,
      pid: process.pid,
      timestamp: Date.now(),
      message,
    }

    if (options.context) {
      logObject.context = options.context
    }

    if (options.errorStack) {
      logObject.stack = options.errorStack
    }

    if (options.params) {
      if (this.options.flattenParams) {
        for (const [key, value] of Object.entries(options.params)) {
          if (!(key in logObject)) {
            logObject[key] = value
          }
        }
      } else {
        logObject.params = options.params
      }
    }

    return logObject
  }

  protected formatPid(pid: number) {
    return `[${this.options.prefix}] ${pid}  - `
  }

  protected formatContext(context: string): string {
    if (!context) {
      return ''
    }

    context = `[${context}] `
    return this.options.colors ? yellow(context) : context
  }

  protected formatMessage(
    logLevel: LogLevel,
    message: unknown,
    pidMessage: string,
    formattedLogLevel: string,
    contextMessage: string,
    timestampDiff: string,
    params?: Record<string, any>,
  ) {
    const output = this.stringifyMessage(message, logLevel)
    pidMessage = this.colorize(pidMessage, logLevel)
    formattedLogLevel = this.colorize(formattedLogLevel, logLevel)
    const paramsOutput = params ? ` ${this.stringifyParams(params)}` : ''
    return `${pidMessage}${this.getTimestamp()} ${formattedLogLevel} ${contextMessage}${output}${paramsOutput}${timestampDiff}\n`
  }

  protected stringifyParams(params: Record<string, any>): string {
    return inspect(params, {
      ...this.inspectOptions,
      compact: true,
      breakLength: Infinity,
    })
  }

  protected stringifyMessage(message: unknown, logLevel: LogLevel): string {
    if (isFunction(message)) {
      const messageAsStr = Function.prototype.toString.call(message)
      const isClass = messageAsStr.startsWith('class ')
      if (isClass) {
        return this.stringifyMessage(message.name, logLevel)
      }
      return this.stringifyMessage(message(), logLevel)
    }

    if (typeof message === 'string') {
      return this.colorize(message, logLevel)
    }

    const outputText = inspect(message, this.inspectOptions)
    if (isPlainObject(message)) {
      return `Object(${Object.keys(message).length}) ${outputText}`
    }
    if (Array.isArray(message)) {
      return `Array(${message.length}) ${outputText}`
    }
    return outputText
  }

  protected colorize(message: string, logLevel: LogLevel) {
    if (!this.options.colors || this.options.json) {
      return message
    }
    const color = this.getColorByLogLevel(logLevel)
    return color(message)
  }

  protected printStackTrace(stack: string) {
    if (!stack || this.options.json) {
      return
    }
    if (this.options.forceConsole) {
      console.error(stack)
    } else {
      process.stderr.write(`${stack}\n`)
    }
  }

  protected updateAndGetTimestampDiff(): string {
    const includeTimestamp = ConsoleLogger.lastTimestampAt && this.options?.timestamp
    const result = includeTimestamp
      ? this.formatTimestampDiff(Date.now() - ConsoleLogger.lastTimestampAt!)
      : ''
    ConsoleLogger.lastTimestampAt = Date.now()
    return result
  }

  protected formatTimestampDiff(timestampDiff: number) {
    const formattedDiff = ` +${timestampDiff}ms`
    return this.options.colors ? yellow(formattedDiff) : formattedDiff
  }

  protected getInspectOptions() {
    let breakLength = this.options.breakLength
    if (typeof breakLength === 'undefined') {
      breakLength = this.options.colors
        ? this.options.compact
          ? Infinity
          : undefined
        : this.options.compact === false
          ? undefined
          : Infinity
    }

    const inspectOptions: InspectOptions = {
      depth: this.options.depth ?? DEFAULT_DEPTH,
      sorted: this.options.sorted,
      showHidden: this.options.showHidden,
      compact: this.options.compact ?? this.options.json,
      colors: this.options.colors,
      breakLength,
    }

    if (typeof this.options.maxArrayLength !== 'undefined') {
      inspectOptions.maxArrayLength = this.options.maxArrayLength
    }
    if (typeof this.options.maxStringLength !== 'undefined') {
      inspectOptions.maxStringLength = this.options.maxStringLength
    }

    return inspectOptions
  }

  protected stringifyReplacer(key: string, value: unknown) {
    if (typeof value === 'bigint') {
      return value.toString()
    }
    if (typeof value === 'symbol') {
      return value.toString()
    }

    if (value instanceof Map || value instanceof Set || value instanceof Error) {
      return `${inspect(value, this.inspectOptions)}`
    }
    return value
  }

  protected getContextAndMessagesToPrint(args: unknown[]) {
    if (args?.length <= 1) {
      return { messages: args, context: this.context }
    }
    const lastElement = args[args.length - 1]
    const isContext = isString(lastElement)

    let context: string | undefined
    let remainingArgs: unknown[]

    if (isContext) {
      context = lastElement
      remainingArgs = args.slice(0, args.length - 1)
    } else {
      context = this.context
      remainingArgs = args
    }

    if (this.options.structuredParams === false) {
      return { messages: remainingArgs, context }
    }

    const messages: unknown[] = [remainingArgs[0]]
    const paramObjects: Record<string, any>[] = []

    for (let i = 1; i < remainingArgs.length; i++) {
      if (isPlainObject(remainingArgs[i])) {
        paramObjects.push(remainingArgs[i] as Record<string, any>)
      } else {
        messages.push(remainingArgs[i])
      }
    }

    const params = paramObjects.length > 0 ? Object.assign({}, ...paramObjects) : undefined

    return { messages, context, params }
  }

  protected getContextAndStackAndMessagesToPrint(args: unknown[]) {
    if (args.length === 2) {
      if (this.isStackFormat(args[1])) {
        return {
          messages: [args[0]],
          stack: args[1] as string,
          context: this.context,
        }
      }
      return { ...this.getContextAndMessagesToPrint(args) }
    }

    const trailingArg = args[args.length - 1]
    if (this.isStackFormat(trailingArg)) {
      const { messages, context, params } = this.getContextAndMessagesToPrint(args.slice(0, -1))
      return {
        messages,
        context,
        stack: trailingArg as string,
        params,
      }
    }

    const { messages, context, params } = this.getContextAndMessagesToPrint(args)
    if (messages?.length <= 1) {
      return { messages, context, params }
    }
    const lastElement = messages[messages.length - 1]
    const isStack = isString(lastElement)
    if (!isStack && !isUndefined(lastElement)) {
      return { messages, context, params }
    }
    return {
      stack: lastElement,
      messages: messages.slice(0, messages.length - 1),
      context,
      params,
    }
  }

  protected isStackFormat(stack: unknown) {
    if (!isString(stack) && !isUndefined(stack)) {
      return false
    }

    return /^(.)+\n\s+at .+:\d+:\d+/.test(stack!)
  }

  protected getColorByLogLevel(level: LogLevel) {
    switch (level) {
      case 'debug':
        return clc.magentaBright
      case 'warn':
        return clc.yellow
      case 'error':
        return clc.red
      case 'verbose':
        return clc.cyanBright
      case 'fatal':
        return clc.bold
      default:
        return clc.green
    }
  }
}
