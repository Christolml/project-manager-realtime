export interface User {
  id: string
  username: string
  email: string
}

export interface AuthResponse {
  token: string
  userId: string
  username: string
}

export interface Project {
  id: string
  name: string
  description: string
  ownerId: string
  taskCount?: number
  createdAt: string
}

export interface ProjectDetail {
  id: string
  name: string
  description: string
  ownerId: string
  statuses: TaskStatus[]
  members: ProjectMember[]
  createdAt: string
  updatedAt: string
}

export interface ProjectMember {
  projectId: string
  userId: string
  user: User
  role: string
}

export interface TaskStatus {
  id: string
  projectId: string
  name: string
  color: string
  order: number
}

export interface Task {
  id: string
  projectId: string
  title: string
  description: string
  statusId: string
  status?: TaskStatus
  assignedTo?: string | null
  assignee?: User | null
  dueDate?: string | null
  createdBy: string
  creator?: User
  createdAt: string
  updatedAt: string
}

export interface WSMessage {
  type: string
  projectId?: string
  data?: unknown
  userId?: string
}
