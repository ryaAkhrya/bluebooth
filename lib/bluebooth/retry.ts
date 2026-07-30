export async function withBoundedRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: {
    attempts?: number
    delays?: readonly number[]
    wait?: (milliseconds: number) => Promise<void>
  } = {},
): Promise<T> {
  const attempts = Math.max(1, Math.min(5, options.attempts ?? 3))
  const delays = options.delays ?? [250, 750]
  const wait =
    options.wait ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)))
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation(attempt)
    } catch (error) {
      lastError = error
      if (attempt + 1 < attempts) {
        await wait(delays[Math.min(attempt, delays.length - 1)] ?? 0)
      }
    }
  }
  throw lastError
}
