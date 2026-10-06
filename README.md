# @lyohaplotinka/nestjs-standalone-logger

Standalone logger extracted from [NestJS](https://nestjs.com) and decoupled from the framework — zero NestJS dependencies, works in any Node.js or Bun project.

## Features

- **`Logger`** — the familiar NestJS logger facade with static and instance methods (`log`, `error`, `warn`, `debug`, `verbose`, `fatal`).
- **`ConsoleLogger`** — a fully self-contained console logger implementation with:
  - colored output (respecting TTY / `FORCE_COLOR` / `NO_COLOR`),
  - optional timestamps, process ID prefix and context tag,
  - built-in **JSON mode** for structured logging,
  - log level filtering (`fatal | error | warn | log | debug | verbose`).
- **`Logger.overrideLogger()`** — swap the global logger with your own implementation (e.g. extend `ConsoleLogger`).
- **`Logger.attachBuffer()` / `Logger.flush()`** — buffer logs during bootstrap and print them once the app is ready.

## Install

```bash
bun add @lyohaplotinka/nestjs-standalone-logger
# or
npm install @lyohaplotinka/nestjs-standalone-logger
```

## Usage

### Default logging

```ts
import { Logger } from '@lyohaplotinka/nestjs-standalone-logger'

Logger.log('Application bootstrap started')

const logger = new Logger('UserService')
logger.log('user created', { userId: 42 })
logger.warn('deprecated method used')
```

### ConsoleLogger options

```ts
import { ConsoleLogger } from '@lyohaplotinka/nestjs-standalone-logger'

const logger = new ConsoleLogger('Orders', {
  logLevels: ['error', 'warn', 'log'], // level filter
  timestamp: true, // print time delta between messages
  prefix: 'MyApp', // process name prefix (default "App")
  json: false, // structured JSON output
})
logger.debug('hidden') // filtered out by logLevels
```

Available `ConsoleLoggerOptions`:

| Option       | Type         | Default              | Description                                                            |
| ------------ | ------------ | -------------------- | ---------------------------------------------------------------------- |
| `logLevels`  | `LogLevel[]` | all levels           | Enabled log levels.                                                    |
| `timestamp`  | `boolean`    | `false`              | Print time difference between current and previous message.            |
| `prefix`     | `string`     | `"App"`              | Prefix shown before the PID. Not used in JSON mode.                    |
| `json`       | `boolean`    | `false`              | Emit single-line JSON objects instead of colored text.                 |
| `colors`     | `boolean`    | `true` unless `json` | Enable ANSI colors.                                                    |
| `spreadJson` | `boolean`    | `false`              | Spread extra params into the root JSON object instead of `params` key. |

### Override the global logger

```ts
import { Logger, ConsoleLogger } from '@lyohaplotinka/nestjs-standalone-logger'

class MyLogger extends ConsoleLogger {
  override log(message: any, ...params: any[]) {
    super.log(`[MY] ${message}`, ...params)
  }
}

Logger.overrideLogger(new MyLogger())
Logger.log('this goes through MyLogger')

// or reduce levels globally:
Logger.overrideLogger(['error', 'warn'])
```

> Note: extending `Logger` directly is not allowed — extend `ConsoleLogger` instead (same rule as in NestJS).

### Buffer logs during bootstrap

```ts
import { Logger } from '@lyohaplotinka/nestjs-standalone-logger'

Logger.attachBuffer()
Logger.log('this is buffered and printed only after flush()')

// ... app initialization ...

Logger.flush() // prints buffered messages and detaches the buffer
```

### JSON mode

```ts
import { ConsoleLogger } from '@lyohaplotinka/nestjs-standalone-logger'

const jsonLogger = new ConsoleLogger({ json: true, context: 'API' })
jsonLogger.log('json mode', { requestId: 'abc' })
// {"level":"log","pid":42488,"timestamp":1791278030583,"message":"json mode","context":"API","params":{"requestId":"abc"}}
```

## API overview

### `Logger`

- `new Logger(context?, options?)` — instance logger with a context tag.
- `logger.log/error/warn/debug/verbose/fatal(message, ...params)` — instance methods.
- `Logger.log/error/warn/debug/verbose/fatal(...)` — static methods (use the global logger).
- `Logger.overrideLogger(logger: LoggerService | LogLevel[] | boolean)` — set a custom logger, level list, or disable logging.
- `Logger.attachBuffer()` / `Logger.detachBuffer()` / `Logger.flush()` — startup log buffering.
- `Logger.isLevelEnabled(level)` — check whether a level passes the current filter.
- `Logger.getTimestamp()` — formatted timestamp used by the console logger.

### `ConsoleLogger`

- `new ConsoleLogger(contextOrOptions?, options?)` — accepts a context string and/or an options object.
- `log/error/warn/debug/verbose/fatal` + `setLogLevels(levels)` — implements the `LoggerService` interface.

### `LoggerService`

Minimal contract for custom loggers:

```ts
interface LoggerService {
  log(message: any, ...optionalParams: any[]): any
  error(message: any, ...optionalParams: any[]): any
  warn(message: any, ...optionalParams: any[]): any
  debug?(message: any, ...optionalParams: any[]): any
  verbose?(message: any, ...optionalParams: any[]): any
  fatal?(message: any, ...optionalParams: any[]): any
  setLogLevels?(levels: LogLevel[]): any
}
```

## Development

```bash
bun install
bun run typecheck    # tsc --noEmit
bun run build        # build ESM + CJS + .d.ts into dist/ (tsdown)
bun ./example.ts # run the demo
```

## License

MIT
