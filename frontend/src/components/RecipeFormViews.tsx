import { useRef } from 'react'
import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { IngredientStepPicker } from './IngredientStepPicker'
import type { IngredientEditorRow, InstructionStep, Recipe, RecipeIngredient } from '../types/recipe'
import type { RecipeFormFields } from '../types/recipeForm'
import { resolveImageUrl } from '../utils/recipeFormatting'
import { normalizeDisplayName } from '../utils/text'

type RowState<T> = {
  rows: T[]
  setRows: Dispatch<SetStateAction<T[]>>
}

type IngredientRowActions = {
  updateIngredientRow: (index: number, field: 'name' | 'quantity' | 'unit', value: string) => void
  addIngredientRow: () => void
  removeIngredientRow: (index: number) => void
}

function IngredientRowsEditor({ rows, updateIngredientRow, addIngredientRow, removeIngredientRow, label }: IngredientRowActions & { rows: IngredientEditorRow[]; label: string }) {
  return (
    <div className="ingredient-editor">
      <label>{label}</label>
      {rows.map((row, index) => (
        <div key={`ingredient-${index}`} className="ingredient-row">
          <input type="text" className="ingredient-field ingredient-field--name" value={row.name} placeholder="Ingredient name" onChange={(event) => updateIngredientRow(index, 'name', event.target.value)} />
          <input type="number" className="ingredient-field ingredient-field--qty" min="0" step="0.25" value={row.quantity} onChange={(event) => updateIngredientRow(index, 'quantity', event.target.value)} />
          <input type="text" className="ingredient-field ingredient-field--unit" value={row.unit} placeholder="unit" onChange={(event) => updateIngredientRow(index, 'unit', event.target.value)} />
          {rows.length > 1 ? <button type="button" className="icon-button" aria-label="Remove ingredient" onClick={() => removeIngredientRow(index)}>X</button> : null}
        </div>
      ))}
      <button type="button" className="secondary-button" onClick={addIngredientRow}>Add Ingredient</button>
    </div>
  )
}

type CookwareEditorProps = {
  rows: string[]
  setRows: Dispatch<SetStateAction<string[]>>
  addCookwareRow: () => void
  removeCookwareRow: (index: number) => void
}

function CookwareRowsEditor({ rows, setRows, addCookwareRow, removeCookwareRow }: CookwareEditorProps) {
  return (
    <div className="ingredient-editor">
      <label>Cookware</label>
      {rows.map((tool, index) => (
        <div key={`cookware-${index}`} className="ingredient-row instruction-row">
          <input type="text" className="ingredient-field ingredient-field--name" value={tool} placeholder="Cookware item" onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} />
          {rows.length > 1 ? <button type="button" className="icon-button" aria-label="Remove cookware item" onClick={() => removeCookwareRow(index)}>X</button> : null}
        </div>
      ))}
      <button type="button" className="secondary-button" onClick={addCookwareRow}>Add Cookware</button>
    </div>
  )
}

type InstructionEditorProps = RowState<InstructionStep> & {
  ingredients: IngredientEditorRow[]
  expandedIndex: number | null
  setExpandedIndex: Dispatch<SetStateAction<number | null>>
  toggleIngredient: (stepIndex: number, ingredient: RecipeIngredient) => void
  moveStep: (index: number, direction: -1 | 1) => void
  addStep: () => void
  removeStep: (index: number) => void
}

function InstructionRowsEditor({ rows, setRows, ingredients, expandedIndex, setExpandedIndex, toggleIngredient, moveStep, addStep, removeStep }: InstructionEditorProps) {
  const pickerIngredients = ingredients.map((row) => ({
    id: row.id,
    display_name: row.name || 'Untitled ingredient',
    normalized_name: normalizeDisplayName(row.name),
    quantity: Number(row.quantity) || 1,
    unit: row.unit,
  }))

  return (
    <div className="ingredient-editor">
      <label>Cooking Instructions</label>
      {rows.map((step, index) => (
        <div key={`instruction-${index}`} className="instruction-row">
          <span className="instruction-step-number">{index + 1}.</span>
          <div className="instruction-entry">
            <textarea
              className="expanding-textarea"
              value={step.instruction}
              placeholder="Add a cooking step"
              rows={expandedIndex === index ? 3 : 1}
              onFocus={() => setExpandedIndex(index)}
              onBlur={() => setExpandedIndex((current) => current === index ? null : current)}
              onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, instruction: event.target.value } : item))}
            />
            <IngredientStepPicker ingredients={pickerIngredients} step={step} label={`Step ${index + 1}`} onToggle={(ingredient) => toggleIngredient(index, ingredient)} />
          </div>
          {rows.length > 1 ? (
            <div className="instruction-actions">
              <button type="button" className="icon-button" aria-label="Remove instruction step" onClick={() => removeStep(index)}>X</button>
              <button type="button" className="move-button" aria-label="Move instruction up" disabled={index === 0} onClick={() => moveStep(index, -1)}>↑</button>
              <button type="button" className="move-button" aria-label="Move instruction down" disabled={index === rows.length - 1} onClick={() => moveStep(index, 1)}>↓</button>
            </div>
          ) : null}
        </div>
      ))}
      <button type="button" className="secondary-button" onClick={addStep}>Add Step</button>
    </div>
  )
}

type RecipeFormViewBaseProps = {
  fields: RecipeFormFields
  setFields: Dispatch<SetStateAction<RecipeFormFields>>
  ingredientRows: IngredientEditorRow[]
  setIngredientRows: Dispatch<SetStateAction<IngredientEditorRow[]>>
  instructionRows: InstructionStep[]
  setInstructionRows: Dispatch<SetStateAction<InstructionStep[]>>
  cookwareRows: string[]
  setCookwareRows: Dispatch<SetStateAction<string[]>>
  imageUrl: string | null
  uploadingImage: boolean
  expandedInstructionIndex: number | null
  saving: boolean
  setExpandedInstructionIndex: Dispatch<SetStateAction<number | null>>
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  updateIngredientRow: IngredientRowActions['updateIngredientRow']
  addIngredientRow: IngredientRowActions['addIngredientRow']
  removeIngredientRow: IngredientRowActions['removeIngredientRow']
  addCookwareRow: CookwareEditorProps['addCookwareRow']
  removeCookwareRow: CookwareEditorProps['removeCookwareRow']
  addStep: InstructionEditorProps['addStep']
  removeStep: InstructionEditorProps['removeStep']
  moveStep: InstructionEditorProps['moveStep']
  toggleIngredient: InstructionEditorProps['toggleIngredient']
}

type EditRecipeFormMode = {
  mode: 'edit'
  recipe: Recipe
  onBack: () => void
}

type UploadRecipeFormMode = {
  mode: 'upload'
  importing: boolean
  pendingFiles: File[]
  onBack: () => void
  onImportFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onImportPending: (files: File[]) => void
  onMovePendingFile: (index: number, offset: -1 | 1) => void
  onRemovePendingFile: (index: number) => void
}

export type RecipeFormViewProps = RecipeFormViewBaseProps & (EditRecipeFormMode | UploadRecipeFormMode)

export function RecipeFormView(props: RecipeFormViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const openFilePicker = () => fileInputRef.current?.click()
  const isNewRecipe = props.mode === 'upload'
  const recipe = isNewRecipe ? undefined : props.recipe
  const updateField = (field: keyof RecipeFormFields, value: string) =>
    props.setFields((current) => ({ ...current, [field]: value }))
  const importControls = props.mode === 'upload' ? (
    <>
      <input ref={fileInputRef} type="file" accept=".txt,.md,.json,.csv,.yaml,.yml,.html,.htm,.pdf,.doc,.docx,.rtf,.heic,.hevc,.heif,.png,.jpg,.jpeg,application/msword,application/pdf" multiple hidden onChange={props.onImportFileChange} />
      {props.pendingFiles.length > 0 ? (
        <div className="pending-import-list" aria-label="Files to import in order">
          <div className="section-header"><h3>Recipe pages</h3><button type="button" className="text-button" onClick={openFilePicker}>Add files</button></div>
          <ol>
            {props.pendingFiles.map((file, index) => (
              <li key={`${file.name}-${file.lastModified}-${index}`}>
                <span>{file.name}</span>
                <div className="pending-import-actions">
                  <button type="button" className="move-button" aria-label={`Move ${file.name} up`} disabled={index === 0} onClick={() => props.onMovePendingFile(index, -1)}>↑</button>
                  <button type="button" className="move-button" aria-label={`Move ${file.name} down`} disabled={index === props.pendingFiles.length - 1} onClick={() => props.onMovePendingFile(index, 1)}>↓</button>
                  <button type="button" className="icon-button" aria-label={`Remove ${file.name}`} onClick={() => props.onRemovePendingFile(index)}>X</button>
                </div>
              </li>
            ))}
          </ol>
          <button type="button" className="primary-button wide-button" disabled={props.importing} onClick={() => props.onImportPending(props.pendingFiles)}>{props.importing ? 'Importing…' : `Import ${props.pendingFiles.length} files`}</button>
        </div>
      ) : null}
    </>
  ) : null

  return (
    <section className="panel upload-panel">
      <div className={"section-header recipe-edit-header"}>
        <h2>{isNewRecipe ? 'New Recipe' : 'Edit Recipe'}</h2>
        <div className="section-header-actions">
          {props.mode === 'upload' && <button type="button" className="secondary-button" disabled={props.importing} onClick={openFilePicker}>{props.importing ? 'Importing…' : 'Import'}</button>}
          <button type="submit" form="edit-recipe-form" className="primary-button recipe-edit-save-button" disabled={props.saving}>{props.saving ? 'Saving…' : 'Save'}</button>
          <button type="button" className="text-button" onClick={props.onBack}>Cancel</button>
        </div>
      </div>

      {importControls}

      <form id='edit-recipe-form' className="upload-form" onSubmit={props.onSubmit}>
        <label>Recipe title<textarea
            className="expanding-textarea"
            value={props.fields.title}
            placeholder="e.g. Coconut Chickpea Curry"
            onChange={(event) => updateField('title', event.target.value)}
        /></label>
        <label>Description<textarea
            className="expanding-textarea"
            value={props.fields.description}
            onChange={(event) => updateField('description', event.target.value)}
        /></label>
        <label>Source<input name="source" type="text" value={props.fields.source} placeholder="e.g. Family cookbook or website URL" onChange={(event) => updateField('source', event.target.value)} /></label>
        <label>Keywords<input name="keywords" type="text" value={props.fields.keywords} placeholder="quick, dinner, vegetarian" onChange={(event) => updateField('keywords', event.target.value)} /></label>
        <div className="subsection-block">
          <h3>Image</h3>
          <label className="image-upload-field">
            <span>Upload recipe photo</span>
            <input type="file" accept="image/*" onChange={props.onImageChange} />
            {props.uploadingImage ? <small>Uploading…</small> : null}
            {(props.imageUrl || recipe?.imageUrl) ? <img src={resolveImageUrl(props.imageUrl ?? recipe?.imageUrl) ?? undefined} alt="Recipe preview" className="recipe-preview" /> : null}
          </label>
        </div>
        <div className="subsection-block">
          <h3>Servings</h3>
          <div className="servings-row">
            <label>Default<input name="defaultServings" type="number" min="1" value={props.fields.defaultServings} onChange={(event) => updateField('defaultServings', event.target.value)} /></label>
            <label>Min<input name="minServings" type="number" min="1" value={props.fields.minServings} onChange={(event) => updateField('minServings', event.target.value)} /></label>
            <label>Max<input name="maxServings" type="number" min="1" value={props.fields.maxServings} onChange={(event) => updateField('maxServings', event.target.value)} /></label>
          </div>
        </div>
        <IngredientRowsEditor rows={props.ingredientRows} updateIngredientRow={props.updateIngredientRow} addIngredientRow={props.addIngredientRow} removeIngredientRow={props.removeIngredientRow} label={isNewRecipe ? 'Ingredients' : 'Ingredients (based on default servings)'} />
        <CookwareRowsEditor rows={props.cookwareRows} setRows={props.setCookwareRows} addCookwareRow={props.addCookwareRow} removeCookwareRow={props.removeCookwareRow} />
        <InstructionRowsEditor rows={props.instructionRows} setRows={props.setInstructionRows} ingredients={props.ingredientRows} expandedIndex={props.expandedInstructionIndex} setExpandedIndex={props.setExpandedInstructionIndex} toggleIngredient={props.toggleIngredient} moveStep={props.moveStep} addStep={props.addStep} removeStep={props.removeStep} />
        <div className="subsection-block">
          <h3>Nutrition (based on default servings)</h3>
          <div className="nutrition-grid editor-grid">
            <label>Calories<input name="calories" type="number" min="0" value={props.fields.calories} placeholder="540" onChange={(event) => updateField('calories', event.target.value)} /></label>
            <label>Protein (g)<input name="protein" type="number" min="0" value={props.fields.protein} placeholder="42" onChange={(event) => updateField('protein', event.target.value)} /></label>
            <label>Carbs (g)<input name="carbs" type="number" min="0" value={props.fields.carbs} placeholder="18" onChange={(event) => updateField('carbs', event.target.value)} /></label>
            <label>Fat (g)<input name="fat" type="number" min="0" value={props.fields.fat} placeholder="25" onChange={(event) => updateField('fat', event.target.value)} /></label>
            <label>Fiber<input name="fiber" type="number" min="0" value={props.fields.fiber} placeholder="6" onChange={(event) => updateField('fiber', event.target.value)} /></label>
          </div>
        </div>
        <label>Nutrition notes<input name="nutritionNotes" type="text" value={props.fields.nutritionNotes} placeholder="Optional notes" onChange={(event) => updateField('nutritionNotes', event.target.value)} /></label>
        <button type="submit" className="primary-button wide-button" disabled={props.saving}>
          {props.saving ? 'Saving…' : isNewRecipe ? 'Save Recipe' : 'Save Changes'}
        </button>
      </form>
    </section>
  )
}