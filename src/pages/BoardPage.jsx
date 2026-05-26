import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection, addDoc, query, orderBy, onSnapshot,
  serverTimestamp, doc, deleteDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useAdmin } from '../context/AdminContext'
import { useWorkspace } from '../context/WorkspaceContext'
import './BoardPage.css'

const MAX_IMAGE_MB = 5
const MAX_IMAGES   = 5

const LEGACY_KEY = 'JN7GFW'

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

const getImages = (post) => {
  if (post.imageURLs?.length) return post.imageURLs
  if (post.imageURL) return [post.imageURL]
  return []
}

export default function BoardPage() {
  const { user } = useAuth()
  const { adminMode } = useAdmin()
  const { currentWs } = useWorkspace()
  const navigate = useNavigate()

  // JN7GFW 방은 기존 전역 컬렉션 유지, 나머지는 워크스페이스별
  const postsParts = currentWs?.secretKey === LEGACY_KEY
    ? ['bankroll_posts']
    : ['workspaces', currentWs?.id, 'posts']

  const [posts, setPosts]         = useState([])
  const [showWrite, setShowWrite] = useState(false)
  const [title, setTitle]         = useState('')
  const [content, setContent]     = useState('')
  const [imageFiles, setImageFiles]         = useState([])
  const [imagePreviews, setImagePreviews]   = useState([])
  const [uploading, setUploading]           = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileRef = useRef()

  useEffect(() => {
    if (!currentWs?.id) return
    const q = query(collection(db, ...postsParts), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap =>
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [currentWs?.id])

  const handleImage = (e) => {
    const newFiles = Array.from(e.target.files)
    if (fileRef.current) fileRef.current.value = ''
    const remaining = MAX_IMAGES - imageFiles.length
    if (remaining <= 0) { alert('최대 5장까지 첨부 가능합니다.'); return }
    const toAdd = newFiles.slice(0, remaining)
    const oversized = toAdd.filter(f => f.size > MAX_IMAGE_MB * 1024 * 1024)
    if (oversized.length) { alert(`이미지는 ${MAX_IMAGE_MB}MB 이하만 가능합니다.`); return }
    setImageFiles(prev => [...prev, ...toAdd])
    setImagePreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))])
  }

  const removeImage = (i) => {
    setImageFiles(prev => prev.filter((_, idx) => idx !== i))
    setImagePreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  const resetForm = () => {
    setTitle(''); setContent('')
    setImageFiles([]); setImagePreviews([])
    setShowWrite(false); setUploadProgress(0)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || !user) return
    setUploading(true)
    try {
      const imageURLs = []
      for (let i = 0; i < imageFiles.length; i++) {
        setUploadProgress(Math.round((i / imageFiles.length) * 90))
        const compressed = await compressImage(imageFiles[i])
        const base64     = await toBase64(compressed)
        const res  = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, filename: imageFiles[i].name, mimeType: 'image/jpeg' }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        imageURLs.push(data.url)
      }
      if (imageFiles.length) setUploadProgress(100)

      await addDoc(collection(db, ...postsParts), {
        title: title.trim(),
        content: content.trim(),
        imageURLs,
        createdBy: user.uid,
        createdByName: user.displayName ?? '익명',
        createdByPhoto: user.photoURL ?? null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        commentCount: 0,
      })
      resetForm()
    } catch (e) {
      alert('등록 실패: ' + e.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (e, post) => {
    e.stopPropagation()
    if (!confirm(`"${post.title}" 글을 삭제하시겠습니까?`)) return
    await deleteDoc(doc(db, ...postsParts, post.id))
  }

  const canDelete = (post) => adminMode || (user && post.createdBy === user.uid)

  const timeAgo = (ts) => {
    if (!ts) return ''
    const sec = Math.floor((Date.now() - ts.toMillis()) / 1000)
    if (sec < 60) return '방금 전'
    if (sec < 3600) return `${Math.floor(sec / 60)}분 전`
    if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`
    return `${Math.floor(sec / 86400)}일 전`
  }

  return (
    <div className="page">
      <div className="bp-header">
        <div className="bp-board-title">
          <h2>게시판</h2>
          <span className="bp-board-suits">
            <span style={{ color: '#e2e8f0' }}>♠</span>
            <span style={{ color: '#ef4444' }}>♥</span>
            <span style={{ color: '#3b82f6' }}>♦</span>
            <span style={{ color: '#10b981' }}>♣</span>
          </span>
        </div>
        {user
          ? <button className="bp-write-btn" onClick={() => setShowWrite(true)}>+ 글쓰기</button>
          : <span style={{ fontSize: '0.75rem', color: '#334155' }}>로그인 후 글쓰기 가능</span>
        }
      </div>

      {posts.length === 0 && (
        <div className="bp-empty">
          <div style={{ fontSize: '2.5rem', opacity: 0.3 }}>📝</div>
          <p>아직 게시글이 없습니다.</p>
        </div>
      )}

      <div className="bp-list">
        {posts.map(post => {
          const images = getImages(post)
          return (
            <div key={post.id} className="bp-card" onClick={() => navigate(`/board/${post.id}`)}>
              {images.length > 0 && (
                <div className={`bp-card-thumb ${images.length >= 2 ? 'bp-card-thumb-multi' : ''}`}>
                  <div className="bp-thumb-cell">
                    <img src={images[0]} alt="" />
                  </div>
                  {images.length >= 2 && (
                    <div className="bp-thumb-cell" style={{ position: 'relative' }}>
                      <img src={images[1]} alt="" />
                      {images.length > 2 && (
                        <div className="bp-thumb-more">+{images.length - 1}</div>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="bp-card-body">
                <div className="bp-card-title">{post.title}</div>
                <div className="bp-card-preview">{post.content}</div>
                <div className="bp-card-meta">
                  <div className="bp-card-author">
                    {post.createdByPhoto
                      ? <img src={post.createdByPhoto} alt="" className="bp-avatar" />
                      : <div className="bp-avatar-fallback">{post.createdByName?.[0] ?? '?'}</div>
                    }
                    <span>{post.createdByName}</span>
                  </div>
                  <div className="bp-meta-right">
                    <span className="bp-chip">💬 {post.commentCount ?? 0}</span>
                    <span className="bp-meta-time">{timeAgo(post.createdAt)}</span>
                    {canDelete(post) && (
                      <button className="bp-del-btn" onClick={e => handleDelete(e, post)}>삭제</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showWrite && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="bp-write-modal" onClick={e => e.stopPropagation()}>
            <div className="bp-modal-header">
              <span className="bp-modal-title">새 글 작성</span>
              <button className="modal-close" onClick={resetForm}>✕</button>
            </div>

            <input className="input" placeholder="제목" value={title}
              onChange={e => setTitle(e.target.value)} maxLength={80}
              style={{ marginBottom: '0.6rem' }} />

            <textarea className="input bp-textarea" placeholder="내용을 입력하세요"
              value={content} onChange={e => setContent(e.target.value)}
              rows={6} maxLength={2000} />

            <div className="bp-image-area">
              <div className="bp-image-list">
                {imagePreviews.map((src, i) => (
                  <div key={i} className="bp-image-preview">
                    <img src={src} alt="" />
                    <button className="bp-image-remove" onClick={() => removeImage(i)}>✕</button>
                  </div>
                ))}
              </div>
              {imageFiles.length < MAX_IMAGES && (
                <label className="bp-image-upload-btn" style={{ marginTop: imagePreviews.length ? '0.5rem' : 0 }}>
                  <input type="file" accept="image/*" multiple ref={fileRef} onChange={handleImage} style={{ display: 'none' }} />
                  📷 사진 추가
                  <span style={{ fontSize: '0.7rem', color: '#475569' }}>({imageFiles.length}/{MAX_IMAGES})</span>
                </label>
              )}
            </div>

            {uploading && (
              <div className="bp-progress-wrap">
                <div className="bp-progress-bar" style={{ width: `${uploadProgress}%` }} />
                <span className="bp-progress-text">{uploadProgress}%</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={resetForm}>취소</button>
              <button className="btn btn-primary" style={{ flex: 1 }}
                onClick={handleSubmit}
                disabled={uploading || !title.trim() || !content.trim()}>
                {uploading ? '업로드 중…' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
