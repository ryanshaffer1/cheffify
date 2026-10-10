const API_BASE = '/api'

export async function listRecipes(): Promise<unknown> {
  const response = await fetch(`${API_BASE}/recipes`)
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`)
  return response.json()
}

export async function uploadRecipeImage(file: File): Promise<string | null> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(`${API_BASE}/recipes/upload-image`, { method: 'POST', body: formData })
  if (!response.ok) throw new Error(`Image upload failed with status ${response.status}`)
  const data = await response.json()
  return typeof data.image_url === 'string' ? data.image_url : null
}

export async function createRecipe(payload: unknown): Promise<unknown | null> {
  const response = await fetch(`${API_BASE}/recipes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return response.ok ? response.json() : null
}

export async function updateRecipe(recipeId: number, payload: unknown): Promise<unknown> {
  const response = await fetch(`${API_BASE}/recipes/${recipeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null)
    throw new Error(errorPayload?.detail || `Save failed with status ${response.status}`)
  }
  return response.json()
}

export async function deleteRecipe(recipeId: number): Promise<void> {
  await fetch(`${API_BASE}/recipes/${recipeId}`, { method: 'DELETE' })
}