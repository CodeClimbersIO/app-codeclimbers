import * as React from 'react'
import { Check, Plus } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils/tailwind.util'
import { AppCategory, categoryEmojis } from '@/lib/app-directory/apps-types'
import { useEffect, useRef, useState } from 'react'
import { MonitorApi } from '../api/monitorApi/monitorApi'
import { App } from '../db/monitor/appRepo'
import { AppIcon } from './AppIcon'
import { Tag } from '../db/monitor/tagRepo'
import { Button } from '@/components/ui/button'
import { DifficultySelector } from '@/components/difficulty-selector'
import { CategoryTooltip } from './CategoryTooltip'
import { PaywallDialog } from './PaywallDialog'
import { usePermissions } from '@/hooks/usePermissions'

interface CategoryOption {
  type: 'category'
  category: AppCategory
  tag: Tag
  count: number
}

interface AppOption {
  type: 'app'
  app: App
}

interface CustomWebsiteOption {
  type: 'custom'
  url: string
}

export type SearchOption = AppOption | CategoryOption | CustomWebsiteOption

interface AppSelectorProps {
  placeholder?: string
  emptyText?: string
  maxItems?: number
  selectedApps: SearchOption[]
  currentCategory?: string
  excludedCategories?: AppCategory[]
  onAppSelect: (option: SearchOption) => void
  onAppRemove: (option: SearchOption) => void
  isAllowList?: boolean
  onIsAllowListChange?: (value: boolean) => void
  difficulty?: 'easy' | 'medium' | 'hard' | null
  onDifficultyChange?: (value: 'easy' | 'medium' | 'hard') => void
}

const CATEGORY_ORDER: Record<AppCategory, number> = {
  'social media': 1,
  'communication': 2,
  'entertainment': 3,
  'gaming': 4,
  'shopping': 5,
  'news': 6,
  'travel': 7,
  'coding': 8,
  'designing': 9,
  'writing': 10,
  'photo/video': 11,
  'music/sound': 12,
  'data/analytics': 13,
  'learning': 14,
  'ai': 15,
  'browser': 16,
  'utilities': 17
}

const getOptionDetails = (option: SearchOption) => {
  if (option.type === 'app') {
    if (!option.app.is_browser) {
      return { text: option.app.name, key: `app-${option.app.app_external_id}` }
    }
    return { text: option.app.app_external_id, key: `app-${option.app.app_external_id}` }
  }
  if (option.type === 'custom') {
    return { text: option.url, key: `custom-${option.url}` }
  }
  if ('category' in option && 'count' in option) {
    return {
      text: `${option.category} (${option.count})`,
      key: `cat-${option.category}`
    }
  }
  return { text: '', key: '' }
}

export function AppSelector({
  placeholder = 'Search apps & websites...',
  emptyText = 'Enter full URL to add website',
  maxItems = 5,
  selectedApps,
  excludedCategories = [
    'ai',
    'browser',
    'coding',
    'data/analytics',
    'designing',
    'learning',
    'music/sound',
    'photo/video',
    'utilities',
    'writing'
  ],
  onAppSelect,
  onAppRemove,
  isAllowList = false,
  onIsAllowListChange,
  difficulty,
  onDifficultyChange
}: AppSelectorProps) {
  const { canUseAllowList, canUseHardDifficulty } = usePermissions()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState(0)
  const [apps, setApps] = useState<AppOption[]>([])
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([])
  const handleClose = () => {
    setOpen(false)
    setSearch('')
  }


  useEffect(() => {
    const init = async () => {
      const [apps, tags] = await Promise.all([
        MonitorApi.getApps(),
        MonitorApi.getTagsByType('category')
      ])
      const categoryOptionsFiltered = tags
        .filter(tag => !excludedCategories.includes(tag.name as AppCategory))
        .map(tag => ({
          type: 'category',
          category: tag.name as AppCategory,
          tag,
          count: apps.filter(app => app.category_tag?.tag_name === tag.name).length
        } as CategoryOption))
      setApps(apps.map(app => ({ type: 'app', app: app })))
      setCategoryOptions(categoryOptionsFiltered)
    }
    init()
  }, [])

  useEffect(() => {
    if (!open) {
      setSearch('')
    }
  }, [open])

  // Update filtered apps to include categories
  const filteredOptions = React.useMemo(() => {
    const searchLower = search.toLowerCase()

    if (!search) {
      return categoryOptions
        .filter(cat => !selectedApps.some(selected =>
          'category' in selected && selected.category === cat.category
        ))
        .sort((a, b) => {
          const orderA = CATEGORY_ORDER[a.category] || Number.MAX_VALUE
          const orderB = CATEGORY_ORDER[b.category] || Number.MAX_VALUE
          return orderA - orderB
        })
    }

    let results: SearchOption[] = categoryOptions
      .filter(cat =>
        cat.category.toLowerCase().includes(searchLower) &&
        !selectedApps.some(selected =>
          'category' in selected && selected.category === cat.category
        )
      )

    // Modified to only check for exact duplicates of the same app/website, not category
    results = results.concat(
      apps.filter(option => {
        const isDuplicate = selectedApps.some(selected => {
          if (option.type === 'app' && selected.type === 'app') {
            if (!option.app.is_browser && !selected.app.is_browser) {
              return option.app.name === selected.app.name
            }
            if (option.app.is_browser && selected.app.is_browser) {
              return option.app.app_external_id === selected.app.app_external_id
            }
          }
          return false
        })

        if (isDuplicate) return false

        if (option.type === 'app' && !option.app.is_browser) {
          return option.app.name.toLowerCase().includes(searchLower)
        }
        if (option.type === 'app' && option.app.is_browser) {
          return option.app.app_external_id.toLowerCase().includes(searchLower)
        }
      })
    )

    // Check if the search term looks like a URL and isn't already in the results
    const isValidUrl = (url: string) => {
      try {
        // Simple check for URL format (has domain-like structure)
        return /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(url)
      } catch {
        return false
      }
    }

    // Check if the search term might be a website
    const mightBeWebsite = search.includes('.') || search.includes('://')

    // Add custom website option if search looks like a URL and not already in results
    const customUrlAlreadyExists = results.some(option =>
      (option.type === 'app' && option.app.is_browser && option.app.app_external_id.toLowerCase() === searchLower) ||
      (option.type === 'custom' && option.url.toLowerCase() === searchLower)
    )

    // Check if the search term is already selected
    const alreadySelected = selectedApps.some(selected =>
      (selected.type === 'app' && selected.app.is_browser && selected.app.app_external_id.toLowerCase() === searchLower) ||
      (selected.type === 'custom' && selected.url.toLowerCase() === searchLower)
    )

    // Add custom website option if appropriate - use isValidUrl for better validation
    if (search && (isValidUrl(search) || mightBeWebsite) && !customUrlAlreadyExists && !alreadySelected) {
      results.push({
        type: 'custom',
        url: search
      })
    }

    return results
      .sort((a, b) => {
        const aStr = getOptionDetails(a).text.toLowerCase()
        const bStr = getOptionDetails(b).text.toLowerCase()

        if (a.type === 'custom') return 1
        if (b.type === 'custom') return -1

        const aStartsWith = aStr.startsWith(searchLower)
        const bStartsWith = bStr.startsWith(searchLower)

        if (aStartsWith && !bStartsWith) return -1
        if (!aStartsWith && bStartsWith) return 1
        return 0
      })
      .slice(0, maxItems)
  }, [search, maxItems, categoryOptions, selectedApps, apps])

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        handleClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return

    if ((e.key === 'Backspace' || e.key === 'Delete') && search === '' && selectedApps.length > 0) {
      e.preventDefault()
      onAppRemove(selectedApps[selectedApps.length - 1])
      return
    }

    if (filteredOptions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((s) => (s + 1) % filteredOptions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((s) => (s - 1 + filteredOptions.length) % filteredOptions.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleSelect(filteredOptions[selected])
    }
  }

  React.useEffect(() => {
    setSelected(0)
  }, [filteredOptions])

  const handleSelect = async (option: SearchOption) => {
    const { key } = getOptionDetails(option)

    if (option.type === 'custom') {
      const customAppId = await MonitorApi.createApp(option.url, true)
      const customApp: AppOption = {
        type: 'app',
        app: {
          id: customAppId,
          name: option.url,
          app_external_id: option.url,
          is_browser: 1,
        }
      }

      onAppSelect(customApp)
      setSearch('')
      setSelected(0)
      return
    }

    if (option.type === 'app') {
      const category = option.app.category_tag?.tag_name
      const categoryAlreadySelected = selectedApps.some(selected =>
        'category' in selected && selected.category === category
      )

      if (categoryAlreadySelected) {
        const exactDuplicate = selectedApps.find(selected =>
          'type' in selected && 'type' in option &&
          getOptionDetails(selected).key === key
        )

        if (!exactDuplicate) {
          onAppSelect(option)
        }
        setSearch('')
        setSelected(0)
        return
      }
    }

    if ('category' in option) {
      const categoryExists = selectedApps.some(selected =>
        'category' in selected && selected.category === option.category
      )

      if (!categoryExists) {
        onAppSelect(option)
      }
    } else {
      const exactDuplicate = selectedApps.find(selected =>
        'type' in selected && 'type' in option &&
        getOptionDetails(selected).key === key
      )

      if (!exactDuplicate) {
        onAppSelect(option)
      }
    }

    setSearch('')
    setSelected(0)
  }

  const isAlreadySelected = (searchTerm: string): { isSelected: boolean; message?: string } => {
    const searchLower = searchTerm.toLowerCase()

    const directMatch = selectedApps.some(selected =>
      getOptionDetails(selected).text.toLowerCase().includes(searchLower)
    )
    if (directMatch) {
      return { isSelected: true, message: 'Already added' }
    }

    const searchMatchingApp = apps.find(app => {
      const appText = app.type === 'app' ? app.app.name : app.app.app_external_id
      return appText.toLowerCase().includes(searchLower)
    })

    if (searchMatchingApp) {
      const selectedCategory = selectedApps.find(selected =>
        'category' in selected && selected.category === searchMatchingApp.app.category_tag?.tag_name
      )

      if (selectedCategory && selectedCategory.type === 'app') {
        return {
          isSelected: true,
          message: `Already included in ${selectedCategory.app.category_tag?.tag_name} list`
        }
      }
    }

    return { isSelected: false }
  }

  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Only handle Delete or Backspace when not in an input field
      if ((e.key === 'Delete' || e.key === 'Backspace') &&
        selectedApps.length > 0 &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        onAppRemove(selectedApps[selectedApps.length - 1])
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [selectedApps, onAppRemove])

  const getCurrentCategoryCount = (category: AppCategory): number => {
    const categoryData = categoryOptions.find(catOpt => catOpt.category === category)
    return categoryData?.count ?? 0
  }

  const handleDifficultyChange = (value: 'easy' | 'medium' | 'hard') => {
    if (value === 'hard' && !canUseHardDifficulty) {
      return
    }
    onDifficultyChange?.(value)
  }

  const handleAllowListChange = (value: boolean) => {
    if (value && !canUseAllowList) {
      return
    }
    onIsAllowListChange?.(value)
  }

  const renderCommandContent = filteredOptions.length === 0 ? (
    <CommandEmpty>
      {search && isAlreadySelected(search).isSelected
        ? isAlreadySelected(search).message
        : emptyText}
    </CommandEmpty>
  ) : (
    <CommandGroup>
      {filteredOptions.map((option, index) => (
        <CategoryTooltip
          key={getOptionDetails(option).key}
          option={option}
          apps={apps.map(app => app.app)}
          side="right"
          align="start"
        >
          <div>
            <CommandItem
              onSelect={() => handleSelect(option)}
              className={cn(index === selected && 'bg-accent text-accent-foreground')}
            >
              <Check className={cn(
                'mr-1 h-4 w-4',
                index === selected ? 'opacity-100' : 'opacity-0'
              )} />
              <span className="w-6 h-6 flex items-center justify-center mr-1">
                {option.type === 'app' ? (
                  <AppIcon app={option.app} />
                ) : option.type === 'custom' ? (
                  <Plus className="h-4 w-4" />
                ) : (
                  categoryEmojis[option.category as AppCategory]
                )}
              </span>
              {option.type === 'custom' ? (
                <span>Add custom website: <span className="font-semibold">{option.url}</span></span>
              ) : (
                getOptionDetails(option).text
              )}
            </CommandItem>
          </div>
        </CategoryTooltip>
      ))}
    </CommandGroup>
  )

  return (
    <div className="relative w-full" ref={inputRef}>
      <div className="relative min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        onClick={() => setOpen(true)}>
        <div className="flex flex-wrap gap-2 items-start pb-12">
          {selectedApps.map((option) => {
            const key = getOptionDetails(option).key
            const isCategory = 'category' in option && 'count' in option
            return (
              <CategoryTooltip
                key={key}
                option={option}
                onRemove={onAppRemove}
                categoryCount={isCategory ? getCurrentCategoryCount(option.category) : undefined}
                apps={apps.map(app => app.app)}
                delayDuration={400}
              />
            )
          })}

          <div className="relative flex-1 min-w-[200px]">
            <input
              placeholder={placeholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
              className="w-full outline-none border-0 bg-transparent focus:border-0 focus:outline-none focus:ring-0 p-0"
            />
            {open && (
              <Command className="absolute left-0 top-full z-50 w-[280px] rounded-md border bg-popover shadow-md h-fit mt-2">
                <CommandList className="max-h-[300px] overflow-y-auto">
                  {renderCommandContent}
                </CommandList>
              </Command>
            )}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between items-center gap-1 pt-2 px-3 pb-2 border-t"
          onClick={(e) => e.stopPropagation()}>
          {onDifficultyChange && (
            <DifficultySelector
              value={difficulty || null}
              onChange={handleDifficultyChange}
              disabledOptions={!canUseHardDifficulty ? ['hard'] : []}
            />
          )}
          
          {onIsAllowListChange && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-6 px-2 text-xs text-muted-foreground/80 hover:text-foreground',
                  !isAllowList && 'bg-muted/50'
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  handleAllowListChange(false)
                }}
              >
                Block
              </Button>

              {!canUseAllowList ? (
                <PaywallDialog>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-6 px-2 text-xs text-muted-foreground/80 hover:text-foreground',
                      isAllowList && 'bg-muted/50'
                    )}
                  >
                    Allow
                  </Button>
                </PaywallDialog>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-6 px-2 text-xs text-muted-foreground/80 hover:text-foreground',
                    isAllowList && 'bg-muted/50'
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAllowListChange(true)
                  }}
                >
                  Allow
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
