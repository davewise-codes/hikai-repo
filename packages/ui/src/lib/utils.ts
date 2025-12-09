import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ 'text-fontSize': ['xs', 'sm', 'base', 'lg', 'title'] }]
    }
  }
})

export function cn(...inputs: ClassValue[]) {
  return customTwMerge(clsx(inputs))
}
