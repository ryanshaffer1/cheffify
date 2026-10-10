import { useEffect, useMemo, useState } from 'react'
import { RecipeDetailPanel } from './components/RecipeDetailPanel'
import { RecipeFormView } from './components/RecipeFormViews'
import { RecipeListView } from './components/RecipeListView'
import { GroceryView } from './components/GroceryView'
import { MealPlanView } from './components/MealPlanView'
import { useGroceries } from './hooks/useGroceries'
import { useMealPlan } from './hooks/useMealPlan'
import { useRecipeEditor } from './hooks/useRecipeEditor'
import { useRecipeImport } from './hooks/useRecipeImport'
import { createRecipe, deleteRecipe, listRecipes, updateRecipe, uploadRecipeImage } from './services/recipeApi'
import type {
  Recipe,
  TabKey,
} from './types/recipe'
import {
  formatIngredient,
  formatNutritionValue,
  getRecipeDefaultServings,
  getRecipeServingRangeText,
  makeIngredient,
  normalizeIngredientUnit,
  resolveImageUrl,
} from './utils/recipeFormatting'
import { normalizeRecipe } from './utils/normalizeRecipe'
import './App.css'

const STORAGE_KEYS = {
  recipes: 'cheffify.recipes',
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
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const selectedRecipe = useMemo(
    () => recipes.find((recipe) => recipe.id === selectedRecipeId) ?? null,
    [recipes, selectedRecipeId]
  )
  const editor = useRecipeEditor(selectedRecipe)
  const recipeImport = useRecipeImport((imported) => {
    if (!imported.title.trim()) {
      window.alert('This file does not contain readable recipe text. Please try a clearer file or add more OCR tuning later.')
      return
    }
    editor.applyImportedRecipe(imported)
    setShowUploadForm(true)
  })
  const {
    mealPlan,
    setMealPlan,
    isRecipeInMealPlan,
    toggleMealPlanRecipe,
    updateMealPlanServings,
    removeMealPlanItem,
    removeRecipe: removeRecipeFromMealPlan,
  } = useMealPlan()
  const groceries = useGroceries(mealPlan)
  const [loading, setLoading] = useState(true)
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  )
  const [editingRecipeId, setEditingRecipeId] = useState<number | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [savingRecipe, setSavingRecipe] = useState(false)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.recipes, JSON.stringify(recipes))
  }, [recipes])

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
      const payload = await listRecipes()
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

  const openRecipeDetails = (recipeId: number) => {
    setSelectedRecipeId(recipeId)
    setActiveTab('recipes')
  }

  const handleImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>, mode: 'upload' | 'edit') => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      setUploadingImage(true)
      const nextUrl = await uploadRecipeImage(file)

      if (mode === 'upload') {
        editor.setUploadImageUrl(nextUrl)
      } else {
        editor.setEditImageUrl(nextUrl)
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
    const fields = editor.uploadFields
    const title = fields.title.trim()
    const keywords = fields.keywords
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    const parsedIngredients = editor.uploadIngredientRows
      .filter((row) => row.name.trim())
      .map((row) => {
        const quantity = Number(row.quantity)
        const normalizedQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1
        const normalizedUnit = normalizeIngredientUnit(row.unit)
        return makeIngredient(row.name.trim(), normalizedQuantity, normalizedUnit)
      })
    const parsedInstructions = editor.uploadInstructionRows
      .map((step) => ({
        instruction: step.instruction.trim(),
        ingredientNames: step.ingredientNames,
      }))
      .filter((step) => step.instruction)
      .map((step, index) => {
        const ingredientNames = [...step.ingredientNames]
        return {
          step_number: index + 1,
          instruction: step.instruction,
          ingredient_names: ingredientNames,
        }
      })
    const parsedTools = editor.uploadCookwareRows.map((tool) => tool.trim()).filter(Boolean)

    if (!title || parsedIngredients.length === 0) {
      return
    }

    const defaultServings = Number(fields.defaultServings) || 2
    const minServings = Number(fields.minServings) || 1
    const maxServings = Number(fields.maxServings) || defaultServings
    const normalizedMinServings = Math.max(1, minServings)
    const normalizedMaxServings = Math.max(defaultServings, maxServings)
    const nutrition = {
      calories: Number(fields.calories) || null,
      protein_g: Number(fields.protein) || null,
      carbs_g: Number(fields.carbs) || null,
      fat_g: Number(fields.fat) || null,
      fiber_g: Number(fields.fiber) || null,
      notes: fields.nutritionNotes.trim() || null,
    }
    const localRecipe: Recipe = {
      id: Date.now(),
      title,
      description: 'Custom recipe',
      servings: defaultServings,
      defaultServings,
      servingsMin: normalizedMinServings,
      servingsMax: normalizedMaxServings,
      imageUrl: editor.uploadImageUrl,
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
      image_url: editor.uploadImageUrl,
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
    editor.resetUpload()
    setShowUploadForm(false)
    setSelectedRecipeId(localRecipe.id)
    setActiveTab('recipes')
    if (!online) {
      return
    }

    try {
      const created = await createRecipe(payload)
      if (created) {
        const normalizedCreated = normalizeRecipe(created)
        setRecipes((current) => [normalizedCreated, ...current.filter((item) => item.id !== localRecipe.id)])
        setSelectedRecipeId(normalizedCreated.id)
      }
    } catch {
      // Keep local draft when the server is temporarily unavailable.
    }
  }

  const saveEditedRecipe = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const id = editingRecipeId ?? selectedRecipeId

    if (id === null || savingRecipe) {
      return
    }

    setSavingRecipe(true)

    const fields = editor.editFields
    const title = fields.title.trim()
    const description = fields.description.trim() || 'Custom recipe'
    const defaultServings = Number(fields.defaultServings) || 2
    const minServings = Number(fields.minServings) || 1
    const maxServings = Number(fields.maxServings) || defaultServings
    const normalizedMinServings = Math.max(1, minServings)
    const normalizedMaxServings = Math.max(defaultServings, maxServings)
    const keywords = fields.keywords
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    const ingredients = editor.editIngredientRows
      .filter((row) => row.name.trim())
      .map((row) => {
        const quantity = Number(row.quantity)
        const normalizedQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1
        const normalizedUnit = normalizeIngredientUnit(row.unit)
        return {
          ...makeIngredient(row.name.trim(), normalizedQuantity, normalizedUnit),
          id: row.id,
        }
      })
    const instructionSteps = editor.editInstructionRows
      .map((step) => ({
        instruction: step.instruction.trim(),
        ingredientNames: step.ingredientNames,
        ingredientIds: step.ingredientIds,
      }))
      .filter((step) => step.instruction)
      .map((step, index) => {
        const ingredientNames = step.ingredientIds.length
          ? step.ingredientIds
              .map((id) => {
                const ingredient = ingredients.find((item) => item.id === id)
                return ingredient?.display_name
              })
              .filter((name): name is string => Boolean(name))
          : step.ingredientNames
        return {
          step_number: index + 1,
          instruction: step.instruction,
          ingredient_ids: step.ingredientIds,
          ingredient_names: ingredientNames,
        }
      })
    const cookware = editor.editCookwareRows.map((tool) => tool.trim()).filter(Boolean)

    if (!title || ingredients.length === 0) {
      setSavingRecipe(false)
      return
    }

    const nutrition = {
      calories: Number(fields.calories) || null,
      protein_g: Number(fields.protein) || null,
      carbs_g: Number(fields.carbs) || null,
      fat_g: Number(fields.fat) || null,
      fiber_g: Number(fields.fiber) || null,
      notes: fields.nutritionNotes.trim() || null,
    }

    const nextImageUrl = editor.editImageUrl ?? selectedRecipe?.imageUrl ?? null

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

    if (!online) {
      setRecipes((current) => current.map((recipe) => (recipe.id === id ? patch : recipe)))
      setSelectedRecipeId(id)
      setEditingRecipeId(null)
      setSavingRecipe(false)
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
        id: ingredient.id ?? null,
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
      const updated = await updateRecipe(id, payload)
      setRecipes((current) => current.map((recipe) => (recipe.id === id ? normalizeRecipe(updated) : recipe)))
      setSelectedRecipeId(id)
      setEditingRecipeId(null)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to save this recipe.')
    } finally {
      setSavingRecipe(false)
    }
  }

  const handleDeleteRecipe = async (recipeId: number) => {
    const recipe = recipes.find((item) => item.id === recipeId)
    if (!recipe) {
      return
    }

    setRecipes((current) => current.filter((item) => item.id !== recipeId))
    removeRecipeFromMealPlan(recipeId)
    setSelectedRecipeId(null)
    setEditingRecipeId(null)
    setDeleteConfirmId(null)

    if (!online) {
      return
    }

    try {
      await deleteRecipe(recipeId)
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
            <RecipeDetailPanel
              recipe={selectedRecipe}
              isInMealPlan={isRecipeInMealPlan(selectedRecipe.id)}
              onBack={() => setSelectedRecipeId(null)}
              onEdit={() => setEditingRecipeId(selectedRecipe.id)}
              onDelete={() => setDeleteConfirmId(selectedRecipe.id)}
              onAddToMealPlan={() => toggleMealPlanRecipe(selectedRecipe)}
              resolveImageUrl={resolveImageUrl}
              getServingRangeText={getRecipeServingRangeText}
              getDefaultServings={getRecipeDefaultServings}
              formatIngredient={formatIngredient}
              formatNutritionValue={formatNutritionValue}
            />
          ) : editingRecipeId !== null && selectedRecipe ? (
            <RecipeFormView
              mode="edit"
              recipe={selectedRecipe}
              fields={editor.editFields}
              setFields={editor.setEditFields}
              ingredientRows={editor.editIngredientRows}
              setIngredientRows={editor.setEditIngredientRows}
              instructionRows={editor.editInstructionRows}
              setInstructionRows={editor.setEditInstructionRows}
              cookwareRows={editor.editCookwareRows}
              setCookwareRows={editor.setEditCookwareRows}
              imageUrl={editor.editImageUrl}
              uploadingImage={uploadingImage}
              saving={savingRecipe}
              expandedInstructionIndex={editor.expandedEditInstructionIndex}
              setExpandedInstructionIndex={editor.setExpandedEditInstructionIndex}
              onBack={() => setEditingRecipeId(null)}
              onSubmit={saveEditedRecipe}
              onImageChange={(event) => void handleImageFileChange(event, 'edit')}
              updateIngredientRow={(index, field, value) => editor.updateRow(editor.setEditIngredientRows, index, field, value)}
              addIngredientRow={() => editor.addIngredient(editor.setEditIngredientRows)}
              removeIngredientRow={(index) => editor.removeIngredient(editor.setEditIngredientRows, editor.setEditInstructionRows, index)}
              addCookwareRow={() => editor.addCookware(editor.setEditCookwareRows)}
              removeCookwareRow={(index) => editor.removeCookware(editor.setEditCookwareRows, index)}
              addStep={() => editor.addStep(editor.setEditInstructionRows)}
              removeStep={(index) => editor.removeStep(editor.setEditInstructionRows, index)}
              moveStep={(index, direction) => editor.moveStep(editor.setEditInstructionRows, index, direction)}
              toggleIngredient={(index, ingredient) => editor.toggleIngredient(editor.setEditInstructionRows, index, ingredient)}
            />
          ) : showUploadForm ? (
            <RecipeFormView
              mode="upload"
              fields={editor.uploadFields}
              setFields={editor.setUploadFields}
              ingredientRows={editor.uploadIngredientRows}
              setIngredientRows={editor.setUploadIngredientRows}
              instructionRows={editor.uploadInstructionRows}
              setInstructionRows={editor.setUploadInstructionRows}
              cookwareRows={editor.uploadCookwareRows}
              setCookwareRows={editor.setUploadCookwareRows}
              imageUrl={editor.uploadImageUrl}
              uploadingImage={uploadingImage}
              importing={recipeImport.importing}
              pendingFiles={recipeImport.pendingFiles}
              expandedInstructionIndex={editor.expandedUploadInstructionIndex}
              setExpandedInstructionIndex={editor.setExpandedUploadInstructionIndex}
              onBack={() => setShowUploadForm(false)}
              onSubmit={handleUploadSubmit}
              onImageChange={(event) => void handleImageFileChange(event, 'upload')}
              onImportFileChange={(event) => void recipeImport.handleFileChange(event)}
              onImportPending={(files) => void recipeImport.importFiles(files)}
              onMovePendingFile={recipeImport.movePendingFile}
              onRemovePendingFile={recipeImport.removePendingFile}
              updateIngredientRow={(index, field, value) => editor.updateRow(editor.setUploadIngredientRows, index, field, value)}
              addIngredientRow={() => editor.addIngredient(editor.setUploadIngredientRows)}
              removeIngredientRow={(index) => editor.removeIngredient(editor.setUploadIngredientRows, editor.setUploadInstructionRows, index)}
              addCookwareRow={() => editor.addCookware(editor.setUploadCookwareRows)}
              removeCookwareRow={(index) => editor.removeCookware(editor.setUploadCookwareRows, index)}
              addStep={() => editor.addStep(editor.setUploadInstructionRows)}
              removeStep={(index) => editor.removeStep(editor.setUploadInstructionRows, index)}
              moveStep={(index, direction) => editor.moveStep(editor.setUploadInstructionRows, index, direction)}
              toggleIngredient={(index, ingredient) => editor.toggleIngredient(editor.setUploadInstructionRows, index, ingredient)}
            />
          ) : (
            <RecipeListView
              recipes={filteredRecipes}
              loading={loading}
              query={query}
              filter={filter}
              onQueryChange={setQuery}
              onFilterChange={setFilter}
              onUpload={() => setShowUploadForm(true)}
              onOpenRecipe={openRecipeDetails}
              isRecipeInMealPlan={isRecipeInMealPlan}
              onToggleMealPlanRecipe={toggleMealPlanRecipe}
              resolveImageUrl={resolveImageUrl}
              getServingRangeText={getRecipeServingRangeText}
              formatIngredient={formatIngredient}
            />
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
        <MealPlanView
          mealPlan={mealPlan}
          onGenerateGroceries={() => void groceries.syncGroceryFromMealPlan()}
          onReset={() => setMealPlan([])}
          onOpenRecipe={openRecipeDetails}
          onUpdateServings={updateMealPlanServings}
          onRemove={removeMealPlanItem}
        />
      )}

      {activeTab === 'grocery' && (
        <GroceryView
          manualItemRow={groceries.manualItemRow}
          setManualItemRow={groceries.setManualItemRow}
          items={groceries.aggregatedGroceries}
          onAddItem={groceries.addManualItem}
          onToggleItem={groceries.toggleGroceryItem}
          onClear={groceries.clearGroceryList}
        />
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
