import type { GroceryItem } from '../types/recipe'
import { normalizeDisplayName } from './text'
import { normalizeIngredientUnit } from './recipeFormatting'

export const getGroceryKey = (item: Pick<GroceryItem, 'name' | 'unit'>): string => {
  const normalizedName = normalizeDisplayName(item.name)
  const normalizedUnit = normalizeIngredientUnit(item.unit || '')
  return `${normalizedName}|${normalizedUnit || 'item'}`
}

export const mergeGroceryEntries = (items: GroceryItem[]): GroceryItem[] => {
  const merged = new Map<string, GroceryItem>()

  items.forEach((item) => {
    const key = getGroceryKey(item)
    const current = merged.get(key)
    const quantity = Number(item.quantity ?? 0) || 0
    const unit = normalizeIngredientUnit(item.unit || '') || undefined
    const source = item.source ? [...new Set(item.source)] : undefined

    if (current) {
      const combinedSources = [...new Set([...(current.source ?? []), ...(source ?? [])])]
      merged.set(key, {
        ...current,
        checked: current.checked || item.checked,
        quantity: (Number(current.quantity ?? 0) || 0) + quantity,
        unit: current.unit || unit,
        source: combinedSources.length ? combinedSources : current.source,
      })
      return
    }

    merged.set(key, {
      ...item,
      checked: Boolean(item.checked),
      quantity: quantity || 1,
      unit,
      source,
    })
  })

  return Array.from(merged.values()).map((item) => ({
    ...item,
    checked: Boolean(item.checked),
    quantity: Number(item.quantity) || 1,
    unit: normalizeIngredientUnit(item.unit || '') || undefined,
    source: item.source && item.source.length ? item.source : undefined,
  }))
}