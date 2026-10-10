import { useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { ImportedRecipe, IngredientEditorRow, InstructionStep, Recipe, RecipeIngredient } from '../types/recipe'
import { createEmptyRecipeFormFields } from '../types/recipeForm'
import type { RecipeFormFields } from '../types/recipeForm'
import { normalizeDisplayName } from '../utils/text'

export const createIngredientRow = (id?: number): IngredientEditorRow => ({ id, name: '', quantity: '1', unit: '' })
export const createInstructionStep = (): InstructionStep => ({ instruction: '', ingredientIds: [], ingredientNames: [] })
export const createCookwareRow = (): string => ''

const fieldsForRecipe = (recipe: Recipe | null): RecipeFormFields => recipe ? ({
  title: recipe.title,
  description: recipe.description,
  keywords: recipe.keywords.join(', '),
  defaultServings: String(recipe.defaultServings ?? recipe.servings ?? 2),
  minServings: String(recipe.servingsMin ?? 1),
  maxServings: String(recipe.servingsMax ?? recipe.defaultServings ?? recipe.servings ?? 4),
  calories: recipe.nutrition?.calories == null ? '' : String(recipe.nutrition.calories),
  protein: recipe.nutrition?.protein_g == null ? '' : String(recipe.nutrition.protein_g),
  carbs: recipe.nutrition?.carbs_g == null ? '' : String(recipe.nutrition.carbs_g),
  fat: recipe.nutrition?.fat_g == null ? '' : String(recipe.nutrition.fat_g),
  fiber: recipe.nutrition?.fiber_g == null ? '' : String(recipe.nutrition.fiber_g),
  nutritionNotes: recipe.nutrition?.notes ?? '',
}) : createEmptyRecipeFormFields()

export function useRecipeEditor(selectedRecipe: Recipe | null) {
  const [uploadFields, setUploadFields] = useState<RecipeFormFields>(createEmptyRecipeFormFields)
  const [editFields, setEditFields] = useState<RecipeFormFields>(createEmptyRecipeFormFields)
  const [uploadIngredientRows, setUploadIngredientRows] = useState<IngredientEditorRow[]>([createIngredientRow()])
  const [uploadInstructionRows, setUploadInstructionRows] = useState<InstructionStep[]>([createInstructionStep()])
  const [uploadCookwareRows, setUploadCookwareRows] = useState<string[]>([createCookwareRow()])
  const [editIngredientRows, setEditIngredientRows] = useState<IngredientEditorRow[]>([createIngredientRow()])
  const [editInstructionRows, setEditInstructionRows] = useState<InstructionStep[]>([createInstructionStep()])
  const [editCookwareRows, setEditCookwareRows] = useState<string[]>([createCookwareRow()])
  const [uploadImageUrl, setUploadImageUrl] = useState<string | null>(null)
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null)
  const [expandedUploadInstructionIndex, setExpandedUploadInstructionIndex] = useState<number | null>(null)
  const [expandedEditInstructionIndex, setExpandedEditInstructionIndex] = useState<number | null>(null)

  useEffect(() => {
    setEditFields(fieldsForRecipe(selectedRecipe))
    setEditIngredientRows(selectedRecipe?.ingredients.length
      ? selectedRecipe.ingredients.map((ingredient) => ({
          id: ingredient.id,
          name: ingredient.display_name,
          quantity: String(ingredient.quantity),
          unit: ingredient.unit && ingredient.unit.toLowerCase() !== 'item' ? ingredient.unit : '',
        }))
      : [createIngredientRow()])
    setEditInstructionRows(selectedRecipe?.instructions.length
      ? selectedRecipe.instructions.map((instruction) => ({
          instruction: instruction.instruction,
          ingredientIds: instruction.ingredient_ids ?? [],
          ingredientNames: instruction.ingredient_ids?.length ? [] : instruction.ingredient_names ?? [],
        }))
      : [createInstructionStep()])
    setEditCookwareRows(selectedRecipe?.tools.length ? selectedRecipe.tools : [createCookwareRow()])
    setEditImageUrl(selectedRecipe?.imageUrl ?? null)
  }, [selectedRecipe])

  const updateRow = <T extends IngredientEditorRow[]>(setter: Dispatch<SetStateAction<T>>, index: number, field: 'name' | 'quantity' | 'unit', value: string) => {
    setter((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row) as T)
  }
  const addIngredient = (setter: Dispatch<SetStateAction<IngredientEditorRow[]>>) => setter((current) => [...current, createIngredientRow()])
  const removeIngredient = (setter: Dispatch<SetStateAction<IngredientEditorRow[]>>, instructionSetter: Dispatch<SetStateAction<InstructionStep[]>>, index: number) => {
    setter((current) => {
      const removed = current[index]
      if (current.length === 1) return [createIngredientRow()]
      if (removed) instructionSetter((steps) => steps.map((step) => ({
        ...step,
        ingredientIds: removed.id == null ? step.ingredientIds : step.ingredientIds.filter((id) => id !== removed.id),
        ingredientNames: removed.name.trim()
          ? step.ingredientNames.filter((name) => normalizeDisplayName(name) !== normalizeDisplayName(removed.name))
          : step.ingredientNames,
      })))
      return current.filter((_, rowIndex) => rowIndex !== index)
    })
  }
  const addStep = (setter: Dispatch<SetStateAction<InstructionStep[]>>) => setter((current) => [...current, createInstructionStep()])
  const removeStep = (setter: Dispatch<SetStateAction<InstructionStep[]>>, index: number) => setter((current) => current.length === 1 ? [createInstructionStep()] : current.filter((_, rowIndex) => rowIndex !== index))
  const moveStep = (setter: Dispatch<SetStateAction<InstructionStep[]>>, index: number, direction: -1 | 1) => setter((current) => {
    const target = index + direction
    if (target < 0 || target >= current.length) return current
    const next = [...current]
    ;[next[index], next[target]] = [next[target], next[index]]
    return next
  })
  const toggleIngredient = (setter: Dispatch<SetStateAction<InstructionStep[]>>, stepIndex: number, ingredient: RecipeIngredient) => setter((current) => current.map((step, index) => {
    if (index !== stepIndex) return step
    const hasId = ingredient.id != null
    const selected = hasId
      ? step.ingredientIds.includes(ingredient.id!)
      : step.ingredientNames.some((name) => normalizeDisplayName(name) === normalizeDisplayName(ingredient.normalized_name))
    if (selected) return {
      ...step,
      ingredientIds: hasId ? step.ingredientIds.filter((id) => id !== ingredient.id) : step.ingredientIds,
      ingredientNames: hasId ? step.ingredientNames : step.ingredientNames.filter((name) => normalizeDisplayName(name) !== normalizeDisplayName(ingredient.normalized_name)),
    }
    return {
      ...step,
      ingredientIds: hasId ? [...step.ingredientIds, ingredient.id!] : step.ingredientIds,
      ingredientNames: hasId ? step.ingredientNames : [...step.ingredientNames, ingredient.display_name],
    }
  }))
  const addCookware = (setter: Dispatch<SetStateAction<string[]>>) => setter((current) => [...current, createCookwareRow()])
  const removeCookware = (setter: Dispatch<SetStateAction<string[]>>, index: number) => setter((current) => current.length === 1 ? [createCookwareRow()] : current.filter((_, rowIndex) => rowIndex !== index))

  const applyImportedRecipe = (imported: ImportedRecipe) => {
    setUploadFields({
      title: imported.title,
      description: 'Custom recipe',
      keywords: imported.keywords.join(', '),
      defaultServings: String(imported.default_servings || 2),
      minServings: String(imported.min_servings || 1),
      maxServings: String(imported.max_servings || imported.default_servings || 2),
      calories: imported.nutrition.calories == null ? '' : String(imported.nutrition.calories),
      protein: imported.nutrition.protein_g == null ? '' : String(imported.nutrition.protein_g),
      carbs: imported.nutrition.carbs_g == null ? '' : String(imported.nutrition.carbs_g),
      fat: imported.nutrition.fat_g == null ? '' : String(imported.nutrition.fat_g),
      fiber: imported.nutrition.fiber_g == null ? '' : String(imported.nutrition.fiber_g),
      nutritionNotes: imported.nutrition.notes || '',
    })
    setUploadIngredientRows(imported.ingredients.length ? imported.ingredients.map((ingredient) => ({
      name: ingredient.display_name,
      quantity: String(ingredient.quantity || 1),
      unit: ingredient.unit || '',
    })) : [createIngredientRow()])
    setUploadInstructionRows(imported.instructions.length ? imported.instructions.map((instruction) => ({
      instruction: instruction.instruction,
      ingredientIds: [],
      ingredientNames: instruction.ingredient_names ?? [],
    })) : [createInstructionStep()])
    setUploadCookwareRows(imported.tools.length ? imported.tools : [createCookwareRow()])
    setUploadImageUrl(null)
  }

  const resetUpload = () => {
    setUploadFields(createEmptyRecipeFormFields())
    setUploadIngredientRows([createIngredientRow()])
    setUploadInstructionRows([createInstructionStep()])
    setUploadCookwareRows([createCookwareRow()])
    setUploadImageUrl(null)
  }

  return {
    uploadFields, setUploadFields, editFields, setEditFields,
    uploadIngredientRows, setUploadIngredientRows, uploadInstructionRows, setUploadInstructionRows,
    uploadCookwareRows, setUploadCookwareRows, editIngredientRows, setEditIngredientRows,
    editInstructionRows, setEditInstructionRows, editCookwareRows, setEditCookwareRows,
    uploadImageUrl, setUploadImageUrl, editImageUrl, setEditImageUrl,
    expandedUploadInstructionIndex, setExpandedUploadInstructionIndex,
    expandedEditInstructionIndex, setExpandedEditInstructionIndex,
    updateRow, addIngredient, removeIngredient, addStep, removeStep, moveStep,
    toggleIngredient, addCookware, removeCookware, applyImportedRecipe, resetUpload,
  }
}