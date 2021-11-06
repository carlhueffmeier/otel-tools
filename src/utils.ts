import { trace, context, Span } from '@opentelemetry/api';

export function getActiveSpan(): Span | undefined {
  return trace.getSpan(context.active());
}
