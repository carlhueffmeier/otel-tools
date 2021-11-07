import { SpanStatusCode, Tracer } from '@opentelemetry/api';

export interface TraceMethodOptions {
  tracer: Tracer;
  spanName?: string;
}

export function TraceMethod(options: TraceMethodOptions): MethodDecorator {
  const { tracer } = options;

  return function traceMethodDecorator(
    target: any,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<any>,
  ) {
    const originalMethod = descriptor.value;
    const spanName =
      options.spanName ??
      [target?.constructor?.name, String(propertyKey)].join('.');

    descriptor.value = traceMethod({ tracer, spanName }, originalMethod);
    Object.defineProperty(descriptor.value, 'name', { value: propertyKey });
  };
}

export function traceMethod<F extends (...args: A) => any, A extends any[]>(
  options: TraceMethodOptions,
  fn: F,
): F {
  const { tracer } = options;
  const spanName = options.spanName ?? fn.name;
  if (!spanName) {
    throw new Error('Specify spanName for anonymous function!');
  }

  const decoratedMethod = function (this: any, ...args: A): any {
    return tracer.startActiveSpan(spanName, (span) => {
      try {
        const returnValue = fn.apply(this, args);
        if (typeof returnValue.then === 'function') {
          return returnValue
            .then((resolvedValue: unknown) => {
              span.setStatus({ code: SpanStatusCode.OK });

              return resolvedValue;
            })
            .catch((error: any) => {
              span.recordException(error);
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error.message,
              });

              throw error;
            })
            .finally(() => span.end());
        } else {
          span.setStatus({ code: SpanStatusCode.OK });
          span.end();

          return returnValue;
        }
      } catch (error: any) {
        span.recordException(error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        span.end();

        throw error;
      }
    });
  };

  Object.defineProperty(decoratedMethod, 'name', { value: fn.name });

  return decoratedMethod as F;
}
