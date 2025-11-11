import { HttpErrorResponse } from '@angular/common/http';

interface ApiErrorResponse {
  message?: unknown;
  title?: unknown;
  detail?: unknown;
  Message?: unknown;
  errors?: Record<string, unknown> | undefined;
  errorDetails?: unknown[];
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const extractFromIndexedErrors = (errors: Record<string, unknown> | undefined): string | null => {
  if (!errors) {
    return null;
  }

  for (const key of Object.keys(errors)) {
    const candidate = errors[key];
    if (isNonEmptyString(candidate)) {
      return candidate;
    }

    if (Array.isArray(candidate)) {
      const firstItem = candidate.find((item) => isNonEmptyString(item));
      if (isNonEmptyString(firstItem)) {
        return firstItem;
      }
    }
  }

  return null;
};

const extractFromErrorDetails = (details: unknown[] | undefined): string | null => {
  if (!details || details.length === 0) {
    return null;
  }

  for (const item of details) {
    if (!item || typeof item !== 'object') {
      if (isNonEmptyString(item)) {
        return item.trim();
      }
      continue;
    }

    const candidate = (item as { errorMessage?: unknown }).errorMessage;
    if (isNonEmptyString(candidate)) {
      return candidate.trim();
    }
  }

  return null;
};

/**
 * Extracts a human readable error message from various error shapes returned by auth endpoints.
 */
export const extractAuthErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Unable to reach the server. Please check your connection and try again.';
    }

    const apiError = error.error as ApiErrorResponse | string | undefined;

    if (isNonEmptyString(apiError)) {
      return apiError.trim();
    }

    if (apiError && typeof apiError === 'object') {
      const fromErrorDetails = extractFromErrorDetails(apiError.errorDetails);
      if (fromErrorDetails) {
        return fromErrorDetails;
      }

      const fromErrorsBag = extractFromIndexedErrors(apiError.errors);
      if (fromErrorsBag) {
        return fromErrorsBag;
      }

      const messageFromBody = apiError.message ?? apiError.detail ?? apiError.Message;
      if (isNonEmptyString(messageFromBody)) {
        return messageFromBody.trim();
      }

      const title = apiError.title;
      if (isNonEmptyString(title)) {
        return title.trim();
      }
    }

    if (isNonEmptyString(error.message)) {
      return error.message.trim();
    }
  }

  if (isNonEmptyString((error as { message?: unknown })?.message)) {
    return ((error as { message?: unknown }).message as string).trim();
  }

  if (isNonEmptyString(error)) {
    return (error as string).trim();
  }

  return fallback;
};
