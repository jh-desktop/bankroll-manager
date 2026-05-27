import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  doc, updateDoc, deleteDoc, onSnapshot,
  collection, addDoc, query, orderBy, serverTimestamp,
  increment,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useAdmin } from '../context/AdminContext'
import { useWorkspace } from '../context/WorkspaceContext'
import './BoardPage.css'

const LEGACY_KEY = 'JN7GFW'

const MAX_IMAGE_MB = 5
const MAX_IMAGES   = 5

const getImages = (post) => {
  if (post.imageURLs?.length) return post.imageURLs
  if (post.imageURL) return [post.imageURL]
  return []
}

const toBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload  = () => resolve(reader.result.split(',')[1])
  reader.onerror = reject
  reader.readAsDataURL(file)
})

const compressImage = (file) => new Promise((resolve) => {
  const img = new Image()
  img.onload = () => {
    const MAX = 1200
    let { width, height } = img
    if (width > MAX || height > MAX) {
      if (width > height) { height = Math.round(height * MAX / width); width = MAX }
      else { width = Math.round(width * MAX / height); height = MAX }
    }
    const canvas = document.createElement('canvas')
    canvas.width = width; canvas.height = height
    canvas.getContext('2d').drawImage(img, 0, 0, width, height)
    canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.8)
  }
  img.src = URL.createObjectURL(file)
})

export default function PostDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { adminMode } = useAdmin()
  const { currentWs } = useWorkspace()

  const postsParts = currentWs?.secretKey === LEGACY_KEY
    ? ['bankroll_posts']
    : ['workspaces', currentWs?.id, 'posts']

  const [post, setPost]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 수정 모드
  const [editing, setEditing]         = useState(false)
  const [editTitle, setEditTitle]     = useState('')
  const [editContent, setEditContent] = useState('')
  const [editExisting, setEditExisting] = useState([])  // 기존 URL 배열
  const [editNewFiles, setEditNewFiles] = useState([])  // 새 File 배열
  const [editNewPreviews, setEditNewPreviews] = useState([])
  const [editUploading, setEditUploading] = useState(false)
  const [editProgress, setEditProgress]   = useState(0)
  const editFileRef = useRef()

  useEffect(() => {
    const unsub = onSnapshot(doc(db, ...postsParts, id), snap => {
      if (!snap.exists()) { navigate('/board'); return }
      setPost({ id: snap.id, ...snap.data() })
      setLoading(false)
    })
    return unsub
  }, [id])

  useEffect(() => {
    const q = query(
      collection(db, ...postsParts, id, 'comments'),
      orderBy('createdAt', 'asc')
    )
    return onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setComments(list)
      // 저장된 카운트와 실제 수가 다르면 동기화
      setPost(prev => {
        if (prev && prev.commentCount !== list.length) {
          updateDoc(doc(db, ...postsParts, id), { commentCount: list.length }).catch(() => {})
        }
        return prev
      })
    })
  }, [id])

  const canEdit   = (item) => adminMode || (user && item.createdBy === user.uid)
  const canDelete = (item) => adminMode || (user && item.createdBy === user.uid)

  // ── 글 삭제 ──
  const deletePost = async () => {
    if (!confirm('이 글을 삭제하시겠습니까?')) return
    await deleteDoc(doc(db, ...postsParts, id))
    navigate('/board')
  }

  // ── 글 수정 시작 ──
  const startEdit = () => {
    setEditTitle(post.title)
    setEditContent(post.content)
    setEditExisting(getImages(post))
    setEditNewFiles([])
    setEditNewPreviews([])
    setEditing(true)
  }

  const editTotalCount = editExisting.length + editNewFiles.length

  const handleEditImage = (e) => {
    const newFiles = Array.from(e.target.files)
    if (editFileRef.current) editFileRef.current.value = ''
    const remaining = MAX_IMAGES - editTotalCount
    if (remaining <= 0) { alert('최대 5장까지 첨부 가능합니다.'); return }
    const toAdd = newFiles.slice(0, remaining)
    const oversized = toAdd.filter(f => f.size > MAX_IMAGE_MB * 1024 * 1024)
    if (oversized.length) { alert(`이미지는 ${MAX_IMAGE_MB}MB 이하만 가능합니다.`); return }
    setEditNewFiles(prev => [...prev, ...toAdd])
    setEditNewPreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))])
  }

  // ── 글 수정 저장 ──
  const saveEdit = async () => {
    if (!editTitle.trim() || !editContent.trim()) return
    setEditUploading(true)
    try {
      const imageURLs = [...editExisting]
      for (let i = 0; i < editNewFiles.length; i++) {
        setEditProgress(Math.round((i / editNewFiles.length) * 90))
        const compressed = await compressImage(editNewFiles[i])
        const base64     = await toBase64(compressed)
        const res  = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, filename: editNewFiles[i].name, mimeType: 'image/jpeg' }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        imageURLs.push(data.url)
      }
      if (editNewFiles.length) setEditProgress(100)
      await updateDoc(doc(db, ...postsParts, id), {
        title: editTitle.trim(),
        content: editContent.trim(),
        imageURLs,
        updatedAt: serverTimestamp(),
      })
      setEditing(false)
    } catch (e) {
      alert('수정 실패: ' + e.message)
    } finally {
      setEditUploading(false)
    }
  }

  // ── 댓글 등록 ──
  const submitComment = async () => {
    if (!commentText.trim() || !user) return
    setSubmitting(true)
    try {
      await addDoc(collection(db, ...postsParts, id, 'comments'), {
        content: commentText.trim(),
        createdBy: user.uid,
        createdByName: user.displayName ?? '익명',
        createdByPhoto: user.photoURL ?? null,
        createdAt: serverTimestamp(),
      })
      setCommentText('')
      updateDoc(doc(db, ...postsParts, id), { commentCount: increment(1) }).catch(() => {})
    } catch (e) {
      alert('댓글 등록 실패: ' + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── 댓글 삭제 ──
  const deleteComment = async (cmt) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return
    await deleteDoc(doc(db, ...postsParts, id, 'comments', cmt.id))
    await updateDoc(doc(db, ...postsParts, id), { commentCount: increment(-1) })
  }

  const timeAgo = (ts) => {
    if (!ts?.toMillis) return ''
    const sec = Math.floor((Date.now() - ts.toMillis()) / 1000)
    if (sec < 60) return '방금 전'
    if (sec < 3600) return `${Math.floor(sec / 60)}분 전`
    if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`
    return `${Math.floor(sec / 86400)}일 전`
  }

  if (loading) return (
    <div className="page" style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
      <div className="bp-spin" />
    </div>
  )

  return (
    <div className="page">
      {/* 뒤로가기 */}
      <button className="bp-back-btn" onClick={() => navigate('/board')}>
        ‹ 게시판으로
      </button>

      {/* ── 글 본문 ── */}
      {editing ? (
        <div className="bp-edit-wrap">
          <input className="input" value={editTitle} onChange={e => setEditTitle(e.target.value)}
            maxLength={80} style={{ marginBottom: '0.6rem' }} />
          <textarea className="input bp-textarea" value={editContent}
            onChange={e => setEditContent(e.target.value)} rows={8} maxLength={2000} />

          <div className="bp-image-area" style={{ marginTop: '0.75rem' }}>
            <div className="bp-image-list">
              {editExisting.map((url, i) => (
                <div key={`ex-${i}`} className="bp-image-preview">
                  <img src={url} alt="" />
                  <button className="bp-image-remove" onClick={() => setEditExisting(prev => prev.filter((_, idx) => idx !== i))}>✕</button>
                </div>
              ))}
              {editNewPreviews.map((src, i) => (
                <div key={`new-${i}`} className="bp-image-preview">
                  <img src={src} alt="" />
                  <button className="bp-image-remove" onClick={() => {
                    setEditNewFiles(prev => prev.filter((_, idx) => idx !== i))
                    setEditNewPreviews(prev => prev.filter((_, idx) => idx !== i))
                  }}>✕</button>
                </div>
              ))}
            </div>
            {editTotalCount < MAX_IMAGES && (
              <label className="bp-image-upload-btn" style={{ marginTop: editTotalCount ? '0.5rem' : 0 }}>
                <input type="file" accept="image/*" multiple ref={editFileRef} onChange={handleEditImage} style={{ display: 'none' }} />
                📷 사진 추가 <span style={{ fontSize: '0.7rem', color: '#475569' }}>({editTotalCount}/{MAX_IMAGES})</span>
              </label>
            )}
          </div>

          {editUploading && (
            <div className="bp-progress-wrap">
              <div className="bp-progress-bar" style={{ width: `${editProgress}%` }} />
              <span className="bp-progress-text">{editProgress}%</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setEditing(false)}>취소</button>
            <button className="btn btn-primary" style={{ flex: 1 }}
              onClick={saveEdit} disabled={editUploading}>
              {editUploading ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bp-post-wrap">
          <h2 className="bp-post-title">{post.title}</h2>
          <div className="bp-post-meta">
            <div className="bp-card-author">
              {post.createdByPhoto
                ? <img src={post.createdByPhoto} alt="" className="bp-avatar" />
                : <div className="bp-avatar-fallback">{post.createdByName?.[0] ?? '?'}</div>
              }
              <span>{post.createdByName}</span>
            </div>
            <span className="bp-meta-info">{timeAgo(post.createdAt)}</span>
          </div>

          {getImages(post).map((url, i) => (
            <div key={i} className="bp-post-image" style={{ position: 'relative' }}>
              <img src={url} alt="" />
              <a href={url} download target="_blank" rel="noreferrer"
                style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '0.5rem', color: '#e2e8f0', fontSize: '0.75rem', padding: '5px 10px', cursor: 'pointer', textDecoration: 'none' }}>
                ⬇ 저장
              </a>
            </div>
          ))}

          <div className="bp-post-content">{post.content}</div>

          {canEdit(post) && (
            <div className="bp-post-actions">
              <button className="btn btn-ghost" style={{ fontSize: '0.82rem', padding: '0.4rem 0.875rem' }} onClick={startEdit}>수정</button>
              <button className="btn btn-danger" style={{ fontSize: '0.82rem', padding: '0.4rem 0.875rem' }} onClick={deletePost}>삭제</button>
            </div>
          )}
        </div>
      )}

      {/* ── 댓글 ── */}
      <div className="bp-comments-section">
        <div className="bp-comments-title">댓글 {comments.length}</div>

        {/* 댓글 입력 */}
        {user ? (
          <div className="bp-comment-input-wrap">
            <div className="bp-card-author" style={{ marginBottom: '0.5rem' }}>
              {user.photoURL
                ? <img src={user.photoURL} alt="" className="bp-avatar" />
                : <div className="bp-avatar-fallback">{user.displayName?.[0] ?? '?'}</div>
              }
              <span style={{ fontSize: '0.82rem', color: '#e2e8f0' }}>{user.displayName}</span>
            </div>
            <textarea className="input bp-comment-textarea"
              placeholder="댓글을 입력하세요"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              rows={3} maxLength={500}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) submitComment() }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '0.4rem 1rem' }}
                onClick={submitComment} disabled={submitting || !commentText.trim()}>
                {submitting ? '…' : '댓글 등록'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bp-login-notice">로그인 후 댓글을 작성할 수 있습니다.</div>
        )}

        {/* 댓글 목록 */}
        <div className="bp-comment-list">
          {comments.map(cmt => (
            <div key={cmt.id} className="bp-comment">
              <div className="bp-comment-header">
                <div className="bp-card-author">
                  {cmt.createdByPhoto
                    ? <img src={cmt.createdByPhoto} alt="" className="bp-avatar" />
                    : <div className="bp-avatar-fallback">{cmt.createdByName?.[0] ?? '?'}</div>
                  }
                  <span className="bp-comment-name">{cmt.createdByName}</span>
                  <span className="bp-meta-info">{timeAgo(cmt.createdAt)}</span>
                </div>
                {canDelete(cmt) && (
                  <button className="bp-del-btn" onClick={() => deleteComment(cmt)}>삭제</button>
                )}
              </div>
              <p className="bp-comment-body">{cmt.content}</p>
            </div>
          ))}
          {comments.length === 0 && (
            <p style={{ color: '#334155', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem 0' }}>
              첫 댓글을 남겨보세요.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
