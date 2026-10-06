import { Logger, ConsoleLogger } from './src/index'

// 1) Default usage
Logger.log('Application bootstrap started')
const logger = new Logger('UserService')
logger.log('user created', { userId: 42 })
logger.warn('deprecated method used')

// 2) Instance with options
const custom = new Logger('Orders', { timestamp: true })
custom.debug('debug message')
custom.error(new Error('boom').stack ?? 'no stack')

// 3) Override globally with your own implementation
class MyLogger extends ConsoleLogger {
  override log(message: any, ...params: any[]) {
    super.log(`[MY] ${message}`, ...params)
  }
}
Logger.overrideLogger(new MyLogger({ prefix: 'MyApp' }))
Logger.log('this goes through MyLogger')

// 4) Buffering startup logs
Logger.attachBuffer()
Logger.log('buffered 1')
Logger.warn('buffered 2')
Logger.flush() // prints both, detaches buffer

// 5) JSON output
const jsonLogger = new ConsoleLogger({ json: true, context: 'API' })
jsonLogger.log('json mode', { requestId: 'abc' })
