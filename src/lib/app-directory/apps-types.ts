export type AppCategory = 
  | 'News' 
  | 'Social Media'
  | 'Entertainment'
  | 'Communication'
  | 'Gaming'
  | 'Shopping'
  | 'Travel'
  | 'Coding'
  | 'Designing'
  | 'Creating'
  | 'Other'

export const categoryEmojis: Record<AppCategory, string> = {
  'News': '📰',
  'Social Media': '📱',
  'Entertainment': '🎬',
  'Communication': '💬',
  'Gaming': '🎮',
  'Shopping': '🛍️',
  'Travel': '✈️',
  'Coding': '💻',
  'Designing': '🎨',
  'Creating': '🪄',
  'Other': '⚙️'
}

export type ActivityRating = 'Consuming' | 'Creating' | 'Neutral'

// Base interface for common properties
export interface BaseAppDefinition {
  category: AppCategory
  defaultRating: ActivityRating
  icon: string
}

// Website-specific interface
export interface WebsiteDefinition extends BaseAppDefinition {
  type: 'website'
  websiteUrl: string  // Required for websites
}

// Application-specific interface
export interface ApplicationDefinition extends BaseAppDefinition {
  type: 'application'
  name: string  // Required for applications
}

// Union type of both possibilities
export type AppDefinition = WebsiteDefinition | ApplicationDefinition
