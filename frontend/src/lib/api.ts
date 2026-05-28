import type { Project, ProjectDetail, TaskStatus, Task, Member } from '../types'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

class ApiError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
    this.detail = detail
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const detail = body.detail || body.error || res.statusText || 'Request failed'
    throw new ApiError(res.status, detail)
  }
  const text = await res.text()
  return text ? JSON.parse(text) as T : null as T
}

function extractError(err: unknown): string {
  if (err instanceof ApiError) return err.detail
  if (err instanceof Error) return err.message
  return 'An unexpected error occurred'
}

export { ApiError, extractError }

export const api = {
  auth: {
    register: (data: { username: string; email: string; password: string }) =>
      request<{ token: string; userId: string; username: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (data: { email: string; password: string }) =>
      request<{ token: string; userId: string; username: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  projects: {
    list: () => request<Project[]>('/projects'),
    create: (data: { name: string; description?: string }) =>
      request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
    get: (id: string) => request<ProjectDetail>(`/projects/${id}`),
    update: (id: string, data: { name?: string; description?: string }) =>
      request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/projects/${id}`, { method: 'DELETE' }),
  },
  statuses: {
    create: (projectId: string, data: { name: string; color?: string; order?: number }) =>
      request<TaskStatus>(`/projects/${projectId}/statuses`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (projectId: string, statusId: string, data: { name?: string; color?: string; order?: number }) =>
      request<TaskStatus>(`/projects/${projectId}/statuses/${statusId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (projectId: string, statusId: string) =>
      request<void>(`/projects/${projectId}/statuses/${statusId}`, { method: 'DELETE' }),
  },
  members: {
    list: (projectId: string) => request<Member[]>(`/projects/${projectId}/members`),
    invite: (projectId: string, data: { email: string }) =>
      request<Member>(`/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify(data) }),
    remove: (projectId: string, userId: string) =>
      request<void>(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),
    leave: (projectId: string) =>
      request<void>(`/projects/${projectId}/leave`, { method: 'POST' }),
  },
  tasks: {
    list: (projectId: string) => request<Task[]>(`/projects/${projectId}/tasks`),
    create: (projectId: string, data: { title: string; description?: string; statusId: string; assignedTo?: string; dueDate?: string }) =>
      request<Task>(`/projects/${projectId}/tasks`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (projectId: string, taskId: string, data: Partial<Task>) =>
      request<Task>(`/projects/${projectId}/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    move: (projectId: string, taskId: string, data: { statusId: string }) =>
      request<Task>(`/projects/${projectId}/tasks/${taskId}/move`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (projectId: string, taskId: string) =>
      request<void>(`/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' }),
  },
}

export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  return parseLocalDate(dateStr).toLocaleDateString('en-US', options || { month: 'short', day: 'numeric' })
}

export function isOverdue(dateStr: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return parseLocalDate(dateStr) < today
}

export function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
