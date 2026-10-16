import {LitElement, html, css} from 'lit'
import {repeat} from 'lit/directives/repeat.js'
import {customElement, property, state} from 'lit/decorators.js'
import {businessRequest as request} from '../api/business-api'
import {date, stateNames, statusNames} from '../types/events'
import type {EventItem, Submission} from '../types/events'
import '../components/submission-image'

@customElement('moderation-page')
export class ModerationPage extends LitElement {
 @property() eventId = ''
 @state() private event?: EventItem
 @state() private items: Submission[] = []
 @state() private filter = 'pending'
 @state() private error = ''
 @state() private notice = ''
 @state() private loading = false
 @state() private acting = ''
 @state() private refreshed = ''
 private timer = 0
 private generation = 0
 protected firstUpdated() { void this.load() }
 protected updated(changed: Map<string, unknown>) {
  if (changed.has('eventId') && changed.get('eventId')) {
   this.generation++; this.event = undefined; this.items = []; this.filter = 'pending'; void this.load()
  }
 }
 disconnectedCallback() { this.generation++; window.clearTimeout(this.timer); super.disconnectedCallback() }
 private async load() {
  window.clearTimeout(this.timer)
  const generation = ++this.generation
  const id = this.eventId
  this.loading = true
  try {
   const events = await request<EventItem[]>('GET', '/api/v1/events')
   const event = events.find(e => e.id === id)
   if (!event) throw new Error('Evento não encontrado ou sem acesso de organizador.')
   const items = event.state === 'active' || event.state === 'awaiting_download'
    ? await request<Submission[]>('GET', `/api/v1/events/${id}/submissions`) : []
   if (!this.isConnected || generation !== this.generation) return
   this.event = event; this.items = items; this.error = ''
   this.refreshed = new Date().toLocaleTimeString('pt-BR')
   document.title = 'Moderação · ' + event.name + ' — Momentte'
  } catch (error) {
   if (generation === this.generation) this.error = error instanceof Error ? error.message : 'Não foi possível atualizar os envios.'
  } finally {
   if (generation === this.generation) {
    this.loading = false
    if (this.isConnected && this.event?.state !== 'finalized') this.timer = window.setTimeout(() => { if (!this.acting) void this.load(); else this.timer = window.setTimeout(() => void this.load(), 5000) }, 5000)
   }
  }
 }
 private async moderate(item: Submission, status: string) {
  if (this.acting) return
  this.acting = item.id; this.error = ''; this.notice = ''
  try {
   await request('PUT', `/api/v1/events/${this.eventId}/submissions/${item.id}/moderation`, {status})
   this.notice = status === 'approved' ? 'Conteúdo aprovado e liberado para os telões ativos.' : 'Conteúdo rejeitado. Ele não será exibido nos telões.'
   await this.load()
  } catch (error) { this.error = error instanceof Error ? error.message : 'Não foi possível alterar o envio.' }
  finally { this.acting = '' }
 }
 render() {
  const event = this.event
  const visible = this.items.filter(item => this.filter === 'all' || item.status === this.filter)
  const available = event?.state === 'active' || event?.state === 'awaiting_download'
  return html`<main><header><a href="/conta" class="brand"><img src="/brand/wordmark.svg" alt="Momentte"></a><a href="/conta">← Meus eventos</a></header>
   <section class="heading"><div><span class="eyebrow">CADA OLHAR MERECE CUIDADO</span><h1>Moderação do evento</h1><p>${event?.name ?? 'Carregando evento…'} ${event ? html`<span class="tag">${stateNames[event.state]}</span>` : ''}</p></div><div class="actions">${event?.state === 'active' ? html`<a class="primary" href=${'/telao/' + event.id} target="_blank" rel="noopener">Abrir telão ↗</a>` : ''}<button ?disabled=${this.loading || !!this.acting} @click=${()=>this.load()}>${this.loading ? 'Atualizando…' : 'Atualizar envios'}</button></div></section>
   ${this.error ? html`<p class="error" role="alert">${this.error}</p>` : ''}${this.notice ? html`<p class="notice" role="status">${this.notice}</p>` : ''}
   ${event ? html`<div class="mode"><span class="indicator"></span><div><strong>${event.moderationEnabled ? 'Aprovação antes de exibir' : 'Publicação automática'}</strong><p>${event.moderationEnabled ? 'Novos envios chegam em Pendentes. Aprove para liberar aos telões.' : 'Este evento está sem moderação prévia. Os envios são aprovados automaticamente; você pode rejeitá-los aqui.'}</p></div><small>${this.refreshed ? 'Atualizado às ' + this.refreshed : ''}<br>Atualização automática a cada 5 s</small></div>` : ''}
   ${available ? html`<nav aria-label="Filtrar envios">${[['pending','Pendentes'],['approved','Aprovados'],['rejected','Rejeitados'],['all','Todos']].map(([key,label])=>html`<button aria-pressed=${this.filter === key} @click=${()=>{this.filter=key;this.notice=''}}>${label}<b>${this.items.filter(item=>key==='all'||item.status===key).length}</b></button>`)}</nav><p class="hint">Até 200 envios por consulta, com prioridade para pendentes. Os contadores se referem a essa consulta. Rejeitar um aprovado o retira das próximas atualizações dos telões.</p>
    ${visible.length ? html`<section class="grid" aria-label="Conteúdos para moderação">${repeat(visible,item=>item.id,item=>html`<article><div class="content">${item.hasImage ? html`<submission-image .path=${`/api/v1/events/${this.eventId}/submissions/${item.id}/preview`}></submission-image>` : html`<span class="quote" aria-hidden="true">“</span>`}${item.text ? html`<p class="message">${item.text}</p>` : ''}</div><div class="metadata"><span class=${'tag '+item.status}>${statusNames[item.status]}</span><strong>${item.authorName ?? 'Participante'}</strong><small>${date(item.createdAt)}</small></div><footer>${item.status!=='approved' ? html`<button class="approve" ?disabled=${!!this.acting} @click=${()=>this.moderate(item,'approved')}>${this.acting===item.id?'Salvando…':'✓ Aprovar'}</button>` : ''}${item.status!=='rejected' ? html`<button class="reject" ?disabled=${!!this.acting} @click=${()=>this.moderate(item,'rejected')}>Rejeitar</button>` : ''}</footer></article>`)}</section>` : html`<section class="empty"><span>✧</span><h2>${this.filter==='pending'?'Tudo em dia por aqui.':'Nenhum envio nesta categoria.'}</h2><p>${this.filter==='pending'?'Novos conteúdos aguardando aprovação aparecerão aqui automaticamente.':'Escolha outro filtro para acompanhar os momentos do evento.'}</p></section>`}` : event ? html`<section class="empty"><span>✧</span><h2>${event.state==='organization'?'A história ainda vai começar.':'Este evento foi finalizado.'}</h2><p>${event.state==='organization'?'Inicie o evento para receber os primeiros envios.':'O prazo das mídias terminou e a moderação foi encerrada.'}</p><a href="/conta">Voltar aos meus eventos ↗</a></section>` : ''}
  </main>`
 }
 static styles=css`:host{display:block;min-height:100svh;background:#f8f6f1;color:#302b24;font-family:'DM Sans',Arial,sans-serif}*{box-sizing:border-box}main{max-width:1400px;padding:30px 45px 60px;margin:auto}header{display:flex;justify-content:space-between;align-items:center;padding-bottom:25px;border-bottom:1px solid #e4dccf}a{color:inherit;text-decoration:none;font-size:12px}.brand img{width:145px}.heading{display:flex;justify-content:space-between;align-items:center;gap:25px;margin:40px 0 25px}.eyebrow{font-size:9px;letter-spacing:2px;color:#94713c}h1{font:500 36px/1.2 Manrope,Arial;letter-spacing:-1px;margin:12px 0}.heading p{font-size:15px;line-height:1.8}.tag{font-size:10px;padding:6px 10px;background:#eee7db;border-radius:20px;display:inline-block}.heading .tag{margin-left:10px}.actions{display:flex;flex-wrap:wrap;gap:10px}button,.primary{font:inherit;font-size:12px;border:1px solid #d9d0c1;background:#fffdf8;color:#302b24;padding:12px 16px;border-radius:7px;cursor:pointer}.primary{background:#302b24;color:#fffaf1;border-color:#302b24}.mode{display:flex;align-items:center;gap:15px;padding:22px;background:#eee8dc;border-radius:12px}.mode strong{font-size:13px}.mode p{font-size:12px;color:#796f66;margin:7px 0 0;line-height:1.7}.mode small{margin-left:auto;text-align:right;font-size:10px;color:#796f66;line-height:1.8;flex-shrink:0}.indicator{width:10px;height:10px;background:#7f936a;border-radius:50%;flex-shrink:0}nav{display:flex;gap:10px;flex-wrap:wrap;margin:28px 0 12px}nav button{display:flex;align-items:center;gap:15px}nav b{font-size:10px;padding:4px 7px;background:#eee7db;border-radius:20px}nav [aria-pressed=true]{background:#302b24;color:#fffaf1;border-color:#302b24}nav [aria-pressed=true] b{color:#302b24}.hint{font-size:10px;color:#8a7d6b;line-height:1.8;margin-bottom:24px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:22px}article{display:flex;flex-direction:column;min-width:0;background:#fffdf8;border:1px solid #ded8cc;border-radius:14px;overflow:hidden}.content{padding:16px;flex:1}.quote{font:80px/1 Georgia;color:#b99251;display:block;height:55px}.message{font-size:18px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere;margin:18px 5px}.metadata{display:grid;gap:9px;padding:5px 21px 18px}.metadata .tag{justify-self:start}.metadata strong{font-size:12px;font-weight:500;overflow-wrap:anywhere}.metadata small{font-size:10px;color:#8a7d6b}.approved{background:#e8eedf;color:#5a7145}.rejected{background:#f3e1da;color:#944836}.pending{background:#f0e6d4;color:#94713c}footer{display:flex;gap:10px;border-top:1px solid #e4dccf;padding:16px 20px}footer button{flex:1}.approve{background:#66794f;color:white;border-color:#66794f}.reject{color:#944836}.empty{text-align:center;padding:70px 25px;background:#fffdf8;border:1px dashed #d9d0c1;border-radius:12px;margin-top:25px}.empty>span{font-size:55px;color:#b99251}h2{font-size:23px;font-weight:500}.empty p{font-size:13px;color:#796f66;line-height:1.8}.notice,.error{padding:15px;border-radius:8px;font-size:12px;line-height:1.8}.notice{background:#e8eedf;color:#51653f}.error{background:#f3e1da;color:#944836}button:disabled{opacity:.5;cursor:wait}button:focus-visible,a:focus-visible{outline:3px solid #b99251;outline-offset:3px}@media(max-width:650px){main{padding:22px 20px 40px}.brand img{width:120px}.heading{align-items:start;flex-direction:column;margin-top:30px}h1{font-size:29px}.mode{flex-wrap:wrap}.mode small{margin-left:25px;text-align:left}.grid{grid-template-columns:1fr}nav{gap:7px}nav button{padding:10px;gap:8px}}
 `
}
