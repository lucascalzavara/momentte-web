import {LitElement, html, css} from 'lit'
import {customElement, property, state} from 'lit/decorators.js'
import {businessRequest as request} from '../api/business-api'

/** Private images stay behind the authenticated API, including thumbnails. */
@customElement('submission-image')
export class SubmissionImage extends LitElement {
 @property() path = ''
 @property() description = 'Imagem enviada para o evento'
 @state() private url = ''
 @state() private failed = false
 private version = 0
 protected updated(changed: Map<string, unknown>) { if (changed.has('path')) void this.load() }
 disconnectedCallback() { this.version++; this.release(); super.disconnectedCallback() }
 private release() { if (this.url) URL.revokeObjectURL(this.url); this.url = '' }
 private async load() {
  const version = ++this.version
  this.release(); this.failed = false
  if (!this.path) return
  try {
   const blob = await request<Blob>('GET', this.path, undefined, true)
   if (this.isConnected && version === this.version) this.url = URL.createObjectURL(blob)
  } catch { if (version === this.version) this.failed = true }
 }
 render() { return this.url ? html`<img src=${this.url} alt=${this.description}>` : html`<div role="status">${this.failed ? html`<span>Imagem indisponível</span><button @click=${this.load}>Tentar novamente</button>` : 'Carregando imagem…'}</div>` }
 static styles = css`:host{display:block;background:#eee8dd;overflow:hidden;border-radius:12px;min-height:180px}img{display:block;width:100%;height:100%;max-height:380px;object-fit:contain}div{min-height:180px;display:flex;align-items:center;justify-content:center;gap:12px;flex-direction:column;font:12px Arial;color:#796f66}button{font:inherit;border:1px solid #cbb89b;background:#fffaf1;color:#302b24;border-radius:6px;padding:10px;cursor:pointer}button:focus-visible{outline:3px solid #94713c}`
}
