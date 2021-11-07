# OpenTelemetry Tools

Contains useful tools and utilities for instrumenting an application with [OpenTelemetry](https://opentelemetry.io/).

## Getting Started

```sh
npm install otel-tools
```

If you're just getting started with OpenTelemetry, here are some great resources:

- [OpenTelemetry API for JavaScript Documentation](https://open-telemetry.github.io/opentelemetry-js-api/)
- [OpenTelemetry Node.JS Getting Started Guide](https://opentelemetry.io/docs/js/getting-started/nodejs/)
- [otel-node-basics](https://github.com/tedsuo/otel-node-basics): Example project to learn about how to setup OpenTelemetry with [Lightstep](https://lightstep.com/)

## API

### `TraceMethod` decorator

Can be used to annotate synchronous and asynchronous class methods.
A span will be started for the decorated method and ended when the method finishes or resolves.
In case an error occurs, the error info will be attached to the span.
By default the name will be `ClassName.methodName` (e.g. `NoteService.findAllNotes`), but it can also be specified passing the `name` option.

```ts
import { TraceMethod, getActiveSpan } from 'otel-tools';

const tracer = trace.getTracer('notes-api');

export class NoteService {
  private db: DB;

  constructor() {
    this.db = new DB();
  }

  @TraceMethod({ tracer })
  async findAllNotes() {
    return await this.db.query('select * from notes');
  }

  @TraceMethod({ tracer, name: 'NoteService.findById' })
  async findOneNote(id: number) {
    return await this.db.query('select * from notes where id=:id', id);
  }
}
```

A simple wrapper is available in case you need to annotate functions which are not class methods.

```ts
import { traceMethod } from 'otel-tools';

const asyncTracedFunction = traceMethod(
  { tracer },
  async function asyncFunction(data: Record<string, string>): Promise<any> {
    // do something cool
  },
);
```
