export interface Repository<T> {
  repository: T
}

export interface Discussions {
  nodes: DiscussionContent[]
  pageInfo: {
    hasNextPage: boolean
    endCursor: string
  }
}

export interface DiscussionContent {
  number: number
  title: string
  createdAt: string
  updatedAt: string
  labels: Labels
  url: string
  body?: string
}

export type RepositoryDiscussions = Repository<{ discussions: Discussions }>

export interface Label {
  name: string
  color: string
}

export interface Labels {
  nodes: Label[]
}

// Categories
export interface DiscussionCategory {
  id: string
  name: string
}
export interface DiscussionCategories {
  nodes: DiscussionCategory[]
}

export type RepositoryDiscussionCategories = Repository<{
  discussionCategories: DiscussionCategories
}>