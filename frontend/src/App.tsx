import { useEffect, useMemo, useState } from 'react'
import './App.css'

type TabKey = 'recipes' | 'plan' | 'grocery'

type RecipeNutrition = {
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  fiber_g: number | null
  notes: string | null
}

type RecipeIngredient = {
  display_name: string
  normalized_name: string
  quantity: number
  unit: string
  is_optional?: boolean
  notes?: string | null
}

type RecipeInstruction = {
  step_number: number
  instruction: string
}

type Recipe = {
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

type GroceryItem = {
  name: string
  checked: boolean
  source?: string[]
  quantity?: number
  unit?: string
}

const API_BASE = '/api'
const BACKEND_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000').replace(/\/+$/, '')
const STORAGE_KEYS = {
  recipes: 'cheffify.recipes',
  mealPlan: 'cheffify.mealPlan',
  groceryItems: 'cheffify.groceryItems',
  generatedGroceries: 'cheffify.generatedGroceries',
  activeTab: 'cheffify.activeTab',
} as const

const readStorage = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') {
    return fallback
  }

  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

const makeIngredient = (
  display_name: string,
  quantity: number,
  unit: string,
  notes: string | null = null,
  is_optional = false,
): RecipeIngredient => ({
  display_name,
  normalized_name: display_name.toLowerCase(),
  quantity,
  unit: unit && unit.toLowerCase() !== 'item' ? unit : '',
  notes,
  is_optional,
})

const normalizeIngredientUnit = (unit: string): string => {
  const normalized = (unit || '').trim().toLowerCase()
  if (!normalized || normalized === 'item') {
    return ''
  }

  const singularMap: Record<string, string> = {
    cup: 'cup',
    cups: 'cup',
    tablespoon: 'tablespoon',
    tablespoons: 'tablespoon',
    tbsp: 'tbsp',
    teaspoon: 'teaspoon',
    teaspoons: 'teaspoon',
    tsp: 'tsp',
    ounce: 'oz',
    ounces: 'oz',
    oz: 'oz',
    pound: 'lb',
    pounds: 'lb',
    lb: 'lb',
    lbs: 'lb',
    whole: 'whole',
    piece: 'piece',
    pieces: 'piece',
    slice: 'slice',
    slices: 'slice',
    clove: 'clove',
    cloves: 'clove',
    head: 'head',
    heads: 'head',
    can: 'can',
    cans: 'can',
    bunch: 'bunch',
    bunches: 'bunch',
    sprig: 'sprig',
    sprigs: 'sprig',
    gram: 'g',
    grams: 'g',
    g: 'g',
    litre: 'l',
    liters: 'l',
    liter: 'l',
    litres: 'l',
    l: 'l',
    milliliter: 'ml',
    milliliters: 'ml',
    ml: 'ml',
  }

  return singularMap[normalized] ?? normalized
}

const normalizeDisplayName = (value: string): string => value.trim().replace(/\s+/g, ' ').toLowerCase()

const resolveImageUrl = (imageUrl?: string | null): string | null => {
  if (!imageUrl) {
    return null
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl
  }

  if (imageUrl.startsWith('/')) {
    return `${BACKEND_BASE_URL}${imageUrl}`
  }

  return `${BACKEND_BASE_URL}/${imageUrl}`
}

const toTitleCase = (value: string): string =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .split(' ')
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ''))
    .join(' ')

const formatQuantityForDisplay = (quantity: number): string => {
  const numeric = Number(quantity)
  return Number.isInteger(numeric) ? String(numeric) : numeric.toString()
}

const formatUnitForDisplay = (unit: string, quantity: number): string => {
  const normalized = normalizeIngredientUnit(unit).toLowerCase()
  if (!normalized) {
    return ''
  }

  const singularMap: Record<string, string> = {
    cup: 'cup',
    cups: 'cup',
    tablespoon: 'tablespoon',
    tablespoons: 'tablespoon',
    tbsp: 'tbsp',
    teaspoon: 'teaspoon',
    teaspoons: 'teaspoon',
    tsp: 'tsp',
    oz: 'oz',
    lb: 'lb',
    lbs: 'lb',
    whole: 'whole',
    piece: 'piece',
    pieces: 'piece',
    slice: 'slice',
    slices: 'slice',
    clove: 'clove',
    cloves: 'clove',
    head: 'head',
    heads: 'head',
    can: 'can',
    cans: 'can',
    bunch: 'bunch',
    bunches: 'bunch',
    sprig: 'sprig',
    sprigs: 'sprig',
  }

  const singular = singularMap[normalized] ?? normalized
  if (Number(quantity) === 1) {
    return singular
  }

  const pluralMap: Record<string, string> = {
    cup: 'cups',
    tablespoon: 'tablespoons',
    tbsp: 'tbsp',
    teaspoon: 'teaspoons',
    tsp: 'tsp',
    oz: 'oz',
    lb: 'lb',
    whole: 'whole',
    piece: 'pieces',
    slice: 'slices',
    clove: 'cloves',
    head: 'heads',
    can: 'cans',
    bunch: 'bunches',
    sprig: 'sprigs',
  }

  return pluralMap[singular] ?? (singular.endsWith('s') ? singular : `${singular}s`)
}

const formatIngredient = (ingredient: RecipeIngredient | null | undefined): string => {
  if (!ingredient) {
    return 'Ingredient'
  }

  const quantity = Number(ingredient.quantity)
  const unit = formatUnitForDisplay(ingredient.unit || '', quantity)
  const displayName = normalizeDisplayName(ingredient.display_name)
  const base = unit ? `${formatQuantityForDisplay(quantity)} ${unit} ${displayName}` : `${formatQuantityForDisplay(quantity)} ${displayName}`
  return base.trim()
}

const getRecipeDefaultServings = (recipe: Pick<Recipe, 'servings' | 'defaultServings'>): number => {
  return Number(recipe.defaultServings || recipe.servings || 1) || 1
}

const getRecipeServingRangeText = (
  recipe: Pick<Recipe, 'servings' | 'defaultServings' | 'servingsMin' | 'servingsMax'>
): string => {
  const defaultServings = getRecipeDefaultServings(recipe)
  const minServings = Number(recipe.servingsMin ?? defaultServings)
  const maxServings = Number(recipe.servingsMax ?? defaultServings)

  if (minServings > 1 || maxServings > defaultServings) {
    return `Serves ${minServings}-${maxServings}`
  }

  return `Serves ${defaultServings}`
}

const formatNutritionValue = (value: number | null | undefined, servings: number): string => {
  if (value == null || !Number.isFinite(value)) {
    return '—'
  }

  const perServingValue = servings > 0 ? value / servings : value
  if (Number.isInteger(perServingValue)) {
    return String(perServingValue)
  }

  return perServingValue.toFixed(1)
}

const formatGroceryItemText = (item: GroceryItem | { name: string; checked: boolean; source?: string[]; quantity?: number; unit?: string | null }) => {
  const name = toTitleCase(item.name)
  const quantity = Number(item.quantity ?? 0)
  const unit = formatUnitForDisplay(item.unit || '', quantity)

  return {
    name,
    meta:
      item.quantity && item.unit && item.unit.toLowerCase() !== 'item'
        ? `${formatQuantityForDisplay(quantity)} ${unit}`
        : item.quantity
          ? formatQuantityForDisplay(quantity)
          : '',
  }
}

const createIngredientRow = () => ({ name: '', quantity: '1', unit: '' })
const createInstructionStep = () => ''
const createCookwareRow = () => ''

const getGroceryKey = (item: Pick<GroceryItem, 'name' | 'unit'>): string => {
  const normalizedName = normalizeDisplayName(item.name)
  const normalizedUnit = normalizeIngredientUnit(item.unit || '')
  return `${normalizedName}|${normalizedUnit || 'item'}`
}

const mergeGroceryEntries = (items: GroceryItem[]): GroceryItem[] => {
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

const initialRecipes: Recipe[] = [
  {
    id: 1,
    title: 'Sheet Pan Chicken & Veggies',
    description: 'Simple family dinner',
    servings: 2,
    defaultServings: 2,
    servingsMin: 1,
    servingsMax: 4,
    keywords: ['quick', 'dinner'],
    ingredients: [
      makeIngredient('Chicken breast', 2, 'pieces'),
      makeIngredient('Broccoli', 2, 'cups'),
      makeIngredient('Tomatoes', 1, 'cup'),
    ],
    tools: ['Sheet pan', 'Spatula'],
    instructions: [
      { step_number: 1, instruction: 'Preheat the oven and arrange the chicken and vegetables on a sheet pan.' },
      { step_number: 2, instruction: 'Roast until the chicken is cooked through and the vegetables are tender.' },
      { step_number: 3, instruction: 'Season with herbs and serve hot.' },
    ],
  },
  {
    id: 2,
    title: 'Lemon Herb Pasta',
    description: 'Fast vegetarian bowl',
    servings: 2,
    defaultServings: 2,
    servingsMin: 1,
    servingsMax: 4,
    keywords: ['vegetarian', 'quick'],
    ingredients: [
      makeIngredient('Pasta', 8, 'oz'),
      makeIngredient('Lemon', 1, 'whole'),
      makeIngredient('Parsley', 1, 'cup'),
    ],
    tools: ['Pot', 'Colander'],
    instructions: [
      { step_number: 1, instruction: 'Cook the pasta until al dente, then drain and reserve a little pasta water.' },
      { step_number: 2, instruction: 'Toss the pasta with lemon juice, parsley, and a splash of reserved water.' },
      { step_number: 3, instruction: 'Serve with extra herbs and a pinch of salt and pepper.' },
    ],
  },
  {
    id: 3,
    title: 'Greek Salad Bowls',
    description: 'Healthy lunch option',
    servings: 2,
    defaultServings: 2,
    servingsMin: 1,
    servingsMax: 4,
    keywords: ['lunch', 'vegetarian'],
    ingredients: [
      makeIngredient('Tomatoes', 2, 'cups'),
      makeIngredient('Cucumber', 1, 'whole'),
      makeIngredient('Feta', 4, 'oz'),
    ],
    tools: ['Knife', 'Mixing bowl'],
    instructions: [
      { step_number: 1, instruction: 'Chop the tomatoes and cucumber into bite-size pieces.' },
      { step_number: 2, instruction: 'Add feta and toss gently with your preferred dressing.' },
      { step_number: 3, instruction: 'Serve immediately as a fresh lunch bowl.' },
    ],
  },
]

const defaultGroceryItems: GroceryItem[] = [
  { name: 'Tomatoes', checked: false, quantity: 2, unit: 'cups' },
  { name: 'Broccoli', checked: true, quantity: 1, unit: 'head' },
  { name: 'Chicken breast', checked: false, quantity: 2, unit: 'pieces' },
]

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'recipes', label: 'Recipes' },
  { key: 'plan', label: 'Meal Plan' },
  { key: 'grocery', label: 'Groceries' },
]

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const saved = readStorage<string>(STORAGE_KEYS.activeTab, 'recipes')
    return saved === 'recipes' || saved === 'plan' || saved === 'grocery' ? saved : 'recipes'
  })
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [recipes, setRecipes] = useState<Recipe[]>(() => readStorage<Recipe[]>(STORAGE_KEYS.recipes, initialRecipes))
  const [mealPlan, setMealPlan] = useState<Recipe[]>(() => readStorage<Recipe[]>(STORAGE_KEYS.mealPlan, []))
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>(() =>
    readStorage<GroceryItem[]>(STORAGE_KEYS.groceryItems, defaultGroceryItems)
  )
  const [generatedGroceries, setGeneratedGroceries] = useState<GroceryItem[]>(() =>
    readStorage<GroceryItem[]>(STORAGE_KEYS.generatedGroceries, [])
  )
  const [manualItemRow, setManualItemRow] = useState<{ name: string; quantity: string; unit: string }>(
    createIngredientRow()
  )
  const [loading, setLoading] = useState(true)
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  )
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null)
  const [editingRecipeId, setEditingRecipeId] = useState<number | null>(null)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [clearGroceriesConfirm, setClearGroceriesConfirm] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [uploadIngredientRows, setUploadIngredientRows] = useState<Array<{ name: string; quantity: string; unit: string }>>([
    createIngredientRow(),
  ])
  const [uploadInstructionRows, setUploadInstructionRows] = useState<string[]>([createInstructionStep()])
  const [uploadCookwareRows, setUploadCookwareRows] = useState<string[]>([createCookwareRow()])
  const [uploadImageUrl, setUploadImageUrl] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [expandedUploadInstructionIndex, setExpandedUploadInstructionIndex] = useState<number | null>(null)
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null)
  const [editIngredientRows, setEditIngredientRows] = useState<Array<{ name: string; quantity: string; unit: string }>>([
    createIngredientRow(),
  ])
  const [editInstructionRows, setEditInstructionRows] = useState<string[]>([createInstructionStep()])
  const [editCookwareRows, setEditCookwareRows] = useState<string[]>([createCookwareRow()])
  const [expandedEditInstructionIndex, setExpandedEditInstructionIndex] = useState<number | null>(null)

  const updateIngredientRow = (
    setter: React.Dispatch<React.SetStateAction<Array<{ name: string; quantity: string; unit: string }>>>,
    index: number,
    field: 'name' | 'quantity' | 'unit',
    value: string
  ) => {
    setter((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row))
    )
  }

  const addIngredientRow = (
    setter: React.Dispatch<React.SetStateAction<Array<{ name: string; quantity: string; unit: string }>>>
  ) => {
    setter((current) => [...current, createIngredientRow()])
  }

  const removeIngredientRow = (
    setter: React.Dispatch<React.SetStateAction<Array<{ name: string; quantity: string; unit: string }>>>,
    index: number
  ) => {
    setter((current) => {
      if (current.length === 1) {
        return [createIngredientRow()]
      }
      return current.filter((_, rowIndex) => rowIndex !== index)
    })
  }

  const addInstructionStep = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((current) => [...current, createInstructionStep()])
  }

  const removeInstructionStep = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setter((current) => {
      if (current.length === 1) {
        return [createInstructionStep()]
      }
      return current.filter((_, rowIndex) => rowIndex !== index)
    })
  }

  const addCookwareRow = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((current) => [...current, createCookwareRow()])
  }

  const removeCookwareRow = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setter((current) => {
      if (current.length === 1) {
        return [createCookwareRow()]
      }
      return current.filter((_, rowIndex) => rowIndex !== index)
    })
  }

  const moveInstructionStep = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    direction: -1 | 1
  ) => {
    setter((current) => {
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current
      }

      const next = [...current]
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      return next
    })
  }

  const normalizeRecipe = (item: any): Recipe => {
    const defaultServings = Number(item.default_servings ?? item.servings ?? 2) || 2
    const servingsMin = item.servings_min == null ? null : Number(item.servings_min) || 1
    const servingsMax = item.servings_max == null ? null : Number(item.servings_max) || defaultServings

    return {
      id: Number(item.id),
      title: item.title || 'Untitled recipe',
      description: item.description || 'Custom recipe',
      servings: defaultServings,
      defaultServings,
      servingsMin,
      servingsMax,
      imageUrl: item.image_url ?? item.imageUrl ?? null,
      keywords: Array.isArray(item.keywords) ? item.keywords : [],
      ingredients: Array.isArray(item.ingredients)
        ? item.ingredients.map((ingredient: any) => ({
            display_name: ingredient.display_name || ingredient.normalized_name || 'Ingredient',
            normalized_name: ingredient.normalized_name || ingredient.display_name || 'ingredient',
            quantity: Number(ingredient.quantity ?? 1),
            unit: ingredient.unit || 'item',
            notes: ingredient.notes ?? null,
            is_optional: Boolean(ingredient.is_optional),
          }))
        : [],
      instructions: Array.isArray(item.instructions)
        ? item.instructions
            .map((instruction: any, index: number) => ({
              step_number: Number(instruction.step_number ?? index + 1),
              instruction: String(instruction.instruction ?? '').trim(),
            }))
            .filter((instruction: { instruction: string }) => instruction.instruction)
        : [],
      tools: Array.isArray(item.tools)
        ? item.tools.map((tool: string) => String(tool).trim()).filter(Boolean)
        : [],
      nutrition: item.nutrition
        ? {
            calories: item.nutrition.calories == null ? null : Number(item.nutrition.calories),
            protein_g: item.nutrition.protein_g == null ? null : Number(item.nutrition.protein_g),
            carbs_g: item.nutrition.carbs_g == null ? null : Number(item.nutrition.carbs_g),
            fat_g: item.nutrition.fat_g == null ? null : Number(item.nutrition.fat_g),
            fiber_g: item.nutrition.fiber_g == null ? null : Number(item.nutrition.fiber_g),
            notes: item.nutrition.notes ?? null,
          }
        : null,
    }
  }

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.recipes, JSON.stringify(recipes))
  }, [recipes])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.mealPlan, JSON.stringify(mealPlan))
  }, [mealPlan])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.groceryItems, JSON.stringify(groceryItems))
  }, [groceryItems])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.generatedGroceries, JSON.stringify(generatedGroceries))
  }, [generatedGroceries])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.activeTab, JSON.stringify(activeTab))
  }, [activeTab])

  useEffect(() => {
    const handleConnectionChange = () => setOnline(navigator.onLine)

    window.addEventListener('online', handleConnectionChange)
    window.addEventListener('offline', handleConnectionChange)

    return () => {
      window.removeEventListener('online', handleConnectionChange)
      window.removeEventListener('offline', handleConnectionChange)
    }
  }, [])

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const installApp = async () => {
    if (!installPrompt) {
      return
    }

    ;(installPrompt as any).prompt()
    await (installPrompt as any).userChoice
    setInstallPrompt(null)
  }

  const loadRecipes = async () => {
    const localRecipes = readStorage<Recipe[]>(STORAGE_KEYS.recipes, initialRecipes)
    setRecipes(localRecipes)

    if (!online) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_BASE}/recipes`)
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const payload = await response.json()
      const nextRecipes = Array.isArray(payload) ? payload.map(normalizeRecipe) : localRecipes
      setRecipes(nextRecipes)
    } catch {
      setRecipes(localRecipes)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRecipes()
  }, [online])

  const filteredRecipes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return recipes.filter((recipe) => {
      const matchesFilter = filter === 'all' || recipe.keywords.includes(filter)
      const ingredientText = recipe.ingredients
        .map((ingredient) => `${ingredient.display_name} ${ingredient.normalized_name}`)
        .join(' ')
      const haystack = `${recipe.title} ${recipe.description} ${ingredientText} ${recipe.keywords.join(' ')}`.toLowerCase()
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery)
      return matchesFilter && matchesQuery
    })
  }, [filter, query, recipes])

  const aggregatedGroceries = useMemo(() => mergeGroceryEntries([...generatedGroceries, ...groceryItems]), [generatedGroceries, groceryItems])

  const isRecipeInMealPlan = (recipeId: number) => mealPlan.some((item) => item.id === recipeId)

  const openRecipeDetails = (recipeId: number) => {
    setSelectedRecipeId(recipeId)
    setActiveTab('recipes')
  }

  const toggleMealPlanRecipe = (recipe: Recipe) => {
    const normalizedRecipe = {
      ...recipe,
      servings: getRecipeDefaultServings(recipe),
      defaultServings: getRecipeDefaultServings(recipe),
      servingsMin: recipe.servingsMin ?? 1,
      servingsMax: recipe.servingsMax ?? getRecipeDefaultServings(recipe),
    }

    setMealPlan((current) => {
      const alreadyAdded = current.some((item) => item.id === recipe.id)
      return alreadyAdded ? current.filter((item) => item.id !== recipe.id) : [...current, normalizedRecipe]
    })
  }

  const updateMealPlanServings = (recipeId: number, nextServings: number) => {
    setMealPlan((current) =>
      current.map((recipe) => {
        if (recipe.id !== recipeId) {
          return recipe
        }

        const baseServings = getRecipeDefaultServings(recipe)
        const minServings = recipe.servingsMin ?? 1
        const maxServings = recipe.servingsMax ?? baseServings
        const boundedServings = Math.min(Math.max(nextServings || baseServings, minServings), maxServings)

        return {
          ...recipe,
          servings: boundedServings,
        }
      })
    )
  }

  const removeMealPlanItem = (index: number) => {
    setMealPlan((current) => current.filter((_, i) => i !== index))
  }

  const toggleGroceryItem = (itemKey: string) => {
    setGeneratedGroceries((current) =>
      current.map((item) => (getGroceryKey(item) === itemKey ? { ...item, checked: !item.checked } : item))
    )

    setGroceryItems((current) =>
      current.map((item) => (getGroceryKey(item) === itemKey ? { ...item, checked: !item.checked } : item))
    )
  }

  const clearGroceryList = () => {
    setGroceryItems([])
    setGeneratedGroceries([])
    setClearGroceriesConfirm(false)
  }

  const addManualItem = () => {
    const trimmed = manualItemRow.name.trim()
    if (!trimmed) return

    const quantity = Number(manualItemRow.quantity)
    const normalizedQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1
    const normalizedUnit = normalizeIngredientUnit(manualItemRow.unit)
    const itemKey = getGroceryKey({ name: trimmed, unit: normalizedUnit || '' })
    const manualSource = 'Manual Item'

    const existingGenerated = generatedGroceries.find((item) => getGroceryKey(item) === itemKey)
    if (existingGenerated) {
      setGeneratedGroceries((current) =>
        current.map((item) => {
          if (getGroceryKey(item) !== itemKey) {
            return item
          }

          const nextSources = [...new Set([...(item.source ?? []), manualSource])]
          return {
            ...item,
            quantity: (Number(item.quantity ?? 0) || 0) + normalizedQuantity,
            source: nextSources,
          }
        })
      )
      setManualItemRow(createIngredientRow())
      return
    }

    const existingManual = groceryItems.find((item) => getGroceryKey(item) === itemKey)
    if (existingManual) {
      setGroceryItems((current) =>
        current.map((item) => {
          if (getGroceryKey(item) !== itemKey) {
            return item
          }

          const nextSources = [...new Set([...(item.source ?? []), manualSource])]
          return {
            ...item,
            quantity: (Number(item.quantity ?? 0) || 0) + normalizedQuantity,
            source: nextSources,
          }
        })
      )
      setManualItemRow(createIngredientRow())
      return
    }

    setGroceryItems((current) => [
      ...current,
      {
        name: trimmed,
        checked: false,
        quantity: normalizedQuantity,
        unit: normalizedUnit || undefined,
        source: [manualSource],
      },
    ])
    setManualItemRow(createIngredientRow())
  }

  const syncGroceryFromMealPlan = async () => {
    if (!mealPlan.length) {
      setGeneratedGroceries([])
      return
    }

    const payload = {
      name: 'Demo meal plan',
      recipe_ids: mealPlan.map((recipe) => recipe.id),
      servings_by_recipe: Object.fromEntries(
        mealPlan.map((recipe) => [String(recipe.id), recipe.servings])
      ),
    }

    try {
      const response = await fetch(`${API_BASE}/meal-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Meal plan request failed with status ${response.status}`)
      }

      const data = await response.json()
      const nextItems = Array.isArray(data.grocery_items)
        ? data.grocery_items.map((item: any) => ({
            name: item.display_name || item.normalized_name || 'Ingredient',
            checked: false,
            source: item.source_recipe_names || [],
            quantity: Number(item.quantity ?? 1),
            unit: item.unit || 'item',
          }))
        : []

      setGeneratedGroceries(mergeGroceryEntries(nextItems))
    } catch {
      const merged = new Map<string, GroceryItem & { source: string[] }>()

      mealPlan.forEach((recipe) => {
        recipe.ingredients.forEach((ingredient) => {
          const normalizedKey = `${ingredient.normalized_name}:${ingredient.unit}`
          const current = merged.get(normalizedKey) ?? {
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
          merged.set(normalizedKey, current)
        })
      })

      const fallbackItems = [...merged.values()].map((item) => ({
        name: item.name,
        checked: false,
        source: item.source,
        quantity: Number(item.quantity) || 1,
        unit: item.unit || undefined,
      }))

      setGeneratedGroceries(mergeGroceryEntries(fallbackItems))
    }
  }

  const handleImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>, mode: 'upload' | 'edit') => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    try {
      setUploadingImage(true)
      const response = await fetch(`${API_BASE}/recipes/upload-image`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Image upload failed with status ${response.status}`)
      }

      const data = await response.json()
      const nextUrl = typeof data.image_url === 'string' ? data.image_url : null

      if (mode === 'upload') {
        setUploadImageUrl(nextUrl)
      } else {
        setEditImageUrl(nextUrl)
      }
    } catch {
      // Ignore upload errors for now and keep the local form editable.
    } finally {
      setUploadingImage(false)
      event.target.value = ''
    }
  }

  const handleUploadSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const title = String(formData.get('title') || '').trim()
    const keywords = String(formData.get('keywords') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    const parsedIngredients = uploadIngredientRows
      .filter((row) => row.name.trim())
      .map((row) => {
        const quantity = Number(row.quantity)
        const normalizedQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1
        const normalizedUnit = normalizeIngredientUnit(row.unit)
        return makeIngredient(row.name.trim(), normalizedQuantity, normalizedUnit)
      })
    const parsedInstructions = uploadInstructionRows
      .map((step) => step.trim())
      .filter(Boolean)
      .map((instruction, index) => ({
        step_number: index + 1,
        instruction,
      }))
    const parsedTools = uploadCookwareRows.map((tool) => tool.trim()).filter(Boolean)

    if (!title || parsedIngredients.length === 0) {
      return
    }

    const defaultServings = Number(formData.get('defaultServings')) || 2
    const minServings = Number(formData.get('minServings')) || 1
    const maxServings = Number(formData.get('maxServings')) || defaultServings
    const normalizedMinServings = Math.max(1, minServings)
    const normalizedMaxServings = Math.max(defaultServings, maxServings)
    const nutrition = {
      calories: Number(formData.get('calories')) || null,
      protein_g: Number(formData.get('protein')) || null,
      carbs_g: Number(formData.get('carbs')) || null,
      fat_g: Number(formData.get('fat')) || null,
      fiber_g: Number(formData.get('fiber')) || null,
      notes: String(formData.get('nutritionNotes') || '').trim() || null,
    }
    const localRecipe: Recipe = {
      id: Date.now(),
      title,
      description: 'Custom recipe',
      servings: defaultServings,
      defaultServings,
      servingsMin: normalizedMinServings,
      servingsMax: normalizedMaxServings,
      imageUrl: uploadImageUrl,
      keywords: keywords.length ? keywords : ['custom'],
      ingredients: parsedIngredients,
      instructions: parsedInstructions,
      tools: parsedTools,
      nutrition,
    }

    const payload = {
      title,
      description: 'Custom recipe',
      default_servings: defaultServings,
      servings_min: normalizedMinServings,
      servings_max: normalizedMaxServings,
      image_url: uploadImageUrl,
      source_type: 'custom',
      keywords: localRecipe.keywords,
      tools: parsedTools,
      ingredients: parsedIngredients.map((ingredient) => ({
        display_name: ingredient.display_name,
        normalized_name: ingredient.normalized_name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        is_optional: ingredient.is_optional ?? false,
        notes: ingredient.notes ?? null,
      })),
      instructions: parsedInstructions,
      nutrition: Object.values(nutrition).every((value) => value === null || value === '') ? null : nutrition,
    }

    setRecipes((current) => [localRecipe, ...current])
    setUploadIngredientRows([createIngredientRow()])
    setUploadInstructionRows([createInstructionStep()])
    setUploadCookwareRows([createCookwareRow()])
    setUploadImageUrl(null)
    setActiveTab('recipes')
    event.currentTarget.reset()

    if (!online) {
      return
    }

    try {
      const response = await fetch(`${API_BASE}/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const created = await response.json()
        setRecipes((current) => [normalizeRecipe(created), ...current.filter((item) => item.id !== localRecipe.id)])
      }
    } catch {
      // Keep local draft when the server is temporarily unavailable.
    }
  }

  const selectedRecipe = useMemo(
    () => recipes.find((recipe) => recipe.id === selectedRecipeId) ?? null,
    [recipes, selectedRecipeId]
  )

  useEffect(() => {
    if (selectedRecipe) {
      setEditIngredientRows(
        selectedRecipe.ingredients.length
          ? selectedRecipe.ingredients.map((ingredient) => ({
              name: ingredient.display_name,
              quantity: String(ingredient.quantity),
              unit: ingredient.unit && ingredient.unit.toLowerCase() !== 'item' ? ingredient.unit : '',
            }))
          : [createIngredientRow()]
      )
      setEditInstructionRows(
        selectedRecipe.instructions.length
          ? selectedRecipe.instructions.map((instruction) => instruction.instruction)
          : [createInstructionStep()]
      )
      setEditCookwareRows(
        selectedRecipe.tools.length ? selectedRecipe.tools : [createCookwareRow()]
      )
      setEditImageUrl(selectedRecipe.imageUrl ?? null)
    } else {
      setEditImageUrl(null)
    }
  }, [selectedRecipe])

  const saveEditedRecipe = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const id = editingRecipeId ?? selectedRecipeId

    if (id === null) {
      return
    }

    const title = String(formData.get('title') || '').trim()
    const description = String(formData.get('description') || '').trim() || 'Custom recipe'
    const defaultServings = Number(formData.get('defaultServings')) || 2
    const minServings = Number(formData.get('minServings')) || 1
    const maxServings = Number(formData.get('maxServings')) || defaultServings
    const normalizedMinServings = Math.max(1, minServings)
    const normalizedMaxServings = Math.max(defaultServings, maxServings)
    const keywords = String(formData.get('keywords') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    const ingredients = editIngredientRows
      .filter((row) => row.name.trim())
      .map((row) => {
        const quantity = Number(row.quantity)
        const normalizedQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1
        const normalizedUnit = normalizeIngredientUnit(row.unit)
        return makeIngredient(row.name.trim(), normalizedQuantity, normalizedUnit)
      })
    const instructionSteps = editInstructionRows
      .map((step) => step.trim())
      .filter(Boolean)
      .map((instruction, index) => ({
        step_number: index + 1,
        instruction,
      }))
    const cookware = editCookwareRows.map((tool) => tool.trim()).filter(Boolean)

    if (!title || ingredients.length === 0) {
      return
    }

    const nutrition = {
      calories: Number(formData.get('calories')) || null,
      protein_g: Number(formData.get('protein')) || null,
      carbs_g: Number(formData.get('carbs')) || null,
      fat_g: Number(formData.get('fat')) || null,
      fiber_g: Number(formData.get('fiber')) || null,
      notes: String(formData.get('nutritionNotes') || '').trim() || null,
    }

    const nextImageUrl = editImageUrl ?? selectedRecipe?.imageUrl ?? null

    const patch: Recipe = {
      id,
      title,
      description,
      servings: defaultServings,
      defaultServings,
      servingsMin: normalizedMinServings,
      servingsMax: normalizedMaxServings,
      imageUrl: nextImageUrl,
      keywords: keywords.length ? keywords : ['custom'],
      ingredients,
      instructions: instructionSteps,
      tools: cookware,
      nutrition,
    }

    setRecipes((current) => current.map((recipe) => (recipe.id === id ? patch : recipe)))
    setSelectedRecipeId(id)
    setEditingRecipeId(null)

    if (!online) {
      return
    }

    const payload = {
      title,
      description,
      default_servings: defaultServings,
      servings_min: normalizedMinServings,
      servings_max: normalizedMaxServings,
      image_url: nextImageUrl,
      source_type: 'custom',
      keywords: patch.keywords,
      tools: cookware,
      ingredients: ingredients.map((ingredient) => ({
        display_name: ingredient.display_name,
        normalized_name: ingredient.normalized_name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        is_optional: ingredient.is_optional ?? false,
        notes: ingredient.notes ?? null,
      })),
      instructions: instructionSteps,
      nutrition: Object.values(nutrition).every((value) => value === null || value === '') ? null : nutrition,
    }

    try {
      const response = await fetch(`${API_BASE}/recipes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const updated = await response.json()
        setRecipes((current) => current.map((recipe) => (recipe.id === id ? normalizeRecipe(updated) : recipe)))
      }
    } catch {
      // Keep local edits when the server is unavailable.
    }
  }

  const handleDeleteRecipe = async (recipeId: number) => {
    const recipe = recipes.find((item) => item.id === recipeId)
    if (!recipe) {
      return
    }

    setRecipes((current) => current.filter((item) => item.id !== recipeId))
    setMealPlan((current) => current.filter((item) => item.id !== recipeId))
    setSelectedRecipeId(null)
    setEditingRecipeId(null)
    setDeleteConfirmId(null)

    if (!online) {
      return
    }

    try {
      await fetch(`${API_BASE}/recipes/${recipeId}`, {
        method: 'DELETE',
      })
    } catch {
      // Keep the local removal even if the backend is temporarily unavailable.
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Meal planning</p>
          <h1>Cheffify</h1>
        </div>
        <div className="topbar-actions">
          {installPrompt ? (
            <button type="button" className="secondary-button install-button" onClick={() => void installApp()}>
              Install
            </button>
          ) : null}
          <span className={online ? 'status-pill online' : 'status-pill offline'}>
            {online ? 'Online' : 'Offline'}
          </span>
        </div>
      </header>

      {activeTab === 'recipes' && (
        <main className="page">
          {selectedRecipe && editingRecipeId === null ? (
            <section className="panel detail-panel">
              <div className="section-header">
                <button type="button" className="text-button" onClick={() => setSelectedRecipeId(null)}>
                  Back
                </button>
                <div className="section-header-actions">
                  <button type="button" className="secondary-button" onClick={() => setEditingRecipeId(selectedRecipe.id)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => setDeleteConfirmId(selectedRecipe.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="recipe-detail-header">
                <div
                  className={selectedRecipe.imageUrl ? 'recipe-thumb detail-thumb has-image' : 'recipe-thumb detail-thumb'}
                  aria-hidden="true"
                  style={selectedRecipe.imageUrl ? { backgroundImage: `url(${resolveImageUrl(selectedRecipe.imageUrl)})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                />
                <div>
                  <h2>{selectedRecipe.title}</h2>
                  <p>{selectedRecipe.description}</p>
                </div>
              </div>

              <div className="meta-row">
                <span>{getRecipeServingRangeText(selectedRecipe)}</span>
                <span>{selectedRecipe.keywords.join(', ') || 'custom'}</span>
              </div>

              <div className="detail-section">
                <h3>Ingredients</h3>
                <ul>
                  {selectedRecipe.ingredients.map((ingredient, index) => (
                    <li key={`${selectedRecipe.id}-${ingredient.normalized_name}-${index}`}>
                      {formatIngredient(ingredient)}
                    </li>
                  ))}
                </ul>
              </div>

              {selectedRecipe.tools.length > 0 && (
                <div className="detail-section">
                  <h3>Cookware</h3>
                  <ul>
                    {selectedRecipe.tools.map((tool, index) => (
                      <li key={`${selectedRecipe.id}-tool-${tool}-${index}`}>{tool}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedRecipe.nutrition && (
                <div className="detail-section">
                  <h3>Nutrition per Serving</h3>
                  <div className="nutrition-grid">
                    <span>Calories: {formatNutritionValue(selectedRecipe.nutrition.calories, getRecipeDefaultServings(selectedRecipe))}</span>
                    <span>Protein: {formatNutritionValue(selectedRecipe.nutrition.protein_g, getRecipeDefaultServings(selectedRecipe))}g</span>
                    <span>Carbs: {formatNutritionValue(selectedRecipe.nutrition.carbs_g, getRecipeDefaultServings(selectedRecipe))}g</span>
                    <span>Fat: {formatNutritionValue(selectedRecipe.nutrition.fat_g, getRecipeDefaultServings(selectedRecipe))}g</span>
                    <span>Fiber: {formatNutritionValue(selectedRecipe.nutrition.fiber_g, getRecipeDefaultServings(selectedRecipe))}g</span>
                  </div>
                  {selectedRecipe.nutrition.notes ? <p className="nutrition-note">{selectedRecipe.nutrition.notes}</p> : null}
                </div>
              )}

              {selectedRecipe.instructions.length > 0 && (
                <div className="detail-section">
                  <h3>Instructions</h3>
                  <ol className="instruction-list">
                    {selectedRecipe.instructions.map((instruction) => (
                      <li key={`${selectedRecipe.id}-instruction-${instruction.step_number}`}>
                        {instruction.instruction}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {isRecipeInMealPlan(selectedRecipe.id) ? (
                <div className="meal-plan-status-badge">Added to Meal Plan</div>
              ) : (
                <button type="button" className="primary-button wide-button" onClick={() => toggleMealPlanRecipe(selectedRecipe)}>
                  Add To Meal Plan
                </button>
              )}
            </section>
          ) : editingRecipeId !== null && selectedRecipe ? (
            <section className="panel upload-panel">
              <div className="section-header">
                <h2>Edit Recipe</h2>
                <button type="button" className="text-button" onClick={() => setEditingRecipeId(null)}>
                  Cancel
                </button>
              </div>

              <form className="upload-form" onSubmit={saveEditedRecipe}>
                <label>
                  Recipe title
                  <input name="title" type="text" defaultValue={selectedRecipe.title} />
                </label>
                <label>
                  Description
                  <input name="description" type="text" defaultValue={selectedRecipe.description} />
                </label>
                <label>
                  Keywords
                  <input name="keywords" type="text" defaultValue={selectedRecipe.keywords.join(', ')} />
                </label>
                <div className="subsection-block">
                  <h3>Image</h3>
                  <label className="image-upload-field">
                    <span>Upload recipe photo</span>
                    <input type="file" accept="image/*" onChange={(event) => void handleImageFileChange(event, 'edit')} />
                    {uploadingImage ? <small>Uploading…</small> : null}
                    {(editImageUrl || selectedRecipe.imageUrl) ? (
                      <img src={resolveImageUrl(editImageUrl ?? selectedRecipe.imageUrl) ?? undefined} alt="Recipe preview" className="recipe-preview" />
                    ) : null}
                  </label>
                </div>
                <div className="subsection-block">
                  <h3>Servings</h3>
                  <div className="servings-row">
                    <label>
                      Default
                      <input name="defaultServings" type="number" min="1" defaultValue={selectedRecipe.defaultServings ?? selectedRecipe.servings} />
                    </label>
                    <label>
                      Min
                      <input name="minServings" type="number" min="1" defaultValue={selectedRecipe.servingsMin ?? 1} />
                    </label>
                    <label>
                      Max
                      <input name="maxServings" type="number" min="1" defaultValue={selectedRecipe.servingsMax ?? selectedRecipe.defaultServings ?? selectedRecipe.servings} />
                    </label>
                  </div>
                </div>
                <div className="ingredient-editor">
                  <label>Ingredients (based on default servings)</label>
                  {editIngredientRows.map((row, index) => (
                    <div key={`edit-ingredient-${index}`} className="ingredient-row">
                      <input
                        type="text"
                        className="ingredient-field ingredient-field--name"
                        value={row.name}
                        placeholder="Ingredient name"
                        onChange={(event) => updateIngredientRow(setEditIngredientRows, index, 'name', event.target.value)}
                      />
                      <input
                        type="number"
                        className="ingredient-field ingredient-field--qty"
                        min="0"
                        step="0.25"
                        value={row.quantity}
                        onChange={(event) => updateIngredientRow(setEditIngredientRows, index, 'quantity', event.target.value)}
                      />
                      <input
                        type="text"
                        className="ingredient-field ingredient-field--unit"
                        value={row.unit}
                        placeholder="unit"
                        onChange={(event) => updateIngredientRow(setEditIngredientRows, index, 'unit', event.target.value)}
                      />
                      {editIngredientRows.length > 1 ? (
                        <button type="button" className="icon-button" aria-label="Remove ingredient" onClick={() => removeIngredientRow(setEditIngredientRows, index)}>
                          X
                        </button>
                      ) : null}
                    </div>
                  ))}
                  <button type="button" className="secondary-button" onClick={() => addIngredientRow(setEditIngredientRows)}>
                    Add Ingredient
                  </button>
                </div>
                <div className="ingredient-editor">
                  <label>Cookware</label>
                  {editCookwareRows.map((tool, index) => (
                    <div key={`edit-cookware-${index}`} className="ingredient-row instruction-row">
                      <input
                        type="text"
                        className="ingredient-field ingredient-field--name"
                        value={tool}
                        placeholder="Cookware item"
                        onChange={(event) => {
                          const next = [...editCookwareRows]
                          next[index] = event.target.value
                          setEditCookwareRows(next)
                        }}
                      />
                      {editCookwareRows.length > 1 ? (
                        <button type="button" className="icon-button" aria-label="Remove cookware item" onClick={() => removeCookwareRow(setEditCookwareRows, index)}>
                          X
                        </button>
                      ) : null}
                    </div>
                  ))}
                  <button type="button" className="secondary-button" onClick={() => addCookwareRow(setEditCookwareRows)}>
                    Add Cookware
                  </button>
                </div>
                <div className="ingredient-editor">
                  <label>Cooking Instructions</label>
                  {editInstructionRows.map((step, index) => (
                    <div key={`edit-instruction-${index}`} className="ingredient-row instruction-row">
                      <span className="instruction-step-number">{index + 1}.</span>
                      <textarea
                        className="ingredient-field ingredient-field--name instruction-text-area"
                        value={step}
                        placeholder="Add a cooking step"
                        rows={expandedEditInstructionIndex === index ? 3 : 1}
                        onFocus={() => setExpandedEditInstructionIndex(index)}
                        onBlur={() => setExpandedEditInstructionIndex((current) => (current === index ? null : current))}
                        onChange={(event) => {
                          const next = [...editInstructionRows]
                          next[index] = event.target.value
                          setEditInstructionRows(next)
                        }}
                      />
                      {editInstructionRows.length > 1 ? (
                        <div className="instruction-actions">
                          <button
                            type="button"
                            className="move-button"
                            aria-label="Move instruction up"
                            disabled={index === 0}
                            onClick={() => moveInstructionStep(setEditInstructionRows, index, -1)}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="move-button"
                            aria-label="Move instruction down"
                            disabled={index === editInstructionRows.length - 1}
                            onClick={() => moveInstructionStep(setEditInstructionRows, index, 1)}
                          >
                            ↓
                          </button>
                          <button type="button" className="icon-button" aria-label="Remove instruction step" onClick={() => removeInstructionStep(setEditInstructionRows, index)}>
                            X
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  <button type="button" className="secondary-button" onClick={() => addInstructionStep(setEditInstructionRows)}>
                    Add Step
                  </button>
                </div>
                <div className="subsection-block">
                  <h3>Nutrition (based on default servings)</h3>
                  <div className="nutrition-grid editor-grid">
                    <label>
                      Calories
                      <input name="calories" type="number" min="0" defaultValue={selectedRecipe.nutrition?.calories ?? ''} />
                    </label>
                    <label>
                      Protein (g)
                      <input name="protein" type="number" min="0" defaultValue={selectedRecipe.nutrition?.protein_g ?? ''} />
                    </label>
                    <label>
                      Carbs (g)
                      <input name="carbs" type="number" min="0" defaultValue={selectedRecipe.nutrition?.carbs_g ?? ''} />
                    </label>
                    <label>
                      Fat (g)
                      <input name="fat" type="number" min="0" defaultValue={selectedRecipe.nutrition?.fat_g ?? ''} />
                    </label>
                    <label>
                      Fiber (g)
                      <input name="fiber" type="number" min="0" defaultValue={selectedRecipe.nutrition?.fiber_g ?? ''} />
                    </label>
                  </div>
                </div>
                <label>
                  Nutrition notes
                  <input name="nutritionNotes" type="text" defaultValue={selectedRecipe.nutrition?.notes ?? ''} />
                </label>
                <button type="submit" className="primary-button wide-button">
                  Save Changes
                </button>
              </form>
            </section>
          ) : showUploadForm ? (
            <section className="panel upload-panel">
              <div className="section-header">
                <h2>Upload Recipe</h2>
                <button type="button" className="text-button" onClick={() => setShowUploadForm(false)}>
                  Back
                </button>
              </div>

              <form className="upload-form" onSubmit={handleUploadSubmit}>
                <label>
                  Recipe title
                  <input name="title" type="text" placeholder="e.g. Coconut Chickpea Curry" />
                </label>
                <label>
                  Keywords
                  <input name="keywords" type="text" placeholder="quick, dinner, vegetarian" />
                </label>
                <div className="subsection-block">
                  <h3>Image</h3>
                  <label className="image-upload-field">
                    <span>Upload recipe photo</span>
                    <input type="file" accept="image/*" onChange={(event) => void handleImageFileChange(event, 'upload')} />
                    {uploadingImage ? <small>Uploading…</small> : null}
                    {uploadImageUrl ? <img src={resolveImageUrl(uploadImageUrl) ?? undefined} alt="Recipe preview" className="recipe-preview" /> : null}
                  </label>
                </div>
                <div className="subsection-block">
                  <h3>Servings</h3>
                  <div className="servings-row">
                    <label>
                      Default
                      <input name="defaultServings" type="number" min="1" defaultValue={2} />
                    </label>
                    <label>
                      Min
                      <input name="minServings" type="number" min="1" defaultValue={1} />
                    </label>
                    <label>
                      Max
                      <input name="maxServings" type="number" min="1" defaultValue={4} />
                    </label>
                  </div>
                </div>
                <div className="ingredient-editor">
                  <label>Ingredients</label>
                  {uploadIngredientRows.map((row, index) => (
                    <div key={`upload-ingredient-${index}`} className="ingredient-row">
                      <input
                        type="text"
                        className="ingredient-field ingredient-field--name"
                        value={row.name}
                        placeholder="Ingredient name"
                        onChange={(event) => updateIngredientRow(setUploadIngredientRows, index, 'name', event.target.value)}
                      />
                      <input
                        type="number"
                        className="ingredient-field ingredient-field--qty"
                        min="0"
                        step="0.25"
                        value={row.quantity}
                        onChange={(event) => updateIngredientRow(setUploadIngredientRows, index, 'quantity', event.target.value)}
                      />
                      <input
                        type="text"
                        className="ingredient-field ingredient-field--unit"
                        value={row.unit}
                        placeholder="unit"
                        onChange={(event) => updateIngredientRow(setUploadIngredientRows, index, 'unit', event.target.value)}
                      />
                      {uploadIngredientRows.length > 1 ? (
                        <button type="button" className="icon-button" aria-label="Remove ingredient" onClick={() => removeIngredientRow(setUploadIngredientRows, index)}>
                          X
                        </button>
                      ) : null}
                    </div>
                  ))}
                  <button type="button" className="secondary-button" onClick={() => addIngredientRow(setUploadIngredientRows)}>
                    Add Ingredient
                  </button>
                </div>
                <div className="ingredient-editor">
                  <label>Cookware</label>
                  {uploadCookwareRows.map((tool, index) => (
                    <div key={`upload-cookware-${index}`} className="ingredient-row instruction-row">
                      <input
                        type="text"
                        className="ingredient-field ingredient-field--name"
                        value={tool}
                        placeholder="Cookware item"
                        onChange={(event) => {
                          const next = [...uploadCookwareRows]
                          next[index] = event.target.value
                          setUploadCookwareRows(next)
                        }}
                      />
                      {uploadCookwareRows.length > 1 ? (
                        <button type="button" className="icon-button" aria-label="Remove cookware item" onClick={() => removeCookwareRow(setUploadCookwareRows, index)}>
                          X
                        </button>
                      ) : null}
                    </div>
                  ))}
                  <button type="button" className="secondary-button" onClick={() => addCookwareRow(setUploadCookwareRows)}>
                    Add Cookware
                  </button>
                </div>
                <div className="ingredient-editor">
                  <label>Cooking Instructions</label>
                  {uploadInstructionRows.map((step, index) => (
                    <div key={`upload-instruction-${index}`} className="ingredient-row instruction-row">
                      <span className="instruction-step-number">{index + 1}.</span>
                      <textarea
                        className="ingredient-field ingredient-field--name instruction-text-area"
                        value={step}
                        placeholder="Add a cooking step"
                        rows={expandedUploadInstructionIndex === index ? 3 : 1}
                        onFocus={() => setExpandedUploadInstructionIndex(index)}
                        onBlur={() => setExpandedUploadInstructionIndex((current) => (current === index ? null : current))}
                        onChange={(event) => {
                          const next = [...uploadInstructionRows]
                          next[index] = event.target.value
                          setUploadInstructionRows(next)
                        }}
                      />
                      {uploadInstructionRows.length > 1 ? (
                        <div className="instruction-actions">
                          <button
                            type="button"
                            className="move-button"
                            aria-label="Move instruction up"
                            disabled={index === 0}
                            onClick={() => moveInstructionStep(setUploadInstructionRows, index, -1)}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="move-button"
                            aria-label="Move instruction down"
                            disabled={index === uploadInstructionRows.length - 1}
                            onClick={() => moveInstructionStep(setUploadInstructionRows, index, 1)}
                          >
                            ↓
                          </button>
                          <button type="button" className="icon-button" aria-label="Remove instruction step" onClick={() => removeInstructionStep(setUploadInstructionRows, index)}>
                            X
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  <button type="button" className="secondary-button" onClick={() => addInstructionStep(setUploadInstructionRows)}>
                    Add Step
                  </button>
                </div>
                <div className="subsection-block">
                  <h3>Nutrition (based on default servings)</h3>
                  <div className="nutrition-grid editor-grid">
                    <label>
                      Calories
                      <input name="calories" type="number" min="0" placeholder="540" />
                    </label>
                    <label>
                      Protein (g)
                      <input name="protein" type="number" min="0" placeholder="42" />
                    </label>
                    <label>
                      Carbs (g)
                      <input name="carbs" type="number" min="0" placeholder="18" />
                    </label>
                    <label>
                      Fat (g)
                      <input name="fat" type="number" min="0" placeholder="25" />
                    </label>
                    <label>
                      Fiber (g)
                      <input name="fiber" type="number" min="0" placeholder="6" />
                    </label>
                  </div>
                </div>
                <label>
                  Nutrition notes
                  <input name="nutritionNotes" type="text" placeholder="Optional notes" />
                </label>
                <button type="submit" className="primary-button wide-button">
                  Save Recipe
                </button>
              </form>
            </section>
          ) : (
            <>
              <section className="panel search-panel">
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search recipes or ingredients"
                />
                <div className="chip-row">
                  {['all', 'quick', 'dinner', 'vegetarian'].map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={filter === item ? 'chip active' : 'chip'}
                      onClick={() => setFilter(item)}
                    >
                      {item === 'all' ? 'All' : item}
                    </button>
                  ))}
                </div>
              </section>

              <section className="panel">
                <div className="section-header">
                  <h2>Recipes</h2>
                  <button type="button" className="text-button" onClick={() => setShowUploadForm(true)}>
                    Upload
                  </button>
                </div>

                <div className="stack-list">
                  {loading ? <p className="muted">Loading recipes…</p> : null}
                  {filteredRecipes.map((recipe) => (
                    <article
                      key={recipe.id}
                      className="recipe-card"
                      role="button"
                      tabIndex={0}
                      onClick={() => openRecipeDetails(recipe.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          openRecipeDetails(recipe.id)
                        }
                      }}
                    >
                      <div
                        className={recipe.imageUrl ? 'recipe-thumb has-image' : 'recipe-thumb'}
                        aria-hidden="true"
                        style={recipe.imageUrl ? { backgroundImage: `url(${resolveImageUrl(recipe.imageUrl)})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                      />
                      <div className="recipe-copy">
                        <h3>{recipe.title}</h3>
                        <p>{recipe.description}</p>
                        <p>{getRecipeServingRangeText(recipe)}</p>
                        <p className="muted">
                          {recipe.ingredients.slice(0, 3).map((ingredient) => formatIngredient(ingredient)).join(' • ')}
                        </p>
                        {isRecipeInMealPlan(recipe.id) ? (
                          <div className="meal-plan-status-badge">Added to Meal Plan</div>
                        ) : (
                          <button
                            type="button"
                            className="primary-button"
                            onClick={(event) => {
                              event.stopPropagation()
                              toggleMealPlanRecipe(recipe)
                            }}
                          >
                            Add To Meal Plan
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}
        </main>
      )}

      {deleteConfirmId !== null && (
        <div className="confirm-backdrop" role="dialog" aria-modal="true">
          <div className="confirm-dialog panel">
            <h3>Delete recipe?</h3>
            <p>This removes the recipe from the list and meal plan.</p>
            <div className="confirm-actions">
              <button type="button" className="secondary-button" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={() => void handleDeleteRecipe(deleteConfirmId)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {clearGroceriesConfirm && (
        <div className="confirm-backdrop" role="dialog" aria-modal="true">
          <div className="confirm-dialog panel">
            <h3>Clear grocery list?</h3>
            <p>This removes every item from the grocery list.</p>
            <div className="confirm-actions">
              <button type="button" className="secondary-button" onClick={() => setClearGroceriesConfirm(false)}>
                Cancel
              </button>
              <button type="button" className="danger-button" onClick={clearGroceryList}>
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'plan' && (
        <main className="page">
          <section className="panel">
            <div className="section-header">
              <h2>Current Meal Plan</h2>
              <div className="plan-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    void syncGroceryFromMealPlan()
                  }}
                >
                  Generate Groceries
                </button>
                <button type="button" className="secondary-button" onClick={() => setMealPlan([])}>
                  Reset
                </button>
              </div>
            </div>

            <div className="stack-list">
              {mealPlan.length === 0 ? (
                <p className="muted">No recipes selected yet.</p>
              ) : (
                mealPlan.map((recipe, index) => (
                  <div
                    key={`${recipe.id}-${index}`}
                    className="plan-item"
                    role="button"
                    tabIndex={0}
                    onClick={() => openRecipeDetails(recipe.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openRecipeDetails(recipe.id)
                      }
                    }}
                  >
                    <div>
                      <h3>{recipe.title}</h3>
                      <div className="plan-serving-row">
                        <span>Servings</span>
                        <div className="servings-stepper" onClick={(event) => event.stopPropagation()}>
                          <button
                            type="button"
                            className="stepper-button"
                            aria-label={`Decrease servings for ${recipe.title}`}
                            onClick={() => updateMealPlanServings(recipe.id, (recipe.servings ?? 1) - 1)}
                            disabled={recipe.servings <= (recipe.servingsMin ?? 1)}
                          >
                            −
                          </button>
                          <span className="servings-total">{recipe.servings}</span>
                          <button
                            type="button"
                            className="stepper-button"
                            aria-label={`Increase servings for ${recipe.title}`}
                            onClick={() => updateMealPlanServings(recipe.id, (recipe.servings ?? 1) + 1)}
                            disabled={recipe.servings >= (recipe.servingsMax ?? recipe.defaultServings ?? recipe.servings)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={(event) => {
                        event.stopPropagation()
                        removeMealPlanItem(index)
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </main>
      )}

      {activeTab === 'grocery' && (
        <main className="page">
          <section className="panel">
            <div className="grocery-form-header">
              <h3>Add Groceries</h3>
            </div>

            <div className="manual-row ingredient-row">
              <input
                type="text"
                className="ingredient-field ingredient-field--name"
                value={manualItemRow.name}
                placeholder="Ingredient"
                onChange={(event) => setManualItemRow((current) => ({ ...current, name: event.target.value }))}
              />
              <input
                type="number"
                className="ingredient-field ingredient-field--qty"
                min="0"
                step="0.25"
                value={manualItemRow.quantity}
                onChange={(event) => setManualItemRow((current) => ({ ...current, quantity: event.target.value }))}
              />
              <input
                type="text"
                className="ingredient-field ingredient-field--unit"
                value={manualItemRow.unit}
                placeholder="unit"
                onChange={(event) => setManualItemRow((current) => ({ ...current, unit: event.target.value }))}
              />
              <button type="button" className="icon-button" aria-label="Add manual item" onClick={addManualItem}>
                +
              </button>
            </div>

            <div className="section-header">
              <h2>Grocery List</h2>
            </div>

            <div className="stack-list grocery-list">
              {aggregatedGroceries.map((item, index) => {
                const text = formatGroceryItemText(item)

                return (
                  <label key={`${item.name}-${index}`} className={item.checked ? 'grocery-item checked' : 'grocery-item'}>
                    <div className="grocery-item-content">
                      <div className="grocery-item-main">
                        <span className="grocery-item-name">{text.name}</span>
                        {text.meta ? <span className="grocery-item-meta">{text.meta}</span> : null}
                      </div>
                      <small>{item.source ? item.source.join(', ') : 'Manual Item'}</small>
                    </div>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleGroceryItem(getGroceryKey(item))}
                    />
                  </label>
                )
              })}
            </div>

            <div className="grocery-clear-row">
              <button type="button" className="danger-button" onClick={() => setClearGroceriesConfirm(true)}>
                Clear List
              </button>
            </div>
          </section>
        </main>
      )}

      <nav className="bottom-nav" aria-label="Main navigation">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={activeTab === tab.key ? 'nav-button active' : 'nav-button'}
            onClick={() => {
              if (tab.key === 'recipes') {
                setSelectedRecipeId(null)
                setEditingRecipeId(null)
                setShowUploadForm(false)
              }
              setActiveTab(tab.key)
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default App
