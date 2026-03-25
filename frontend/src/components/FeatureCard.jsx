import { Link } from 'react-router-dom'

const STATUS_COLORS = {
  open: 'bg-green-100 text-green-700',
  planned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-gray-100 text-gray-600',
  rejected: 'bg-red-100 text-red-600',
}

const FeatureCard = ({ feature, canVote, isOwn, onVote }) => (
  <li className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
    <div className="flex items-start justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`shrink-0 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
          feature.rank === 1 ? 'bg-yellow-400 text-white' :
          feature.rank === 2 ? 'bg-gray-300 text-gray-700' :
          feature.rank === 3 ? 'bg-amber-600 text-white' :
          'bg-gray-100 text-gray-400'
        }`}>
          {feature.rank}
        </span>
        <Link
          to={`/features/${feature.id}`}
          className="text-base font-semibold text-gray-900 hover:text-indigo-600 transition-colors leading-snug"
        >
          {feature.title}
        </Link>
      </div>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[feature.status] ?? 'bg-gray-100 text-gray-500'}`}>
        {feature.status.replace('_', ' ')}
      </span>
    </div>

    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{feature.description}</p>

    <div className="flex items-center justify-between mt-3">
      <p className="text-xs text-gray-400">
        by <span className="font-medium text-gray-500">{feature.author.username}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => canVote && onVote(feature)}
          disabled={!canVote}
          aria-label={feature.user_has_voted ? 'Remove vote' : 'Upvote'}
          title={
            isOwn ? 'You cannot vote on your own feature'
            : feature.user_has_voted ? 'Remove vote'
            : 'Upvote'
          }
          className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-200 active:scale-95 ${
            feature.user_has_voted
              ? 'border-yellow-400 bg-yellow-50 text-yellow-600'
              : canVote
              ? 'border-gray-200 text-gray-400 hover:border-yellow-300 hover:text-yellow-500 hover:bg-yellow-50'
              : 'border-gray-100 text-gray-300 cursor-default'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className={`w-3.5 h-3.5 transition-all duration-200 ${
              feature.user_has_voted
                ? 'fill-yellow-400 stroke-yellow-400'
                : canVote
                ? 'fill-transparent stroke-current group-hover:fill-yellow-300 group-hover:stroke-yellow-400'
                : 'fill-transparent stroke-current'
            }`}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          {feature.vote_count}
        </button>

        <Link
          to={`/features/${feature.id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-xs font-medium text-gray-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all duration-200"
          title="View details"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </Link>
      </div>
    </div>
  </li>
)

export default FeatureCard
