import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

export const getRandomColor = (): string => {
  const hue = Math.floor(Math.random() * 360);
  const saturation = Math.floor(Math.random() * 100) + 1;
  const lightness = Math.floor(Math.random() * 100) + 1;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};
