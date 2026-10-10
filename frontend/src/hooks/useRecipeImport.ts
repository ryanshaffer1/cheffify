import { useState } from 'react'
import { extractRecipeFromFiles, findUnsupportedRecipeFile } from '../services/recipeImport'
import type { ImportedRecipe } from '../types/recipe'

export function useRecipeImport(onImported: (recipe: ImportedRecipe) => void) {
  const [importing, setImporting] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const importFiles = async (files: File[]) => {
    if (!files.length) return
    setImporting(true)
    try {
      onImported(await extractRecipeFromFiles(files))
      setPendingFiles([])
    } catch {
      window.alert('Unable to import those files. Please use text, PDF, or image recipe files.')
    } finally {
      setImporting(false)
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return
    if (findUnsupportedRecipeFile(files)) {
      window.alert('This file type is not supported yet. Please import a text file, PDF, or image recipe.')
      event.target.value = ''
      return
    }
    if (files.length > 1 || pendingFiles.length > 0) setPendingFiles((current) => [...current, ...files])
    else await importFiles(files)
    event.target.value = ''
  }

  const movePendingFile = (index: number, offset: -1 | 1) => setPendingFiles((current) => {
    const target = index + offset
    if (target < 0 || target >= current.length) return current
    const next = [...current]
    ;[next[index], next[target]] = [next[target], next[index]]
    return next
  })

  const removePendingFile = (index: number) => setPendingFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))

  return { importing, pendingFiles, importFiles, handleFileChange, movePendingFile, removePendingFile }
}