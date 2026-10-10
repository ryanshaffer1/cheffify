import type { InstructionStep, RecipeIngredient } from '../types/recipe'
import { normalizeDisplayName } from '../utils/text'

type IngredientStepPickerProps = {
  ingredients: RecipeIngredient[]
  step: InstructionStep
  onToggle: (ingredient: RecipeIngredient) => void
  label: string
}

const getIngredientKey = (ingredient: RecipeIngredient): string =>
  ingredient.id != null ? `id:${ingredient.id}` : `name:${ingredient.normalized_name}`

export function IngredientStepPicker({ ingredients, step, onToggle, label }: IngredientStepPickerProps) {
  const selectedIngredientIds = new Set(step.ingredientIds)
  const selectedIngredientNames = new Set(step.ingredientNames.map(normalizeDisplayName))
  const selectedIngredients = ingredients.filter((ingredient) =>
    ingredient.id != null
      ? selectedIngredientIds.has(ingredient.id)
      : selectedIngredientNames.has(normalizeDisplayName(ingredient.normalized_name))
  )

  return (
    <div className="ingredient-step-picker" aria-label={`${label} ingredients`}>
      <div className="ingredient-step-picker-label">
        <span>Ingredients in this step</span>
        <span>{selectedIngredients.length === 1 ? '1 linked' : `${selectedIngredients.length} linked`}</span>
      </div>
      <div className="ingredient-step-picker-list" role="list">
        {ingredients.length ? (
          ingredients.map((ingredient, index) => {
            const key = `${getIngredientKey(ingredient)}:${index}`
            const selected = ingredient.id != null
              ? selectedIngredientIds.has(ingredient.id)
              : selectedIngredientNames.has(normalizeDisplayName(ingredient.normalized_name))
            return (
              <button
                type="button"
                key={key}
                className={`ingredient-step-chip${selected ? ' selected' : ''}`}
                aria-pressed={selected}
                title={`Link ${ingredient.display_name} to this step`}
                onClick={() => onToggle(ingredient)}
              >
                {ingredient.display_name}
                {selected ? <span aria-hidden="true">✓</span> : null}
              </button>
            )
          })
        ) : (
          <span className="ingredient-step-picker-empty">Add an ingredient above to link it here.</span>
        )}
      </div>
    </div>
  )
}