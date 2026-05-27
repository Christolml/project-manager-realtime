import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { api, extractError } from '../lib/api'
import { useToast } from '../hooks/useToast'
import { wsClient } from '../lib/ws'
import type { Member, WSMessage } from '../types'

interface Props {
  projectId: string
  isOwner: boolean
}

export default function MemberPanel({ projectId, isOwner }: Props) {
  const [members, setMembers] = useState<Member[]>([])
  const [showInvite, setShowInvite] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  const loadMembers = useCallback(async () => {
    try {
      const m = await api.members.list(projectId)
      setMembers(m || [])
    } catch { /* silent */ }
  }, [projectId])

  useEffect(() => { loadMembers() }, [loadMembers])

  useEffect(() => {
    const unsub1 = wsClient.on('memberJoined', (msg: WSMessage) => {
      if (msg.projectId === projectId) loadMembers()
    })
    const unsub2 = wsClient.on('memberRemoved', (msg: WSMessage) => {
      if (msg.projectId === projectId) loadMembers()
    })
    return () => { unsub1(); unsub2() }
  }, [projectId, loadMembers])

  async function handleInvite() {
    if (!email.trim()) return
    setLoading(true)
    try {
      await api.members.invite(projectId, { email: email.trim() })
      setEmail('')
      setShowInvite(false)
      showToast('Member invited', 'success')
      await loadMembers()
    } catch (err) {
      showToast(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove(userId: string, username: string) {
    if (!confirm(`Remove ${username} from this project?`)) return
    try {
      await api.members.remove(projectId, userId)
      showToast(`${username} removed`, 'success')
      setMembers((prev) => prev.filter((m) => m.userId !== userId))
    } catch (err) {
      showToast(extractError(err))
    }
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800 font-['DM_Sans',sans-serif]">
          Members{' '}
          <span className="text-gray-300 font-normal">({members.length})</span>
        </h3>
        {isOwner && (
          <button
            onClick={() => setShowInvite(true)}
            className="text-xs font-semibold bg-indigo-600 text-white px-3.5 py-1.5 rounded-xl hover:bg-indigo-700 transition shadow-sm shadow-indigo-200 font-['DM_Sans',sans-serif]"
          >
            + Invite
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {members.map((m) => (
          <div key={m.userId} className="flex items-center justify-between py-2 px-3 bg-[#f8f7f4] rounded-xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                {m.username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate font-['DM_Sans',sans-serif]">{m.username}</p>
                <p className="text-[11px] text-gray-400 truncate">{m.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                m.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200/60 text-gray-500'
              }`}>
                {m.role}
              </span>
              {isOwner && m.role !== 'admin' && (
                <button
                  onClick={() => handleRemove(m.userId, m.username)}
                  className="text-xs text-gray-300 hover:text-red-500 transition"
                  title="Remove member"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
        {members.length === 0 && (
          <p className="text-xs text-gray-300 text-center py-4 font-['DM_Sans',sans-serif]">No members yet</p>
        )}
      </div>

      {showInvite && createPortal(
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[100]" onClick={() => setShowInvite(false)}>
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/60 p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-['Playfair_Display',serif] text-lg font-semibold mb-2">Invite Member</h3>
            <p className="text-sm text-gray-400 mb-5 font-['DM_Sans',sans-serif]">Enter the email of the user you want to invite.</p>
            <input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 mb-5 font-['DM_Sans',sans-serif]"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowInvite(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600 font-['DM_Sans',sans-serif]">Cancel</button>
              <button onClick={handleInvite} disabled={loading} className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm shadow-indigo-200 font-['DM_Sans',sans-serif]">
                {loading ? 'Inviting...' : 'Invite'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
