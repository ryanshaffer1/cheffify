import type { Recipe } from '../types/recipe'

type MealPlanViewProps = {
  mealPlan: Recipe[]
  onGenerateGroceries: () => void
  onReset: () => void
  onOpenRecipe: (recipeId: number) => void
  onUpdateServings: (recipeId: number, servings: number) => void
  onRemove: (index: number) => void
}

export function MealPlanView({ mealPlan, onGenerateGroceries, onReset, onOpenRecipe, onUpdateServings, onRemove }: MealPlanViewProps) {
  return (
    <main className="page">
      <section className="panel">
        <div className="section-header">
          <h2>Current Meal Plan</h2>
          <div className="plan-actions">
            <button type="button" className="secondary-button" onClick={onGenerateGroceries}>Generate Groceries</button>
            <button type="button" className="secondary-button" onClick={onReset}>Reset</button>
          </div>
        </div>
        <div className="stack-list">
          {mealPlan.length === 0 ? <p className="muted">No recipes selected yet.</p> : mealPlan.map((recipe, index) => (
            <div key={`${recipe.id}-${index}`} className="plan-item" role="button" tabIndex={0}
              onClick={() => onOpenRecipe(recipe.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onOpenRecipe(recipe.id)
                }
              }}>
              <div>
                <h3>{recipe.title}</h3>
                <div className="plan-serving-row">
                  <span>Servings</span>
                  <div className="servings-stepper" onClick={(event) => event.stopPropagation()}>
                    <button type="button" className="stepper-button" aria-label={`Decrease servings for ${recipe.title}`}
                      onClick={() => onUpdateServings(recipe.id, recipe.servings - 1)} disabled={recipe.servings <= (recipe.servingsMin ?? 1)}>−</button>
                    <span className="servings-total">{recipe.servings}</span>
                    <button type="button" className="stepper-button" aria-label={`Increase servings for ${recipe.title}`}
                      onClick={() => onUpdateServings(recipe.id, recipe.servings + 1)} disabled={recipe.servings >= (recipe.servingsMax ?? recipe.defaultServings ?? recipe.servings)}>+</button>
                  </div>
                </div>
              </div>
              <button type="button" className="secondary-button" onClick={(event) => { event.stopPropagation(); onRemove(index) }}>Remove</button>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}