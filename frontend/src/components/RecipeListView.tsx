import type { Recipe } from '../types/recipe'

type RecipeListViewProps = {
  recipes: Recipe[]
  loading: boolean
  query: string
  filter: string
  onQueryChange: (query: string) => void
  onFilterChange: (filter: string) => void
  onUpload: () => void
  onOpenRecipe: (recipeId: number) => void
  isRecipeInMealPlan: (recipeId: number) => boolean
  onToggleMealPlanRecipe: (recipe: Recipe) => void
  resolveImageUrl: (imageUrl?: string | null) => string | null
  getServingRangeText: (recipe: Recipe) => string
  formatIngredient: (ingredient: Recipe['ingredients'][number]) => string
}

const filters = ['all', 'quick', 'dinner', 'vegetarian']

export function RecipeListView({
  recipes,
  loading,
  query,
  filter,
  onQueryChange,
  onFilterChange,
  onUpload,
  onOpenRecipe,
  isRecipeInMealPlan,
  onToggleMealPlanRecipe,
  resolveImageUrl,
  getServingRangeText,
  formatIngredient,
}: RecipeListViewProps) {
  return (
    <main className="page">
      <section className="panel search-panel">
        <input type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search recipes or ingredients" />
        <div className="chip-row">
          {filters.map((item) => (
            <button key={item} type="button" className={filter === item ? 'chip active' : 'chip'} onClick={() => onFilterChange(item)}>
              {item === 'all' ? 'All' : item}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-header">
          <h2>Recipes</h2>
          <button type="button" className="text-button" onClick={onUpload}>Upload</button>
        </div>
        <div className="stack-list">
          {loading ? <p className="muted">Loading recipes…</p> : null}
          {recipes.map((recipe) => (
            <article
              key={recipe.id}
              className="recipe-card"
              role="button"
              tabIndex={0}
              onClick={() => onOpenRecipe(recipe.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onOpenRecipe(recipe.id)
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
                <p>{getServingRangeText(recipe)}</p>
                <p className="muted">{recipe.ingredients.slice(0, 3).map(formatIngredient).join(' • ')}</p>
                {isRecipeInMealPlan(recipe.id) ? (
                  <div className="meal-plan-status-badge">Added to Meal Plan</div>
                ) : (
                  <button type="button" className="primary-button" onClick={(event) => { event.stopPropagation(); onToggleMealPlanRecipe(recipe) }}>
                    Add To Meal Plan
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}