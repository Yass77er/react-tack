import { useEffect, useRef, useState } from 'react'
import './ProductsPage.css'

interface Product {
  id: number
  title: string
  description: string
  price: number
  discountPercentage: number
  rating: number
  stock: number
  category: string
  thumbnail: string
}

interface ProductsResponse {
  products: Product[]
}

interface RefreshResponse {
  accessToken: string
  refreshToken: string
}

interface Props {
  username: string
  avatar: string
  accessToken: string
  refreshToken: string
  onLogout: () => void
}

// Refresh 5 minutes before the 30-minute token expiry
const REFRESH_INTERVAL_MS = 25 * 60 * 1000

export default function ProductsPage({ username, avatar, accessToken, refreshToken, onLogout }: Props) {
  const PAGE_SIZE = 8

  const [products, setProducts] = useState<Product[]>([])
  const [skip, setSkip] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const [sortBy, setSortBy] = useState('title')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')

  const [showModal, setShowModal] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')
  const emptyForm = { title: '', description: '', price: '', stock: '', category: '', thumbnail: '' }
  const [form, setForm] = useState(emptyForm)

  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [editing, setEditing] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')

  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Track current tokens in refs so the interval always reads the latest value
  const accessTokenRef = useRef(accessToken)
  const refreshTokenRef = useRef(refreshToken)

  const [tokenStatus, setTokenStatus] = useState<'active' | 'refreshing' | 'error'>('active')
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  const fetchProducts = (currentSkip: number, append: boolean, sb = sortBy, ord = order) => {
    if (append) setLoadingMore(true)
    else setLoading(true)

    fetch(`https://dummyjson.com/products?limit=${PAGE_SIZE}&skip=${currentSkip}&sortBy=${sb}&order=${ord}`)
      .then((res) => res.json())
      .then((data: ProductsResponse & { total: number }) => {
        setProducts((prev) => append ? [...prev, ...data.products] : data.products)
        setTotal(data.total)
        setSkip(currentSkip + data.products.length)
      })
      .catch(() => setError('Failed to load products.'))
      .finally(() => {
        setLoading(false)
        setLoadingMore(false)
      })
  }

  const searchProducts = (currentSkip: number, append: boolean, sb = sortBy, ord = order) => {
    if (!query.trim()) return
    if (append) setLoadingMore(true)
    else setLoading(true)

    fetch(`https://dummyjson.com/products/search?q=${encodeURIComponent(query.trim())}&limit=${PAGE_SIZE}&skip=${currentSkip}&sortBy=${sb}&order=${ord}`)
      .then((res) => res.json())
      .then((data: ProductsResponse & { total: number }) => {
        setProducts((prev) => append ? [...prev, ...data.products] : data.products)
        setTotal(data.total)
        setSkip(currentSkip + data.products.length)
      })
      .catch(() => setError('Search failed. Please try again.'))
      .finally(() => {
        setLoading(false)
        setLoadingMore(false)
      })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setError('')
    setIsSearching(true)
    searchProducts(0, false)
  }

  const handleClear = () => {
    setQuery('')
    setIsSearching(false)
    setError('')
    fetchProducts(0, false)
  }

  const handleShowMore = () => {
    if (isSearching) searchProducts(skip, true)
    else fetchProducts(skip, true)
  }

  const handleSortChange = (newSortBy: string, newOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy)
    setOrder(newOrder)
    setError('')
    if (isSearching) searchProducts(0, false, newSortBy, newOrder)
    else fetchProducts(0, false, newSortBy, newOrder)
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError('')
    setAdding(true)

    try {
      const res = await fetch('https://dummyjson.com/products/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          price: parseFloat(form.price),
          stock: parseInt(form.stock),
          category: form.category,
          thumbnail: form.thumbnail || 'https://cdn.dummyjson.com/products/images/beauty/Essence%20Mascara%20Lash%20Princess/thumbnail.png',
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.message || 'Failed to add product')

      // Prepend the new product to the list
      setProducts((prev) => [data, ...prev])
      setTotal((prev) => prev + 1)
      setAddSuccess(`"${data.title}" added successfully!`)
      setForm(emptyForm)
      setTimeout(() => {
        setShowModal(false)
        setAddSuccess('')
      }, 1500)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteProduct = async () => {
    if (!deleteProduct) return
    setDeleteError('')
    setDeleting(true)

    try {
      const res = await fetch(`https://dummyjson.com/products/${deleteProduct.id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.message || 'Failed to delete product')

      setProducts((prev) => prev.filter((p) => p.id !== deleteProduct.id))
      setTotal((prev) => prev - 1)
      setDeleteProduct(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setDeleting(false)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setForm(emptyForm)
    setAddError('')
    setAddSuccess('')
  }

  const handleOpenEdit = (product: Product) => {
    setEditProduct(product)
    setEditForm({
      title: product.title,
      description: product.description ?? '',
      price: (product.price ?? '').toString(),
      stock: (product.stock ?? '').toString(),
      category: product.category ?? '',
      thumbnail: product.thumbnail ?? '',
    })
    setEditError('')
    setEditSuccess('')
  }

  const handleCloseEdit = () => {
    setEditProduct(null)
    setEditError('')
    setEditSuccess('')
  }

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editProduct) return
    setEditError('')
    setEditing(true)

    try {
      const res = await fetch(`https://dummyjson.com/products/${editProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          price: parseFloat(editForm.price),
          stock: parseInt(editForm.stock),
          category: editForm.category,
          thumbnail: editForm.thumbnail,
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.message || 'Failed to update product')

      // Update the product in the local list
      setProducts((prev) => prev.map((p) => p.id === editProduct.id ? { ...p, ...data } : p))
      setEditSuccess(`"${data.title}" updated successfully!`)
      setTimeout(() => {
        handleCloseEdit()
      }, 1500)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setEditing(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchProducts(0, false)
  }, [])

  // Auto-refresh access token every 25 minutes
  useEffect(() => {
    const doRefresh = async () => {
      setTokenStatus('refreshing')
      try {
        const res = await fetch('https://dummyjson.com/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refreshToken: refreshTokenRef.current,
            expiresInMins: 30,
          }),
          credentials: 'include',
        })

        const data: RefreshResponse = await res.json()

        if (!res.ok) throw new Error('Refresh failed')

        accessTokenRef.current = data.accessToken
        refreshTokenRef.current = data.refreshToken
        setTokenStatus('active')
        setLastRefreshed(new Date())
      } catch {
        setTokenStatus('error')
      }
    }

    const interval = setInterval(doRefresh, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="products-page">
      {/* Navbar */}
      <header className="navbar">
        <span className="navbar-brand">ShopApp</span>
        <div className="navbar-user">
          <div className={`token-badge token-${tokenStatus}`} title={
            tokenStatus === 'active'
              ? lastRefreshed
                ? `Token refreshed at ${lastRefreshed.toLocaleTimeString()}`
                : 'Token active'
              : tokenStatus === 'refreshing'
              ? 'Refreshing token…'
              : 'Token refresh failed'
          }>
            <span className="token-dot" />
            <span className="token-label">
              {tokenStatus === 'refreshing' ? 'Refreshing…' : tokenStatus === 'error' ? 'Token error' : 'Token active'}
            </span>
          </div>
          <img src={avatar} alt="avatar" className="nav-avatar" />
          <span className="nav-username">@{username}</span>
          <button className="nav-logout" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className="products-main">
        <div className="products-header">
          <div>
            <h1 className="products-title">
              {isSearching ? `Results for "${query.trim()}"` : 'All Products'}
            </h1>
            <p className="products-subtitle">
              {loading ? 'Loading…' : `Showing ${products.length} of ${total} products`}
            </p>
          </div>

          <div className="sort-controls">
            <label className="sort-label">Sort by</label>
            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value, order)}
            >
              <option value="title">Title</option>
              <option value="price">Price</option>
              <option value="rating">Rating</option>
              <option value="stock">Stock</option>
              <option value="discountPercentage">Discount</option>
            </select>
            <button
              className={`order-toggle ${order}`}
              onClick={() => handleSortChange(sortBy, order === 'asc' ? 'desc' : 'asc')}
              title={order === 'asc' ? 'Ascending — click for descending' : 'Descending — click for ascending'}
            >
              {order === 'asc' ? '↑ Asc' : '↓ Desc'}
            </button>
          </div>

          <div className="header-actions">
          <button className="add-product-btn" onClick={() => setShowModal(true)}>
            + Add Product
          </button>
          <form className="search-form" onSubmit={handleSearch}>
            <div className="search-input-wrap">
              <svg className="search-icon" viewBox="0 0 20 20" fill="none">
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2"/>
                <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Search products…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {isSearching && (
                <button type="button" className="search-clear" onClick={handleClear} title="Clear search">
                  ✕
                </button>
              )}
            </div>
            <button type="submit" className="search-btn" disabled={!query.trim() || loading}>
              Search
            </button>
          </form>
          </div>
        </div>

        {loading && <p className="status-msg">Loading products…</p>}
        {!loading && isSearching && products.length === 0 && !error && (
          <p className="status-msg">No products found for "{query.trim()}".</p>
        )}
        {error && <p className="status-msg error">{error}</p>}

        <div className="products-grid">
          {products.map((product) => (
            <div key={product.id} className="product-card">
              <div className="product-img-wrap">
                <img
                  src={product.thumbnail}
                  alt={product.title}
                  className="product-img"
                />
                {(product.discountPercentage ?? 0) > 0 && (
                  <span className="badge">
                    -{Math.round(product.discountPercentage)}%
                  </span>
                )}
              </div>

              <div className="product-body">
                <span className="product-category">{product.category}</span>
                <h2 className="product-name">{product.title}</h2>
                <p className="product-desc">{product.description}</p>

                <div className="product-footer">
                  <div className="product-price">
                    <span className="price-current">${(product.price ?? 0).toFixed(2)}</span>
                    <span className="product-stock">
                      {(product.stock ?? 0) > 0 ? `${product.stock} in stock` : 'Out of stock'}
                    </span>
                  </div>
                  <div className="product-rating">
                    <span className="star">★</span>
                    <span>{(product.rating ?? 0).toFixed(1)}</span>
                  </div>
                </div>

                <div className="card-actions">
                  <button className="add-to-cart">Add to Cart</button>
                  <button className="edit-btn" onClick={() => handleOpenEdit(product)} title="Edit product">
                    ✎
                  </button>
                  <button className="delete-btn" onClick={() => { setDeleteProduct(product); setDeleteError('') }} title="Delete product">
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!loading && products.length < total && (
          <div className="show-more-wrap">
            <button
              className="show-more-btn"
              onClick={handleShowMore}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading…' : `Show More (${total - products.length} remaining)`}
            </button>
          </div>
        )}

        {!loading && products.length >= total && total > 0 && (
          <p className="all-loaded">All {total} products loaded</p>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deleteProduct && (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteProduct(null)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Product</h2>
              <button className="modal-close" onClick={() => setDeleteProduct(null)} disabled={deleting}>✕</button>
            </div>

            <div className="delete-body">
              <div className="delete-icon">🗑</div>
              <p className="delete-msg">
                Are you sure you want to delete <strong>"{deleteProduct.title}"</strong>?
                This action cannot be undone.
              </p>
              {deleteError && <p className="add-error">{deleteError}</p>}
            </div>

            <div className="modal-footer">
              <button className="modal-cancel" onClick={() => setDeleteProduct(null)} disabled={deleting}>
                Cancel
              </button>
              <button className="modal-delete" onClick={handleDeleteProduct} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editProduct && (
        <div className="modal-overlay" onClick={handleCloseEdit}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Product <span className="modal-id">#{editProduct.id}</span></h2>
              <button className="modal-close" onClick={handleCloseEdit}>✕</button>
            </div>

            {editSuccess ? (
              <div className="add-success">
                <span className="success-check">✓</span>
                {editSuccess}
              </div>
            ) : (
              <form className="modal-form" onSubmit={handleUpdateProduct}>
                <div className="modal-field">
                  <label>Title <span className="required">*</span></label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    required
                  />
                </div>

                <div className="modal-field">
                  <label>Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="modal-row">
                  <div className="modal-field">
                    <label>Price ($) <span className="required">*</span></label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                      required
                    />
                  </div>
                  <div className="modal-field">
                    <label>Stock <span className="required">*</span></label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.stock}
                      onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="modal-field">
                  <label>Category</label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  />
                </div>

                <div className="modal-field">
                  <label>Thumbnail URL</label>
                  <input
                    type="url"
                    value={editForm.thumbnail}
                    onChange={(e) => setEditForm({ ...editForm, thumbnail: e.target.value })}
                  />
                </div>

                {editError && <p className="add-error">{editError}</p>}

                <div className="modal-footer">
                  <button type="button" className="modal-cancel" onClick={handleCloseEdit}>
                    Cancel
                  </button>
                  <button type="submit" className="modal-submit" disabled={editing}>
                    {editing ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Product</h2>
              <button className="modal-close" onClick={handleCloseModal}>✕</button>
            </div>

            {addSuccess ? (
              <div className="add-success">
                <span className="success-check">✓</span>
                {addSuccess}
              </div>
            ) : (
              <form className="modal-form" onSubmit={handleAddProduct}>
                <div className="modal-field">
                  <label>Title <span className="required">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. BMW Pencil"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>

                <div className="modal-field">
                  <label>Description</label>
                  <textarea
                    placeholder="Product description…"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="modal-row">
                  <div className="modal-field">
                    <label>Price ($) <span className="required">*</span></label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      required
                    />
                  </div>
                  <div className="modal-field">
                    <label>Stock <span className="required">*</span></label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="modal-field">
                  <label>Category</label>
                  <input
                    type="text"
                    placeholder="e.g. stationery"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                </div>

                <div className="modal-field">
                  <label>Thumbnail URL</label>
                  <input
                    type="url"
                    placeholder="https://…"
                    value={form.thumbnail}
                    onChange={(e) => setForm({ ...form, thumbnail: e.target.value })}
                  />
                </div>

                {addError && <p className="add-error">{addError}</p>}

                <div className="modal-footer">
                  <button type="button" className="modal-cancel" onClick={handleCloseModal}>
                    Cancel
                  </button>
                  <button type="submit" className="modal-submit" disabled={adding}>
                    {adding ? 'Adding…' : 'Add Product'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
