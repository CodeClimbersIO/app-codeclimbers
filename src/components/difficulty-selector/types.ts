export type Difficulty = 'easy' | 'medium' | 'hard' | null
export type DifficultyValue = 'easy' | 'medium' | 'hard'

export interface DifficultyOption {
  value: DifficultyValue
  label: string
  color: string
  description: string
  level: 1 | 2 | 3
} 
