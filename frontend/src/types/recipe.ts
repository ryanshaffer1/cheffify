export type TabKey = 'recipes' | 'plan' | 'grocery'

export type RecipeNutrition = {
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  fiber_g: number | null
  notes: string | null
}

export type RecipeIngredient = {
  id?: number
  display_name: string
  normalized_name: string
  quantity: number
  unit: string
  is_optional?: boolean
  notes?: string | null
}

export type RecipeInstruction = {
  step_number: number
  instruction: string
  ingredient_ids?: number[]
  ingredient_names?: string[]
}

export type InstructionStep = {
  instruction: string
  ingredientIds: number[]
  ingredientNames: string[]
}

export type ImportedRecipe = {
  title: string
  keywords: string[]
  ingredients: Omit<RecipeIngredient, 'is_optional' | 'notes'>[]
  instructions: RecipeInstruction[]
  tools: string[]
  default_servings: number
  min_servings: number
  max_servings: number
  nutrition: RecipeNutrition
}

export type Recipe = {
  id: number
  title: string
  description: string
  servings: number
  defaultServings: number
  servingsMin: number | null
  servingsMax: number | null
  imageUrl?: string | null
  keywords: string[]
  ingredients: RecipeIngredient[]
  instructions: RecipeInstruction[]
  tools: string[]
  nutrition?: RecipeNutrition | null
}

export type GroceryItem = {
  name: string
  checked: boolean
  source?: string[]
  quantity?: number
  unit?: string
}

export type IngredientEditorRow = {
  id?: number
  name: string
  quantity: string
  unit: string
}