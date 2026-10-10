import type { Recipe } from '../types/recipe'

type RecipeDetailPanelProps = {
  recipe: Recipe
  isInMealPlan: boolean
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  onAddToMealPlan: () => void
  resolveImageUrl: (imageUrl?: string | null) => string | null
  getServingRangeText: (recipe: Recipe) => string
  getDefaultServings: (recipe: Recipe) => number
  formatIngredient: (ingredient: Recipe['ingredients'][number]) => string
  formatNutritionValue: (value: number | null | undefined, servings: number) => string
}

export function RecipeDetailPanel({
  recipe,
  isInMealPlan,
  onBack,
  onEdit,
  onDelete,
  onAddToMealPlan,
  resolveImageUrl,
  getServingRangeText,
  getDefaultServings,
  formatIngredient,
  formatNutritionValue,
}: RecipeDetailPanelProps) {
  const defaultServings = getDefaultServings(recipe)

  return (
    <section className="panel detail-panel">
      <div className="section-header">
        <button type="button" className="text-button" onClick={onBack}>
          Back
        </button>
        <div className="section-header-actions">
          <button type="button" className="secondary-button" onClick={onEdit}>
            Edit
          </button>
          <button type="button" className="danger-button" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>

      <div className="recipe-detail-header">
        <div
          className={recipe.imageUrl ? 'recipe-thumb detail-thumb has-image' : 'recipe-thumb detail-thumb'}
          aria-hidden="true"
          style={recipe.imageUrl ? { backgroundImage: `url(${resolveImageUrl(recipe.imageUrl)})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        />
        <div>
          <h2>{recipe.title}</h2>
          <p>{recipe.description}</p>
        </div>
      </div>

      <div className="meta-row">
        <span>{getServingRangeText(recipe)}</span>
        <span>{recipe.keywords.join(', ') || 'custom'}</span>
      </div>

      <div className="detail-section">
        <h3>Ingredients ({defaultServings} Serving{defaultServings !== 1 ? 's' : ''})</h3>
        <ul>
          {recipe.ingredients.map((ingredient, index) => (
            <li key={`${recipe.id}-${ingredient.normalized_name}-${index}`}>
              {formatIngredient(ingredient)}
            </li>
          ))}
        </ul>
      </div>

      {recipe.tools.length > 0 && (
        <div className="detail-section">
          <h3>Cookware</h3>
          <ul>
            {recipe.tools.map((tool, index) => (
              <li key={`${recipe.id}-tool-${tool}-${index}`}>{tool}</li>
            ))}
          </ul>
        </div>
      )}

      {recipe.nutrition && (
        <div className="detail-section">
          <h3>Nutrition per Serving</h3>
          <div className="nutrition-grid">
            <span>Calories: {formatNutritionValue(recipe.nutrition.calories, defaultServings)}</span>
            <span>Protein: {formatNutritionValue(recipe.nutrition.protein_g, defaultServings)}g</span>
            <span>Carbs: {formatNutritionValue(recipe.nutrition.carbs_g, defaultServings)}g</span>
            <span>Fat: {formatNutritionValue(recipe.nutrition.fat_g, defaultServings)}g</span>
            <span>Fiber: {formatNutritionValue(recipe.nutrition.fiber_g, defaultServings)}g</span>
          </div>
          {recipe.nutrition.notes ? <p className="nutrition-note">{recipe.nutrition.notes}</p> : null}
        </div>
      )}

      {recipe.instructions.length > 0 && (
        <div className="detail-section">
          <h3>Instructions</h3>
          <ol className="instruction-list">
            {recipe.instructions.map((instruction) => {
              const linkedIngredients = instruction.ingredient_names?.length
                ? instruction.ingredient_names
                : instruction.ingredient_ids
                    ?.map((ingredientId) =>
                      recipe.ingredients.find((ingredient) => ingredient.id === ingredientId)?.display_name
                    )
                    .filter((name): name is string => Boolean(name)) ?? []

              return (
                <li key={`${recipe.id}-instruction-${instruction.step_number}`}>
                  <span>{instruction.instruction}</span>
                  {linkedIngredients.length > 0 ? (
                    <span className="instruction-ingredients">
                      Ingredients: {linkedIngredients.join(', ')}
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {isInMealPlan ? (
        <div className="meal-plan-status-badge">Added to Meal Plan</div>
      ) : (
        <button type="button" className="primary-button wide-button" onClick={onAddToMealPlan}>
          Add To Meal Plan
        </button>
      )}
    </section>
  )
}