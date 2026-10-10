export type RecipeFormFields = {
  title: string
  description: string
  source: string
  keywords: string
  defaultServings: string
  minServings: string
  maxServings: string
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
  keywords: '',
  defaultServings: '2',
  minServings: '1',
  maxServings: '4',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  fiber: '',
  nutritionNotes: '',
})