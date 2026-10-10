import { useEffect, useState } from 'react'
import type { Recipe } from '../types/recipe'
import { getRecipeDefaultServings } from '../utils/recipeFormatting'

const STORAGE_KEY = 'cheffify.mealPlan'

const readMealPlan = (): Recipe[] => {
  if (typeof window === 'undefined') return []
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) as Recipe[] : []
  } catch {
    return []
  }
}

export function useMealPlan() {
  const [mealPlan, setMealPlan] = useState<Recipe[]>(readMealPlan)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mealPlan))
  }, [mealPlan])

  const isRecipeInMealPlan = (recipeId: number) => mealPlan.some((item) => item.id === recipeId)

  const toggleMealPlanRecipe = (recipe: Recipe) => {
    const defaultServings = getRecipeDefaultServings(recipe)
    const normalizedRecipe = {
      ...recipe,
      servings: defaultServings,
      defaultServings,
      servingsMin: recipe.servingsMin ?? 1,
      servingsMax: recipe.servingsMax ?? defaultServings,
    }

    setMealPlan((current) => current.some((item) => item.id === recipe.id)
      ? current.filter((item) => item.id !== recipe.id)
      : [...current, normalizedRecipe])
  }

  const updateMealPlanServings = (recipeId: number, nextServings: number) => {
    setMealPlan((current) => current.map((recipe) => {
      if (recipe.id !== recipeId) return recipe
      const baseServings = getRecipeDefaultServings(recipe)
      const minServings = recipe.servingsMin ?? 1
      const maxServings = recipe.servingsMax ?? baseServings
      const servings = Math.min(Math.max(nextServings || baseServings, minServings), maxServings)
      return { ...recipe, servings }
    }))
  }

  const removeMealPlanItem = (index: number) => {
    setMealPlan((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const removeRecipe = (recipeId: number) => {
    setMealPlan((current) => current.filter((item) => item.id !== recipeId))
  }

  return { mealPlan, setMealPlan, isRecipeInMealPlan, toggleMealPlanRecipe, updateMealPlanServings, removeMealPlanItem, removeRecipe }
}