import { cn } from '../../lib/utils'
import { AUCTION_CATEGORIES, type AuctionCategory } from '../../lib/mockData'

interface CategoryFilterProps {
  active: AuctionCategory
  onChange: (cat: AuctionCategory) => void
}

export default function CategoryFilter({ active, onChange }: CategoryFilterProps) {
  return (
    <div className="w-full flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {AUCTION_CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={cn(
            'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
            cat === active
              ? 'bg-brand text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-brand hover:text-brand'
          )}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}
