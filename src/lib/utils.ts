import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

export const getRandomColor = (): string => {
  const hue = Math.floor(Math.random() * 360);

  // Ensure saturation is at least 50% to avoid pale colors
  const saturation = Math.floor(Math.random() * 50) + 50; // Range: 50% - 100%

  // Ensure lightness is between 30% and 70% to avoid very dark or very light colors
  const lightness = Math.floor(Math.random() * 40) + 30; // Range: 30% - 70%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

export function mergeRefs<T>(...refs: React.Ref<T>[]): React.RefCallback<T> {
  return (value: T | null) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") {
        ref(value);
      } else if (ref != null) {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    });
  };
}

export const createBlobUrl = (file: File) => {
  const blob = new Blob([file], { type: file.type });
  return URL.createObjectURL(blob);
};
