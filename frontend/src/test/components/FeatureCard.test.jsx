import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../utils'
import FeatureCard from '../../components/FeatureCard'

const BASE_FEATURE = {
  id: 1,
  title: 'Dark mode',
  description: 'Add dark mode support',
  status: 'open',
  vote_count: 10,
  user_has_voted: false,
  rank: 1,
  author: { id: 2, username: 'alice' },
}

function renderCard(props = {}) {
  const defaults = { feature: BASE_FEATURE, canVote: true, isOwn: false, onVote: vi.fn() }
  return renderWithProviders(<FeatureCard {...defaults} {...props} />)
}

describe('FeatureCard', () => {
  it('renders title, description and author', () => {
    renderCard()

    expect(screen.getByText('Dark mode')).toBeInTheDocument()
    expect(screen.getByText('Add dark mode support')).toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()
  })

  it('renders vote count', () => {
    renderCard()

    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('renders status badge', () => {
    renderCard()

    expect(screen.getByText('open')).toBeInTheDocument()
  })

  it('renders rank badge', () => {
    renderCard()

    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('vote button has aria-label "Upvote" when not voted', () => {
    renderCard({ feature: { ...BASE_FEATURE, user_has_voted: false } })

    expect(screen.getByRole('button', { name: /upvote/i })).toBeInTheDocument()
  })

  it('vote button has aria-label "Remove vote" when already voted', () => {
    renderCard({ feature: { ...BASE_FEATURE, user_has_voted: true } })

    expect(screen.getByRole('button', { name: /remove vote/i })).toBeInTheDocument()
  })

  it('calls onVote when canVote is true and button is clicked', () => {
    const onVote = vi.fn()
    renderCard({ canVote: true, onVote })

    fireEvent.click(screen.getByRole('button', { name: /upvote/i }))

    expect(onVote).toHaveBeenCalledWith(BASE_FEATURE)
  })

  it('does not call onVote when canVote is false', () => {
    const onVote = vi.fn()
    renderCard({ canVote: false, onVote })

    fireEvent.click(screen.getByRole('button', { name: /upvote/i }))

    expect(onVote).not.toHaveBeenCalled()
  })

  it('vote button is disabled when canVote is false', () => {
    renderCard({ canVote: false })

    expect(screen.getByRole('button', { name: /upvote/i })).toBeDisabled()
  })

  it('renders "in progress" status with space instead of underscore', () => {
    renderCard({ feature: { ...BASE_FEATURE, status: 'in_progress' } })

    expect(screen.getByText('in progress')).toBeInTheDocument()
  })

  it('renders detail link', () => {
    renderCard()

    const links = screen.getAllByRole('link')
    const detailLink = links.find(l => l.getAttribute('href') === '/features/1')
    expect(detailLink).toBeDefined()
  })

  it('applies gold background to rank 1', () => {
    renderCard({ feature: { ...BASE_FEATURE, rank: 1 } })

    const badge = screen.getByText('1')
    expect(badge.className).toContain('bg-yellow-400')
  })

  it('applies silver background to rank 2', () => {
    renderCard({ feature: { ...BASE_FEATURE, rank: 2, title: 'Other', vote_count: 5 } })

    const badge = screen.getByText('2')
    expect(badge.className).toContain('bg-gray-300')
  })
})
