import type { ImportedRecipe } from '../types/recipe'

export const extractRecipeFromFiles = async (files: File[]): Promise<ImportedRecipe> => {
  const formData = new FormData()
  if (files.length === 1) {
    formData.append('file', files[0])
  } else {
    files.forEach((file) => formData.append('files', file))
  }

  const response = await fetch('/api/recipes/import', { method: 'POST', body: formData })
  if (!response.ok) throw new Error(`Import request failed with status ${response.status}`)

  const data = await response.json()
  if (!data.recipe || typeof data.recipe !== 'object') {
    throw new Error('Import response did not contain a recipe')
  }
  return data.recipe as ImportedRecipe
}

export const findUnsupportedRecipeFile = (files: File[]): File | undefined => files.find((file) => {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
  const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif)$/i.test(file.name)
  const isText = file.type.startsWith('text/') || /\.(txt|md|json|csv|yaml|yml|html|htm|rtf)$/i.test(file.name)
  return !isText && !isPdf && !isImage
})