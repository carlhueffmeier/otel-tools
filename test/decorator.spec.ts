import { Span, SpanStatusCode, Tracer } from '@opentelemetry/api';
import { TraceMethod } from '../src';

const mockTracer: jest.Mocked<Tracer> = {
  startSpan: jest.fn(),
  startActiveSpan: jest.fn(),
};

class TargetClass {
  @TraceMethod({ tracer: mockTracer })
  syncAdd(a: number, b: number): number {
    return a + b;
  }

  @TraceMethod({ tracer: mockTracer })
  async asyncAdd(a: number, b: number): Promise<number> {
    return a + b;
  }

  @TraceMethod({ tracer: mockTracer })
  syncThrow(errorMessage = 'error'): void {
    throw new Error(errorMessage);
  }

  @TraceMethod({ tracer: mockTracer })
  async asyncThrow(errorMessage = 'error'): Promise<void> {
    throw new Error(errorMessage);
  }
}

const mockSpan: jest.Mocked<
  Pick<Span, 'end' | 'setStatus' | 'recordException'>
> = {
  end: jest.fn(),
  recordException: jest.fn(),
  setStatus: jest.fn(),
};

describe('@TraceMethod decorator', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockTracer.startActiveSpan.mockImplementation((name: string, fn: any) =>
      fn(mockSpan),
    );
  });

  it('should return function value, given no error', () => {
    const target = new TargetClass();

    const result = target.syncAdd(1, 1);

    expect(result).toBe(2);
  });

  it('should set correct span status, given no error', () => {
    const target = new TargetClass();

    target.syncAdd(1, 1);

    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.OK,
    });
    expect(mockSpan.setStatus).toHaveBeenCalledTimes(1);
    expect(mockSpan.end).toHaveBeenCalledTimes(1);
  });

  it('should set correct span name, given no name argument', () => {
    const target = new TargetClass();

    target.syncAdd(1, 1);

    expect(mockTracer.startActiveSpan).toHaveBeenCalledWith(
      `${target.constructor.name}#${target.syncAdd.name}`,
      expect.any(Function),
    );
  });

  it('should throw error, given exception in sync method', () => {
    const target = new TargetClass();
    const expectedErrorMessage = 'expected error message';

    expect(() => {
      target.syncThrow(expectedErrorMessage);
    }).toThrow(new Error(expectedErrorMessage));
  });

  it('should record error, given exception in sync method', () => {
    const target = new TargetClass();
    const expectedErrorMessage = 'expected error message';

    expect(() => target.syncThrow(expectedErrorMessage)).toThrow();
    expect(mockSpan.recordException).toHaveBeenLastCalledWith(
      new Error(expectedErrorMessage),
    );
    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: expectedErrorMessage,
    });
    expect(mockSpan.end).toHaveBeenCalledTimes(1);
  });

  it('should resolve correctly, given async method', async () => {
    const target = new TargetClass();

    const result = await target.asyncAdd(1, 1);

    expect(result).toBe(2);
  });

  it('should set span status correctly, given async method without error', async () => {
    const target = new TargetClass();

    await target.asyncAdd(1, 1);

    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.OK,
    });
    expect(mockSpan.setStatus).toHaveBeenCalledTimes(1);
    expect(mockSpan.end).toHaveBeenCalledTimes(1);
  });

  it('should record error, given exception in async method', async () => {
    const target = new TargetClass();
    const expectedErrorMessage = 'expected error message';

    await expect(target.asyncThrow(expectedErrorMessage)).rejects.toEqual(
      new Error(expectedErrorMessage),
    );

    expect(mockSpan.recordException).toHaveBeenLastCalledWith(
      new Error(expectedErrorMessage),
    );
    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: expectedErrorMessage,
    });
    expect(mockSpan.end).toHaveBeenCalledTimes(1);
  });
});
