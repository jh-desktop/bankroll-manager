import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection, addDoc, query, orderBy, onSnapshot,
  serverTimestamp, doc, deleteDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useAdmin } from '../context/AdminContext'
import './BoardPage.css'

const MAX_IMAGE_MB = 5

const toBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload  = () => resolve(reader.result.split(',')[1])
  reader.onerror = reject
  reader.readAsDataURL(file)
})

export default function BoardPage() {
  const { user } = useAuth()
  const { adminMode } = useAdmin()
  const navigate = useNavigate()

  const [posts, setPosts]       = useState([])
  const [showWrite, setShowWrite] = useState(false)
  const [title, setTitle]       = useState('')
  const [content, setContent]   = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileRef = useRef()

  useEffect(() => {
    const q = query(collection(db, 'bankroll_posts'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap =>
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [])

  const handleImage = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      alert(`이미지는 ${MAX_IMAGE_MB}MB 이하만 업로드 가능합니다.`)
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const resetForm = () => {
    setTitle(''); setContent(''); setImageFile(null)
    setImagePreview(null); setShowWrite(false)
    setUploadProgress(0)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return
    if (!user) return
    setUploading(true)
    try {
      let imageURL = null
      if (imageFile) {
        setUploadProgress(30)
        const base64 = await toBase64(imageFile)
        setUploadProgress(60)
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, filename: imageFile.name, mimeType: imageFile.type }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        imageURL = data.url
        setUploadProgress(100)
      }
      await addDoc(collection(db, 'bankroll_posts'), {
        title: title.trim(),
        content: content.trim(),
        imageURL,
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
    await deleteDoc(doc(db, 'bankroll_posts', post.id))
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
      {/* 헤더 */}
      <div className="bp-header">
        <h2 className="page-title" style={{ margin: 0 }}>게시판</h2>
        {user && (
          <button className="btn btn-primary bp-write-btn" onClick={() => setShowWrite(true)}>
            + 글쓰기
          </button>
        )}
        {!user && (
          <span style={{ fontSize: '0.78rem', color: '#475569' }}>로그인 후 글쓰기 가능</span>
        )}
      </div>

      {/* 글 목록 */}
      {posts.length === 0 && (
        <div className="bp-empty">
          <div style={{ fontSize: '2.5rem', opacity: 0.3 }}>📝</div>
          <p>아직 게시글이 없습니다.</p>
        </div>
      )}

      <div className="bp-list">
        {posts.map(post => (
          <div key={post.id} className="bp-card" onClick={() => navigate(`/board/${post.id}`)}>
            {post.imageURL && (
              <div className="bp-card-thumb">
                <img src={post.imageURL} alt="" />
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="bp-meta-info">💬 {post.commentCount ?? 0}</span>
                  <span className="bp-meta-info">{timeAgo(post.createdAt)}</span>
                  {canDelete(post) && (
                    <button className="bp-del-btn" onClick={e => handleDelete(e, post)}>삭제</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 글쓰기 모달 */}
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

            {/* 이미지 업로드 */}
            <div className="bp-image-area">
              {imagePreview
                ? (
                  <div className="bp-image-preview">
                    <img src={imagePreview} alt="" />
                    <button className="bp-image-remove" onClick={() => { setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = '' }}>✕</button>
                  </div>
                )
                : (
                  <label className="bp-image-upload-btn">
                    <input type="file" accept="image/*" ref={fileRef} onChange={handleImage} style={{ display: 'none' }} />
                    📷 사진 추가 <span style={{ fontSize: '0.7rem', color: '#475569' }}>(최대 5MB)</span>
                  </label>
                )
              }
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
