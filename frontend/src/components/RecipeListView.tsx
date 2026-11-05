import type { Recipe } from '../types/recipe'

type RecipeListViewProps = {
  recipes: Recipe[]
  loading: boolean
  query: string
  filter: string
  quickFilters: string[]
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

export function RecipeListView({
  recipes,
  loading,
  query,
  filter,
  quickFilters,
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
  const tags: string[] = ['all', ...quickFilters];
  let rowsCount = 3; // You can adjust this number to control how many rows of badges you want
  // Create an array of empty arrays representing our N rows
  const rows: string[][] = Array.from({ length: rowsCount }, () => []);
  // Distribute tags into rows sequentially using modulo (%)
  tags.forEach((tag, index) => {
    const rowIndex = index % rowsCount;
    rows[rowIndex].push(tag);
  });

  return (
    <main className="page">
      <section className="panel search-panel">
        <input type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search recipes or ingredients" />
        <div className="tag-list-scroll-master-wrapper">
          {rows.map((rowItems, rowIndex) => (
            <div key={rowIndex} className="tag-list-row">
              {rowItems.map((tag, _) => (
              <button key={tag} type="button" className={filter === tag ? 'chip active' : 'chip'} onClick={() => onFilterChange(tag)}>
                {tag === 'all' ? 'All' : tag}
              </button>
              ))}
            </div>
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
                {recipe.description.trim() ? <p>{recipe.description}</p> : null}
                <p>{getServingRangeText(recipe)}</p>
                {recipe.estimatedCookingTimeMinutes != null ? <p>{recipe.estimatedCookingTimeMinutes} min</p> : null}
                <p className="muted">{recipe.tags.join(' • ')}</p>
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