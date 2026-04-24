type RequestError = Error & {
  payload?: unknown
  status?: number
}

type FetchJsonWithRetryInit = RequestInit & {
  retries?: number
  retryDelayMs?: number
  timeoutMs?: number
}

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504])

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildRequestError(
  message: string,
  extras: Partial<RequestError> = {}
): RequestError {
  const error = new Error(message) as RequestError
  Object.assign(error, extras)
  return error
}

function shouldRetry(error: RequestError) {
  return (
    error.name === 'AbortError' ||
    error instanceof TypeError ||
    (typeof error.status === 'number' &&
      RETRYABLE_STATUS_CODES.has(error.status))
  )
}

export async function fetchJsonWithRetry<T>(
  url: string,
  init: FetchJsonWithRetryInit = {}
): Promise<T> {
  const {
    retries = 1,
    retryDelayMs = 1500,
    timeoutMs = 60000,
    ...requestInit
  } = init

  let lastError: RequestError | null = null

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        ...requestInit,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || ''
        const payload = contentType.includes('application/json')
          ? await response.json().catch(() => null)
          : await response.text().catch(() => '')

        const message =
          (payload &&
            typeof payload === 'object' &&
            'error' in payload &&
            typeof payload.error === 'string' &&
            payload.error) ||
          (payload &&
            typeof payload === 'object' &&
            'message' in payload &&
            typeof payload.message === 'string' &&
            payload.message) ||
          (payload &&
            typeof payload === 'object' &&
            'detail' in payload &&
            typeof payload.detail === 'string' &&
            payload.detail) ||
          (typeof payload === 'string' && payload.trim()) ||
          `Server error (${response.status})`

        throw buildRequestError(message, {
          name: 'HttpError',
          payload,
          status: response.status,
        })
      }

      return (await response.json()) as T
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof DOMException && error.name === 'AbortError') {
        lastError = buildRequestError(
          'The request took too long. Please try again.',
          { name: 'AbortError' }
        )
      } else if (error instanceof Error) {
        lastError = error as RequestError
      } else {
        lastError = buildRequestError('Unexpected request failure.')
      }

      if (attempt < retries && shouldRetry(lastError)) {
        await sleep(retryDelayMs * (attempt + 1))
        continue
      }

      throw lastError
    }
  }

  throw lastError ?? buildRequestError('Unexpected request failure.')
}
