import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** The class helper Magic UI and shadcn components expect at "@/lib/utils". */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
