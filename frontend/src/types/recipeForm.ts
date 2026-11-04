export type RecipeFormFields = {
  title: string
  description: string
  source: string
  tags: string
  defaultServings: string
  minServings: string
  maxServings: string
  estimatedCookingTimeMinutes: string
  calories: string
  protein: string
  carbs: string
  fat: string
  fiber: string
  nutritionNotes: string
}

export const createEmptyRecipeFormFields = (): RecipeFormFields => ({
  title: '',
  description: '',
  source: '',
  tags: '',
  defaultServings: '2',
  minServings: '1',
  maxServings: '4',
  estimatedCookingTimeMinutes: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  fiber: '',
  nutritionNotes: '',
})