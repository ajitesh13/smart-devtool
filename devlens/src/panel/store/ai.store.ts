import { create } from 'zustand'

interface AIMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface AIStore {
  isOpen: boolean
  isLoading: boolean
  messages: AIMessage[]
  contextId: string | null

  openDrawer: (contextId: string) => void
  closeDrawer: () => void
  addMessage: (message: AIMessage) => void
  appendToLastMessage: (chunk: string) => void
  setLoading: (loading: boolean) => void
  clearMessages: () => void
}

export const useAIStore = create<AIStore>((set) => ({
  isOpen: false,
  isLoading: false,
  messages: [],
  contextId: null,

  openDrawer: (contextId) => set({ isOpen: true, contextId }),
  closeDrawer: () => set({ isOpen: false, contextId: null }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  appendToLastMessage: (chunk) =>
    set((state) => {
      const messages = [...state.messages]
      const last = messages[messages.length - 1]
      if (last && last.role === 'assistant') {
        messages[messages.length - 1] = { ...last, content: last.content + chunk }
      }
      return { messages }
    }),

  setLoading: (isLoading) => set({ isLoading }),
  clearMessages: () => set({ messages: [] }),
}))
