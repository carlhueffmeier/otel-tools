import { SpanStatusCode, Tracer } from '@opentelemetry/api';

export function TraceMethod(options: {
  tracer: Tracer;
  spanName?: string;
}): MethodDecorator {
  const { tracer } = options;

  return function traceMethodDecorator(
    target: any,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<any>,
  ) {
    const originalMethod = descriptor.value;
    const spanName =
      options.spanName ??
      [target?.constructor?.name, String(propertyKey)].join('#');

    descriptor.value = function (...args: any[]) {
      return tracer.startActiveSpan(spanName, (span) => {
        try {
          const returnValue = originalMethod.apply(this, args);
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

    // Set the method name to the original method name
    Object.defineProperty(descriptor.value, 'name', {
      value: propertyKey,
    });
  };
}
