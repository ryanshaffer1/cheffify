import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { GroceryItem } from '../types/recipe'
import { formatGroceryItemText } from '../utils/recipeFormatting'
import { getGroceryKey } from '../utils/grocery'

type ManualItemRow = { name: string; quantity: string; unit: string }

type GroceryViewProps = {
  manualItemRow: ManualItemRow
  setManualItemRow: Dispatch<SetStateAction<ManualItemRow>>
  items: GroceryItem[]
  onAddItem: () => void
  onToggleItem: (itemKey: string) => void
  onClear: () => void
}

export function GroceryView({ manualItemRow, setManualItemRow, items, onAddItem, onToggleItem, onClear }: GroceryViewProps) {
  const [confirmClear, setConfirmClear] = useState(false)

  return (
    <main className="page">
      <section className="panel">
        <div className="grocery-form-header"><h3>Add Groceries</h3></div>
        <div className="manual-row ingredient-row">
          <input type="text" className="ingredient-field ingredient-field--name" value={manualItemRow.name} placeholder="Ingredient"
            onChange={(event) => setManualItemRow((current) => ({ ...current, name: event.target.value }))} />
          <input type="number" className="ingredient-field ingredient-field--qty" min="0" step="0.25" value={manualItemRow.quantity}
            onChange={(event) => setManualItemRow((current) => ({ ...current, quantity: event.target.value }))} />
          <input type="text" className="ingredient-field ingredient-field--unit" value={manualItemRow.unit} placeholder="unit"
            onChange={(event) => setManualItemRow((current) => ({ ...current, unit: event.target.value }))} />
          <button type="button" className="icon-button" aria-label="Add manual item" onClick={onAddItem}>+</button>
        </div>
        <div className="section-header"><h2>Grocery List</h2></div>
        <div className="stack-list grocery-list">
          {items.map((item, index) => {
            const text = formatGroceryItemText(item)
            return (
              <label key={`${item.name}-${index}`} className={item.checked ? 'grocery-item checked' : 'grocery-item'}>
                <div className="grocery-item-content">
                  <div className="grocery-item-main">
                    <span className="grocery-item-name">{text.name}</span>
                    {text.meta ? <span className="grocery-item-meta">{text.meta}</span> : null}
                  </div>
                  <small>{item.source ? item.source.join(', ') : 'Manual Item'}</small>
                </div>
                <input type="checkbox" checked={item.checked} onChange={() => onToggleItem(getGroceryKey(item))} />
              </label>
            )
          })}
        </div>
        <div className="grocery-clear-row"><button type="button" className="danger-button" onClick={() => setConfirmClear(true)}>Clear List</button></div>
      </section>
      {confirmClear && (
        <div className="confirm-backdrop" role="dialog" aria-modal="true">
          <div className="confirm-dialog panel">
            <h3>Clear grocery list?</h3>
            <p>This removes every item from the grocery list.</p>
            <div className="confirm-actions">
              <button type="button" className="secondary-button" onClick={() => setConfirmClear(false)}>Cancel</button>
              <button type="button" className="danger-button" onClick={() => { onClear(); setConfirmClear(false) }}>Clear</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}