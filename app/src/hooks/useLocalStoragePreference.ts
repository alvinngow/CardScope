"use client";

import { useCallback, useSyncExternalStore } from "react";

type ParsePreference<T> = (storedValue: string | null) => T | null;

type LocalStoragePreferenceOptions<T> = {
  fallback: T;
  key: string;
  parse: ParsePreference<T>;
  serialize?: (value: T) => string;
};

const memoryPreferences = new Map<string, string>();

export function useLocalStoragePreference<T>({
  fallback,
  key,
  parse,
  serialize = String,
}: LocalStoragePreferenceOptions<T>) {
  const eventName = preferenceEventName(key);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      function handlePreferenceChange() {
        onStoreChange();
      }

      function handleStorage(event: StorageEvent) {
        if (event.key === key || event.key === null) {
          memoryPreferences.delete(key);
          onStoreChange();
        }
      }

      window.addEventListener(eventName, handlePreferenceChange);
      window.addEventListener("storage", handleStorage);

      return () => {
        window.removeEventListener(eventName, handlePreferenceChange);
        window.removeEventListener("storage", handleStorage);
      };
    },
    [eventName, key],
  );

  const getSnapshot = useCallback(
    () => readPreference({ fallback, key, parse }),
    [fallback, key, parse],
  );
  const value = useSyncExternalStore(subscribe, getSnapshot, () => fallback);

  const setValue = useCallback(
    (nextValue: T) => {
      const serializedValue = serialize(nextValue);

      memoryPreferences.set(key, serializedValue);

      try {
        localStorage.setItem(key, serializedValue);
      } catch {
        // Keep the in-page preference even when browser storage is unavailable.
      }

      window.dispatchEvent(new Event(eventName));
    },
    [eventName, key, serialize],
  );

  return [value, setValue] as const;
}

function readPreference<T>({
  fallback,
  key,
  parse,
}: Pick<LocalStoragePreferenceOptions<T>, "fallback" | "key" | "parse">) {
  const memoryValue = memoryPreferences.get(key);

  if (memoryValue !== undefined) {
    return parse(memoryValue) ?? fallback;
  }

  try {
    return parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function preferenceEventName(key: string) {
  return `cardscope-local-storage:${key}`;
}
