import { useEffect, useMemo, useState } from 'react'
import './App.css'

type TabKey = 'recipes' | 'plan' | 'grocery' | 'upload'

type RecipeNutrition = {
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  fiber_g: number | null
  notes: string | null
}

type Recipe = {
  id: number
  title: string
  description: string
  servings: number
  keywords: string[]
  ingredients: string[]
  nutrition?: RecipeNutrition | null
}

type GroceryItem = {
  name: string
  checked: boolean
  source?: string[]
}

const API_BASE = '/api'
const STORAGE_KEYS = {
  recipes: 'cheffify.recipes',
  mealPlan: 'cheffify.mealPlan',
  groceryItems: 'cheffify.groceryItems',
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

const initialRecipes: Recipe[] = [
  {
    id: 1,
    title: 'Sheet Pan Chicken & Veggies',
    description: 'Simple family dinner',
    servings: 2,
    keywords: ['quick', 'dinner'],
    ingredients: ['Chicken breast', 'Broccoli', 'Tomatoes'],
  },
  {
    id: 2,
    title: 'Lemon Herb Pasta',
    description: 'Fast vegetarian bowl',
    servings: 2,
    keywords: ['vegetarian', 'quick'],
    ingredients: ['Pasta', 'Lemon', 'Parsley'],
  },
  {
    id: 3,
    title: 'Greek Salad Bowls',
    description: 'Healthy lunch option',
    servings: 2,
    keywords: ['lunch', 'vegetarian'],
    ingredients: ['Tomatoes', 'Cucumber', 'Feta'],
  },
]

const defaultGroceryItems: GroceryItem[] = [
  { name: 'Tomatoes', checked: false },
  { name: 'Broccoli', checked: true },
  { name: 'Chicken breast', checked: false },
]

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'recipes', label: 'Recipes' },
  { key: 'plan', label: 'Meal Plan' },
  { key: 'grocery', label: 'Groceries' },
  { key: 'upload', label: 'Upload' },
]

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const saved = readStorage<string>(STORAGE_KEYS.activeTab, 'recipes')
    return saved === 'recipes' || saved === 'plan' || saved === 'grocery' || saved === 'upload'
      ? saved
      : 'recipes'
  })
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [recipes, setRecipes] = useState<Recipe[]>(() => readStorage<Recipe[]>(STORAGE_KEYS.recipes, initialRecipes))
  const [mealPlan, setMealPlan] = useState<Recipe[]>(() => readStorage<Recipe[]>(STORAGE_KEYS.mealPlan, []))
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>(() =>
    readStorage<GroceryItem[]>(STORAGE_KEYS.groceryItems, defaultGroceryItems)
  )
  const [manualItem, setManualItem] = useState('')
  const [loading, setLoading] = useState(true)
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  )
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null)
  const [editingRecipeId, setEditingRecipeId] = useState<number | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [installPrompt, setInstallPrompt] = useState<any>(null)

  const normalizeRecipe = (item: any): Recipe => ({
    id: Number(item.id),
    title: item.title || 'Untitled recipe',
    description: item.description || 'Custom recipe',
    servings: Number(item.default_servings || item.servings || 2),
    keywords: Array.isArray(item.keywords) ? item.keywords : [],
    ingredients: Array.isArray(item.ingredients)
      ? item.ingredients.map((ingredient: any) =>
          typeof ingredient === 'string'
            ? ingredient
            : ingredient.display_name || ingredient.normalized_name || 'Ingredient'
        )
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
  })

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
      const haystack = `${recipe.title} ${recipe.description} ${recipe.ingredients.join(' ')} ${recipe.keywords.join(' ')}`.toLowerCase()
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery)
      return matchesFilter && matchesQuery
    })
  }, [filter, query, recipes])

  const aggregatedGroceries = useMemo(() => {
    const merged = new Map<string, GroceryItem & { source: string[] }>()

    mealPlan.forEach((recipe) => {
      recipe.ingredients.forEach((ingredient) => {
        const current = merged.get(ingredient) ?? {
          name: ingredient,
          checked: false,
          source: [],
        }

        current.source.push(recipe.title)
        merged.set(ingredient, current)
      })
    })

    const list = [...merged.values()].map((item) => ({
      name: item.name,
      checked: false,
      source: item.source,
    }))

    return [...list, ...groceryItems]
  }, [groceryItems, mealPlan])

  const addToMealPlan = (recipe: Recipe) => {
    setMealPlan((current) => [...current, recipe])
    setActiveTab('plan')
  }

  const removeMealPlanItem = (index: number) => {
    setMealPlan((current) => current.filter((_, i) => i !== index))
  }

  const toggleGroceryItem = (index: number) => {
    setGroceryItems((current) =>
      current.map((item, i) => (i === index ? { ...item, checked: !item.checked } : item))
    )
  }

  const addManualItem = () => {
    const trimmed = manualItem.trim()
    if (!trimmed) return
    setGroceryItems((current) => [...current, { name: trimmed, checked: false }])
    setManualItem('')
  }

  const syncGroceryFromMealPlan = async () => {
    if (!mealPlan.length) {
      setGroceryItems(defaultGroceryItems)
      return
    }

    const payload = {
      name: 'Demo meal plan',
      recipe_ids: mealPlan.map((recipe) => recipe.id),
      servings_by_recipe: Object.fromEntries(
        mealPlan.map((recipe) => [String(recipe.id), recipe.servings])
      ),
    }

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
        }))
      : []

    setGroceryItems(nextItems)
  }

  const handleUploadSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const title = String(formData.get('title') || '').trim()
    const keywords = String(formData.get('keywords') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    const rawIngredients = String(formData.get('ingredients') || '')
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean)

    if (!title || rawIngredients.length === 0) {
      return
    }

    const defaultServings = Number(formData.get('defaultServings')) || 2
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
      keywords: keywords.length ? keywords : ['custom'],
      ingredients: rawIngredients,
      nutrition,
    }

    const payload = {
      title,
      description: 'Custom recipe',
      default_servings: defaultServings,
      servings_min: 1,
      servings_max: defaultServings,
      image_url: null,
      source_type: 'custom',
      keywords: localRecipe.keywords,
      tools: [],
      ingredients: rawIngredients.map((ingredient) => ({
        display_name: ingredient,
        normalized_name: ingredient.toLowerCase(),
        quantity: 1,
        unit: null,
        is_optional: false,
        notes: null,
      })),
      instructions: [],
      nutrition: Object.values(nutrition).every((value) => value === null || value === '') ? null : nutrition,
    }

    setRecipes((current) => [localRecipe, ...current])
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

  const saveEditedRecipe = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const id = editingRecipeId ?? selectedRecipeId

    if (id === null) {
      return
    }

    const title = String(formData.get('title') || '').trim()
    const description = String(formData.get('description') || '').trim() || 'Custom recipe'
    const servings = Number(formData.get('servings')) || 2
    const keywords = String(formData.get('keywords') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    const ingredients = String(formData.get('ingredients') || '')
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean)

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

    const patch: Recipe = {
      id,
      title,
      description,
      servings,
      keywords: keywords.length ? keywords : ['custom'],
      ingredients,
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
      default_servings: servings,
      servings_min: 1,
      servings_max: servings,
      image_url: null,
      source_type: 'custom',
      keywords: patch.keywords,
      tools: [],
      ingredients: ingredients.map((ingredient) => ({
        display_name: ingredient,
        normalized_name: ingredient.toLowerCase(),
        quantity: 1,
        unit: null,
        is_optional: false,
        notes: null,
      })),
      instructions: [],
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
                <div className="recipe-thumb detail-thumb" aria-hidden="true" />
                <div>
                  <h2>{selectedRecipe.title}</h2>
                  <p>{selectedRecipe.description}</p>
                </div>
              </div>

              <div className="meta-row">
                <span>Serves {selectedRecipe.servings}</span>
                <span>{selectedRecipe.keywords.join(', ') || 'custom'}</span>
              </div>

              <div className="detail-section">
                <h3>Ingredients</h3>
                <ul>
                  {selectedRecipe.ingredients.map((ingredient) => (
                    <li key={`${selectedRecipe.id}-${ingredient}`}>{ingredient}</li>
                  ))}
                </ul>
              </div>

              {selectedRecipe.nutrition && (
                <div className="detail-section">
                  <h3>Nutrition</h3>
                  <div className="nutrition-grid">
                    <span>Calories: {selectedRecipe.nutrition.calories ?? '—'}</span>
                    <span>Protein: {selectedRecipe.nutrition.protein_g ?? '—'}g</span>
                    <span>Carbs: {selectedRecipe.nutrition.carbs_g ?? '—'}g</span>
                    <span>Fat: {selectedRecipe.nutrition.fat_g ?? '—'}g</span>
                    <span>Fiber: {selectedRecipe.nutrition.fiber_g ?? '—'}g</span>
                  </div>
                  {selectedRecipe.nutrition.notes ? <p className="nutrition-note">{selectedRecipe.nutrition.notes}</p> : null}
                </div>
              )}

              <button type="button" className="primary-button wide-button" onClick={() => addToMealPlan(selectedRecipe)}>
                Add to meal plan
              </button>
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
                <label>
                  Servings
                  <input name="servings" type="number" min="1" defaultValue={selectedRecipe.servings} />
                </label>
                <label>
                  Ingredients
                  <textarea
                    name="ingredients"
                    rows={5}
                    defaultValue={selectedRecipe.ingredients.join('\n')}
                  />
                </label>
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
                <label>
                  Nutrition notes
                  <input name="nutritionNotes" type="text" defaultValue={selectedRecipe.nutrition?.notes ?? ''} />
                </label>
                <button type="submit" className="primary-button wide-button">
                  Save changes
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
                  <button type="button" className="text-button" onClick={() => setActiveTab('upload')}>
                    Upload
                  </button>
                </div>

                <div className="stack-list">
                  {loading ? <p className="muted">Loading recipes…</p> : null}
                  {filteredRecipes.map((recipe) => (
                    <article key={recipe.id} className="recipe-card">
                      <div className="recipe-thumb" aria-hidden="true" />
                      <div className="recipe-copy">
                        <h3>{recipe.title}</h3>
                        <p>{recipe.description}</p>
                        <p>Serves {recipe.servings}</p>
                        <button type="button" className="inline-link" onClick={() => setSelectedRecipeId(recipe.id)}>
                          View details
                        </button>
                        <button type="button" className="primary-button" onClick={() => addToMealPlan(recipe)}>
                          Add to meal plan
                        </button>
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
                  Generate groceries
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
                  <div key={`${recipe.id}-${index}`} className="plan-item">
                    <div>
                      <h3>{recipe.title}</h3>
                      <p>Serves {recipe.servings}</p>
                    </div>
                    <button type="button" className="secondary-button" onClick={() => removeMealPlanItem(index)}>
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
            <div className="section-header">
              <h2>Grocery List</h2>
              <button type="button" className="primary-button" onClick={() => setManualItem('')}>
                Add item
              </button>
            </div>

            <div className="manual-row">
              <input
                type="text"
                value={manualItem}
                onChange={(event) => setManualItem(event.target.value)}
                placeholder="Add a grocery item"
              />
              <button type="button" className="primary-button" onClick={addManualItem}>
                Save
              </button>
            </div>

            <div className="stack-list grocery-list">
              {aggregatedGroceries.map((item, index) => (
                <label key={`${item.name}-${index}`} className={item.checked ? 'grocery-item checked' : 'grocery-item'}>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.source ? item.source.join(', ') : 'Manual item'}</small>
                  </div>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggleGroceryItem(index)}
                  />
                </label>
              ))}
            </div>
          </section>
        </main>
      )}

      {activeTab === 'upload' && (
        <main className="page">
          <section className="panel upload-panel">
            <div className="section-header">
              <h2>Upload Recipe</h2>
              <button type="button" className="text-button" onClick={() => setActiveTab('recipes')}>
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
              <label>
                Default servings
                <input name="defaultServings" type="number" min="1" defaultValue={2} />
              </label>
              <label>
                Ingredients
                <textarea name="ingredients" rows={5} placeholder={'1 can chickpeas\n2 cups coconut milk\n1 onion'} />
              </label>
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
              <label>
                Nutrition notes
                <input name="nutritionNotes" type="text" placeholder="Estimated per full recipe" />
              </label>
              <button type="submit" className="primary-button wide-button">
                Save recipe draft
              </button>
            </form>
          </section>
        </main>
      )}

      <nav className="bottom-nav" aria-label="Main navigation">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={activeTab === tab.key ? 'nav-button active' : 'nav-button'}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default App
