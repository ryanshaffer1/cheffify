import { useEffect, useMemo, useState } from 'react'
import type { GroceryItem, Recipe } from '../types/recipe'
import { normalizeIngredientUnit } from '../utils/recipeFormatting'
import { getGroceryKey, mergeGroceryEntries } from '../utils/grocery'

const GROCERY_STORAGE_KEY = 'cheffify.groceryItems'
const GENERATED_STORAGE_KEY = 'cheffify.generatedGroceries'
const DEFAULT_GROCERY_ITEMS: GroceryItem[] = [
  { name: 'Tomatoes', checked: false, quantity: 2, unit: 'cups' },
  { name: 'Broccoli', checked: true, quantity: 1, unit: 'head' },
  { name: 'Chicken breast', checked: false, quantity: 2, unit: 'pieces' },
]

const readItems = (key: string, fallback: GroceryItem[]): GroceryItem[] => {
  if (typeof window === 'undefined') return fallback
  try {
    const stored = window.localStorage.getItem(key)
    return stored ? JSON.parse(stored) as GroceryItem[] : fallback
  } catch {
    return fallback
  }
}

export function useGroceries(mealPlan: Recipe[]) {
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>(() => readItems(GROCERY_STORAGE_KEY, DEFAULT_GROCERY_ITEMS))
  const [generatedGroceries, setGeneratedGroceries] = useState<GroceryItem[]>(() => readItems(GENERATED_STORAGE_KEY, []))
  const [manualItemRow, setManualItemRow] = useState({ name: '', quantity: '1', unit: '' })
  const aggregatedGroceries = useMemo(
    () => mergeGroceryEntries([...generatedGroceries, ...groceryItems]),
    [generatedGroceries, groceryItems],
  )

  useEffect(() => {
    window.localStorage.setItem(GROCERY_STORAGE_KEY, JSON.stringify(groceryItems))
  }, [groceryItems])

  useEffect(() => {
    window.localStorage.setItem(GENERATED_STORAGE_KEY, JSON.stringify(generatedGroceries))
  }, [generatedGroceries])

  const toggleGroceryItem = (itemKey: string) => {
    setGeneratedGroceries((current) => current.map((item) =>
      getGroceryKey(item) === itemKey ? { ...item, checked: !item.checked } : item))
    setGroceryItems((current) => current.map((item) =>
      getGroceryKey(item) === itemKey ? { ...item, checked: !item.checked } : item))
  }

  const clearGroceryList = () => {
    setGroceryItems([])
    setGeneratedGroceries([])
  }

  const addManualItem = () => {
    const name = manualItemRow.name.trim()
    if (!name) return

    const quantity = Number(manualItemRow.quantity)
    const normalizedQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1
    const normalizedUnit = normalizeIngredientUnit(manualItemRow.unit)
    const itemKey = getGroceryKey({ name, unit: normalizedUnit || '' })
    const manualSource = 'Manual Item'
    const generatedMatch = generatedGroceries.some((item) => getGroceryKey(item) === itemKey)

    if (generatedMatch) {
      setGeneratedGroceries((current) => current.map((item) => getGroceryKey(item) === itemKey
        ? { ...item, quantity: (Number(item.quantity ?? 0) || 0) + normalizedQuantity, source: [...new Set([...(item.source ?? []), manualSource])] }
        : item))
    } else {
      const manualMatch = groceryItems.some((item) => getGroceryKey(item) === itemKey)
      if (manualMatch) {
        setGroceryItems((current) => current.map((item) => getGroceryKey(item) === itemKey
          ? { ...item, quantity: (Number(item.quantity ?? 0) || 0) + normalizedQuantity, source: [...new Set([...(item.source ?? []), manualSource])] }
          : item))
      } else {
        setGroceryItems((current) => [...current, {
          name,
          checked: false,
          quantity: normalizedQuantity,
          unit: normalizedUnit || undefined,
          source: [manualSource],
        }])
      }
    }
    setManualItemRow({ name: '', quantity: '1', unit: '' })
  }

  const syncGroceryFromMealPlan = async () => {
    if (!mealPlan.length) {
      setGeneratedGroceries([])
      return
    }

    const payload = {
      name: 'Demo meal plan',
      recipe_ids: mealPlan.map((recipe) => recipe.id),
      servings_by_recipe: Object.fromEntries(mealPlan.map((recipe) => [String(recipe.id), recipe.servings])),
    }

    try {
      const response = await fetch('/api/meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error(`Meal plan request failed with status ${response.status}`)
      const data = await response.json()
      const items = Array.isArray(data.grocery_items) ? data.grocery_items.map((item: any) => ({
        name: item.display_name || item.normalized_name || 'Ingredient',
        checked: false,
        source: item.source_recipe_names || [],
        quantity: Number(item.quantity ?? 1),
        unit: item.unit || 'item',
      })) : []
      setGeneratedGroceries(mergeGroceryEntries(items))
    } catch {
      const merged = new Map<string, GroceryItem & { source: string[] }>()
      mealPlan.forEach((recipe) => recipe.ingredients.forEach((ingredient) => {
        const key = `${ingredient.normalized_name}:${ingredient.unit}`
        const current = merged.get(key) ?? {
          name: ingredient.display_name,
          checked: false,
          source: [],
          quantity: 0,
          unit: ingredient.unit,
        }
        current.source.push(recipe.title)
        current.quantity = Number(current.quantity) + Number(ingredient.quantity)
        current.name = ingredient.display_name
        current.unit = ingredient.unit
        merged.set(key, current)
      }))
      const items = [...merged.values()].map((item) => ({
        name: item.name,
        checked: false,
        source: item.source,
        quantity: Number(item.quantity) || 1,
        unit: item.unit || undefined,
      }))
      setGeneratedGroceries(mergeGroceryEntries(items))
    }
  }

  return {
    groceryItems,
    setGroceryItems,
    generatedGroceries,
    setGeneratedGroceries,
    manualItemRow,
    setManualItemRow,
    aggregatedGroceries,
    toggleGroceryItem,
    clearGroceryList,
    addManualItem,
    syncGroceryFromMealPlan,
  }
}