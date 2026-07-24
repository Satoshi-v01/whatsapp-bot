import { Children, isValidElement, useMemo } from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"

import { cn } from "@/lib/utils"

// Base UI necesita un mapa value->label para poder mostrar la etiqueta elegida
// en el trigger cuando el panel esta cerrado (si no, muestra el value crudo).
// En vez de pedir ese mapa a mano en cada uso, se deriva solo recorriendo los
// <SelectItem> que ya se declaran como hijos -- un unico <SelectItem value="x">Label</SelectItem>
// alcanza, igual que un <option> nativo.
function derivarItems(children) {
  const items = {}
  const recorrer = (nodos) => {
    Children.forEach(nodos, (nodo) => {
      if (!isValidElement(nodo)) return
      if (nodo.type === SelectItem) {
        items[String(nodo.props.value)] = nodo.props.children
      } else if (nodo.props?.children) {
        recorrer(nodo.props.children)
      }
    })
  }
  recorrer(children)
  return items
}

function Select({ children, items, ...props }) {
  const derivedItems = useMemo(() => items ?? derivarItems(children), [children, items])
  return <SelectPrimitive.Root data-slot="select" items={derivedItems} {...props}>{children}</SelectPrimitive.Root>
}

function SelectGroup({ ...props }) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectValue({ ...props }) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({ className, children, ...props }) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-full border border-transparent bg-slate-100 px-3.5 py-2 text-[13px] font-medium text-slate-900 outline-none transition-colors select-none hover:bg-slate-200/70 focus-visible:ring-3 focus-visible:ring-slate-900/8 data-[popup-open]:bg-slate-200/70 disabled:pointer-events-none disabled:opacity-50 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700/70 dark:focus-visible:ring-slate-100/8 dark:data-[popup-open]:bg-slate-700/70",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon className="flex shrink-0 text-slate-400 dark:text-slate-500">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({ className, children, sideOffset = 6, ...props }) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner sideOffset={sideOffset} className="z-[2100] outline-none">
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "min-w-[var(--anchor-width)] overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 text-slate-900 shadow-xl outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100",
            "origin-[var(--transform-origin)] transition-[transform,scale,opacity] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
            className
          )}
          {...props}
        >
          <SelectPrimitive.List className="flex flex-col gap-0.5">
            {children}
          </SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectItem({ className, children, ...props }) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] outline-none select-none data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-slate-700/60 data-[selected]:bg-slate-900 data-[selected]:font-semibold data-[selected]:text-white dark:data-[selected]:bg-indigo-500",
        className
      )}
      {...props}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300 group-data-[selected]:bg-white dark:bg-slate-600" data-slot="select-item-dot" />
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectGroupLabel({ className, ...props }) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-group-label"
      className={cn("px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500", className)}
      {...props}
    />
  )
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectGroupLabel,
}
