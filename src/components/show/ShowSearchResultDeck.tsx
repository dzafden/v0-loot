import { Search } from 'lucide-react'
import { SaveStateButton } from '../ui/SaveStateButton'
import { imgUrl, type TmdbSearchResult } from '../../lib/tmdb'
import { cn } from '../../lib/utils'

type ShowSearchResultDeckProps = {
  query: string
  loading: boolean
  results: TmdbSearchResult[]
  error?: string | null
  emptyLabel?: string
  noResultsLabel?: string
  isSaved: (result: TmdbSearchResult) => boolean
  isSaving: (result: TmdbSearchResult) => boolean
  onSave: (result: TmdbSearchResult) => Promise<void> | void
}

export function ShowSearchResultDeck({
  query,
  loading,
  results,
  error,
  emptyLabel = 'Type to search',
  noResultsLabel = 'No results',
  isSaved,
  isSaving,
  onSave,
}: ShowSearchResultDeckProps) {
  const trimmed = query.trim()

  return (
    <div className="flex-1 overflow-y-auto px-3 pb-8">
      {error && <p className="mx-2 mb-3 text-xs font-bold text-rose-300">{error}</p>}
      {loading && (
        <div className="grid place-items-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f5c453] border-t-transparent" />
        </div>
      )}
      {!loading && !trimmed && (
        <div className="grid place-items-center gap-3 py-16 text-center text-white/24">
          <Search size={22} />
          <p className="text-[10px] font-black uppercase tracking-[0.24em]">{emptyLabel}</p>
        </div>
      )}
      {!loading && trimmed && results.length === 0 && (
        <div className="py-16 text-center text-[10px] font-black uppercase tracking-[0.24em] text-white/24">{noResultsLabel}</div>
      )}
      {results.length > 0 && (
        <div className="space-y-4">
          <HeroResult result={results[0]} saved={isSaved(results[0])} saving={isSaving(results[0])} onSave={onSave} />
          <div className="flex gap-3 overflow-x-auto pb-3 no-scrollbar">
            {results.slice(1).map((result) => (
              <CompactResult
                key={result.id}
                result={result}
                saved={isSaved(result)}
                saving={isSaving(result)}
                onSave={onSave}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function HeroResult({
  result,
  saved,
  saving,
  onSave,
}: {
  result: TmdbSearchResult
  saved: boolean
  saving: boolean
  onSave: (result: TmdbSearchResult) => Promise<void> | void
}) {
  const activate = () => {
    if (!saved && !saving) void onSave(result)
  }

  return (
    <div
      role="button"
      tabIndex={saved || saving ? -1 : 0}
      onClick={activate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          activate()
        }
      }}
      className={cn('relative h-[320px] w-full overflow-hidden rounded-[34px] bg-black text-left shadow-[0_24px_70px_rgba(0,0,0,0.62)]', (saved || saving) && 'opacity-70')}
    >
      {(result.backdrop_path || result.poster_path) && (
        <img
          src={imgUrl(result.backdrop_path ?? result.poster_path, result.backdrop_path ? 'w500' : 'w342')}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-76"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/20 to-black/10" />
      <div className="absolute bottom-0 inset-x-0 p-5">
        <h3 className="max-w-[78%] text-4xl font-black leading-[0.86] tracking-[-0.11em] text-white text-balance">{result.name}</h3>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-[0.24em] text-white/46">{(result.first_air_date ?? '').slice(0, 4) || '----'}</span>
          <SaveStateButton saved={saved} saving={saving} onSave={() => onSave(result)} size="lg" />
        </div>
      </div>
    </div>
  )
}

function CompactResult({
  result,
  saved,
  saving,
  onSave,
}: {
  result: TmdbSearchResult
  saved: boolean
  saving: boolean
  onSave: (result: TmdbSearchResult) => Promise<void> | void
}) {
  const activate = () => {
    if (!saved && !saving) void onSave(result)
  }

  return (
    <div
      role="button"
      tabIndex={saved || saving ? -1 : 0}
      onClick={activate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          activate()
        }
      }}
      className={cn('relative h-44 w-28 shrink-0 overflow-hidden rounded-[24px] bg-[#151117] shadow-[0_16px_34px_rgba(0,0,0,0.34)]', (saved || saving) && 'opacity-70')}
    >
      {result.poster_path ? (
        <img src={imgUrl(result.poster_path, 'w342')} alt={result.name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="grid h-full w-full place-items-center bg-white/[0.04] text-xl font-black text-white/26">
          {result.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/76 via-transparent to-transparent" />
      <div className="absolute bottom-0 inset-x-0 p-2">
        <div className="line-clamp-2 text-left text-xs font-black leading-tight tracking-[-0.04em] text-white">{result.name}</div>
      </div>
      <SaveStateButton
        saved={saved}
        saving={saving}
        onSave={() => onSave(result)}
        size="sm"
        shape="soft"
        wrapperClassName={cn('absolute right-2 top-2')}
      />
    </div>
  )
}
