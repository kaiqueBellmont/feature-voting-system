import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

export const FEATURES_RESPONSE = {
  count: 2,
  next: null,
  previous: null,
  results: [
    {
      id: 1,
      title: 'Dark mode',
      description: 'Add dark mode support',
      status: 'open',
      vote_count: 10,
      user_has_voted: false,
      rank: 1,
      author: { id: 2, username: 'alice' },
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 2,
      title: 'Mobile app',
      description: 'Build a mobile app',
      status: 'planned',
      vote_count: 5,
      user_has_voted: true,
      rank: 2,
      author: { id: 3, username: 'bob' },
      created_at: '2026-01-02T00:00:00Z',
    },
  ],
}

export const ME_RESPONSE = { id: 1, username: 'testuser', email: 'test@example.com' }

export const handlers = [
  http.get('http://localhost:8000/api/features/', () =>
    HttpResponse.json(FEATURES_RESPONSE)
  ),

  http.post('http://localhost:8000/api/features/', () =>
    HttpResponse.json(
      { id: 3, title: 'New feature', description: 'New', status: 'open', vote_count: 0, user_has_voted: false, rank: 3, author: { id: 1, username: 'testuser' }, created_at: '2026-01-03T00:00:00Z' },
      { status: 201 }
    )
  ),

  http.post('http://localhost:8000/api/features/:id/vote/', () =>
    HttpResponse.json({}, { status: 201 })
  ),

  http.delete('http://localhost:8000/api/features/:id/vote/', () =>
    new HttpResponse(null, { status: 204 })
  ),

  http.post('http://localhost:8000/api/token/', () =>
    HttpResponse.json({ access: 'access-token', refresh: 'refresh-token' })
  ),

  http.post('http://localhost:8000/api/token/refresh/', () =>
    HttpResponse.json({ access: 'new-access-token' })
  ),

  http.get('http://localhost:8000/api/auth/me/', () =>
    HttpResponse.json(ME_RESPONSE)
  ),

  http.post('http://localhost:8000/api/auth/register/', () =>
    HttpResponse.json({ user: ME_RESPONSE, access: 'access-token', refresh: 'refresh-token' }, { status: 201 })
  ),

  http.get('http://localhost:8000/api/notifications/', () =>
    HttpResponse.json({ count: 0, next: null, previous: null, results: [] })
  ),

  http.get('http://localhost:8000/api/notifications/unread_count/', () =>
    HttpResponse.json({ count: 0 })
  ),
]

export const server = setupServer(...handlers)
