import { LitElement, css, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { businessRequest as request } from '../api/business-api'

interface Plan { code: string; name: string; priceCents: number; activeWorks: number | null; csvExport: boolean; eventActivations: number }
interface Billing { plan: Plan; plans: Plan[]; cycle: { activationsUsed: number; endsAt: string } | null; contract: { id: string; planCode: string; pendingPlan: string | null; cancelled: boolean; checkoutUrl: string | null } | null; orders: { id: string; eventId: string | null; kind: string; status: string; checkoutUrl: string | null; amountCents: number; planCode: string }[]; checkoutAvailable: boolean }
interface EventItem { id: string; name: string; endsAt: string; state: string; paid: boolean; downloadUntil: string | null; canDownload: boolean; storageLimitBytes: number; storageUsedBytes: number; themeColor: string | null; hasCustomLogo: boolean }
interface Works { works: { id: string; name: string; status: string }[]; activeCount: number; activeLimit: number | null; canCreate: boolean; canExportCsv: boolean }
const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const date = (value: string) => new Date(value).toLocaleString('pt-BR')
const states: Record<string, string> = { organization: 'Organização', active: 'Ativo', awaiting_download: 'Aguardando download', finalized: 'Finalizado', completed: 'Concluída', archived: 'Arquivada' }
@customElement('business-panel')
export class BusinessPanel extends LitElement {
  @property() product: 'momentte' | 'alicerce' = 'momentte'
  @property({ type: Boolean }) canManageBilling = true
  @state() private billing?: Billing
  @state() private events: EventItem[] = []
  @state() private works?: Works
  @state() private busy = false
  @state() private error = ''
  @state() private notice = ''
  @state() private edit?: EventItem
  @state() private media: { id: string; eventId: string }[] = []
  @state() private screen?: EventItem
  @state() private photo = ''
  @state() private logo = ''
  private screenTimer = 0
  private slide = 0
  connectedCallback() { super.connectedCallback(); void this.run(() => this.load()) }
  disconnectedCallback() { this.closeScreen(); super.disconnectedCallback() }
  private async load() {
    this.billing = await request<Billing>('GET', '/api/v1/billing')
    if (this.product === 'momentte') this.events = await request<EventItem[]>('GET', '/api/v1/events')
    else this.works = await request<Works>('GET', '/api/v1/works')
  }
  private async run(action: () => Promise<unknown>) {
    if (this.busy) return
    this.busy = true; this.error = ''; this.notice = ''
    try { await action() } catch (error) { this.error = error instanceof Error ? error.message : 'Não foi possível concluir.' }
    finally { this.busy = false }
  }
  private async checkout(kind: string, planCode: string, eventId?: string, requestKey: string = crypto.randomUUID()) {
    await this.run(async () => {
      const result = await request<{ checkoutUrl: string }>('POST', '/api/v1/billing/checkout', { kind, planCode, eventId, requestKey })
      if (!result.checkoutUrl?.startsWith('https://')) throw new Error('O checkout não retornou uma URL segura.')
      window.location.assign(result.checkoutUrl)
    })
  }
  private async plan(plan: Plan) {
    const current = this.billing!.plan
    if (plan.priceCents > current.priceCents) await this.checkout(current.priceCents === 0 ? 'subscription' : 'upgrade', plan.code)
    else if (confirm(plan.code === 'free' ? 'Cancelar renovação? Seus benefícios permanecem até o fim do período pago.' : 'Agendar este plano para o próximo ciclo? O período atual permanece inalterado.'))
      await this.run(async () => { await request('POST', '/api/v1/billing/change-plan', { planCode: plan.code }); await this.load(); this.notice = 'Alteração agendada. O período já pago foi preservado.' })
  }
  private async create(event: SubmitEvent) {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement; const data = new FormData(form)
    await this.run(async () => {
      if (this.product === 'momentte') {
        const end = new Date(String(data.get('end')))
        if (Number.isNaN(end.getTime())) throw new Error('Informe a data e hora de término.')
        await request(this.edit ? 'PUT' : 'POST', this.edit ? `/api/v1/events/${this.edit.id}` : '/api/v1/events', { name: data.get('name'), endsAt: end.toISOString(), themeColor: data.get('color') || null })
        this.edit = undefined
      } else await request('POST', '/api/v1/works', { name: data.get('name') })
      form.reset(); await this.load()
    })
  }
  private async activate(item: EventItem, source: string) {
    if (!confirm(source === 'free' ? 'Iniciar gratuitamente? Nome, término e customização ficarão travados.' : 'Iniciar com recursos pagos? Uma ativação/compra será consumida e a edição ficará travada.')) return
    await this.run(async () => { await request('POST', `/api/v1/events/${item.id}/activate`, { source }); await this.load() })
  }
  private async upload(item: EventItem, event: Event, logo: boolean) {
    const input = event.target as HTMLInputElement; const file = input.files?.[0]
    if (!file) return
    await this.run(async () => { const data = new FormData(); data.set('file', file); await request('POST', `/api/v1/events/${item.id}/${logo ? 'logo' : 'media'}`, data); await this.load(); this.notice = 'Imagem enviada.' })
    input.value = ''
  }
  private async download(path: string, name: string) {
    await this.run(async () => {
      const blob = await request<Blob>('GET', path, undefined, true); const url = URL.createObjectURL(blob)
      const link = document.createElement('a'); link.href = url; link.download = name; link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    })
  }
  private async openScreen(item: EventItem) {
    this.closeScreen(); this.screen = item
    if (item.hasCustomLogo) { const blob = await request<Blob>('GET', `/api/v1/events/${item.id}/logo`, undefined, true); this.logo = URL.createObjectURL(blob) }
    await this.frame()
  }
  private async frame() {
    const current = this.screen
    if (!current) return
    try {
      const events = await request<EventItem[]>('GET', '/api/v1/events'); const event = events.find(e => e.id === current.id)
      if (event?.state !== 'active') { this.closeScreen(); this.notice = 'O evento foi encerrado.'; await this.load(); return }
      const media = await request<{id:string}[]>('GET', `/api/v1/events/${current.id}/media`)
      if (media.length) {
        const item = media[this.slide++ % media.length]
        const blob = await request<Blob>('GET', `/api/v1/events/${current.id}/media/${item.id}`, undefined, true)
        if (!this.screen) return
        if (this.photo) URL.revokeObjectURL(this.photo)
        this.photo = URL.createObjectURL(blob)
      }
    } catch (error) { this.error = error instanceof Error ? error.message : 'Falha ao atualizar telão.' }
    if (this.screen) this.screenTimer = window.setTimeout(() => { void this.frame() }, 5000)
  }
  private closeScreen() { window.clearTimeout(this.screenTimer); if (this.photo) URL.revokeObjectURL(this.photo); if (this.logo) URL.revokeObjectURL(this.logo); this.photo = ''; this.logo = ''; this.screen = undefined }
  render() {
    const billing = this.billing
    return html`<section class="workspace"><div class="title"><div><span class="eyebrow">${this.product === 'momentte' ? 'SEUS PRÓXIMOS MOMENTOS' : 'SUA EMPRESA, SUAS OBRAS'}</span><h2>${this.product === 'momentte' ? 'Eventos e assinatura' : 'Obras e assinatura'}</h2></div><button ?disabled=${this.busy} @click=${() => this.run(async () => { await request('POST','/api/v1/billing/reconcile',{}); await this.load(); this.notice = 'Situação atualizada.' })}>Atualizar pagamentos</button></div>
      ${this.error ? html`<p class="alert" role="alert">${this.error}</p>` : ''}${this.notice ? html`<p class="notice" role="status">${this.notice}</p>` : ''}${this.busy ? html`<p role="status">Processando…</p>` : ''}
      ${billing ? html`<div class="summary"><strong>Plano ${billing.plan.name}</strong><span>${this.product === 'momentte' ? billing.cycle ? `${billing.cycle.activationsUsed}/8 ativações usadas neste ciclo` : '1 GB por evento · download até 24h após o término' : `${this.works?.activeCount ?? 0}/${billing.plan.activeWorks ?? '∞'} obras ativas`}</span>${billing.cycle ? html`<span>Período pago até ${date(billing.cycle.endsAt)}</span>` : ''}${billing.contract?.pendingPlan ? html`<span>Próximo ciclo: ${billing.contract.pendingPlan === 'free' ? 'Gratuito, sem renovação' : billing.plans.find(p => p.code === billing.contract?.pendingPlan)?.name}</span>` : ''}</div>
      ${!billing.checkoutAvailable ? html`<p class="notice">O checkout será habilitado após configurar as credenciais e URLs do Mercado Pago no servidor.</p>` : ''}
      <div class="plans">${billing.plans.map(plan => html`<article class=${plan.code === billing.plan.code ? 'plan current' : 'plan'}><h3>${plan.name}</h3><strong class="price">${money(plan.priceCents)}${plan.priceCents ? html`<small>/mês</small>` : ''}</strong><p>${this.product === 'momentte' ? plan.code === 'free' ? 'Marca Momentte · 1 GB/evento · download até 24h depois' : '8 ativações/ciclo · 10 GB/evento · customização completa · download até 72h depois' : `${plan.activeWorks ?? 'Sem limite de'} obras simultâneas · ${plan.csvExport ? 'funções completas e CSV' : 'sem exportação CSV'}`}</p><button ?disabled=${this.busy || !this.canManageBilling || plan.code === billing.plan.code || !billing.checkoutAvailable} @click=${() => this.plan(plan)}>${plan.code === billing.plan.code ? 'Plano atual' : plan.priceCents > billing.plan.priceCents ? billing.plan.priceCents ? 'Upgrade proporcional' : 'Assinar' : 'Próximo ciclo'}</button></article>`)}</div>
      ${billing.contract?.checkoutUrl && !billing.cycle && !billing.contract.cancelled ? html`<a class="checkout" href=${billing.contract.checkoutUrl}>Continuar checkout da assinatura ↗</a>` : ''}
      ${billing.contract && !billing.cycle && !billing.contract.checkoutUrl && !billing.contract.cancelled ? html`<button ?disabled=${this.busy || !billing.checkoutAvailable || !this.canManageBilling} @click=${() => this.checkout('subscription',billing.contract!.planCode,undefined,billing.contract!.id)}>Retomar criação do checkout</button>` : ''}
      ${billing.orders.filter(o => o.status === 'pending' && !o.checkoutUrl).map(order => html`<button ?disabled=${this.busy || !billing.checkoutAvailable || !this.canManageBilling} @click=${() => this.checkout(order.kind,order.planCode,order.eventId ?? undefined,order.id)}>Retomar compra ${money(order.amountCents)}</button>`)}
      ${billing.contract && !billing.contract.cancelled && this.canManageBilling ? html`<button ?disabled=${this.busy || !billing.checkoutAvailable} @click=${() => this.plan(billing.plans.find(p => p.code === 'free')!)}>Cancelar renovação</button>` : ''}
      <h3>${this.edit ? 'Editar evento em organização' : this.product === 'momentte' ? 'Organize um evento' : 'Cadastre uma obra'}</h3>
      <form @submit=${this.create}><label>Nome<input name="name" required maxlength="150" .value=${this.edit?.name ?? ''} placeholder=${this.product === 'momentte' ? 'Nome da celebração' : 'Nome da obra'}></label>${this.product === 'momentte' ? html`<label>Término previsto<input name="end" type="datetime-local" required .value=${this.edit ? new Date(new Date(this.edit.endsAt).getTime() - new Date(this.edit.endsAt).getTimezoneOffset()*60000).toISOString().slice(0,16) : ''}></label><label>Cor personalizada (pago)<input name="color" pattern="#[0-9a-fA-F]{6}" placeholder="#b99251" .value=${this.edit?.themeColor ?? ''}></label>` : ''}<button ?disabled=${this.busy || this.product === 'alicerce' && !this.works?.canCreate}>${this.edit ? 'Salvar edição' : this.product === 'momentte' ? 'Criar em organização' : 'Criar obra'}</button>${this.edit ? html`<button type="button" @click=${() => this.edit = undefined}>Cancelar edição</button>` : ''}</form>
      ${this.product === 'alicerce' ? html`${this.works && !this.works.canCreate ? html`<p class="notice">O limite de obras ativas foi atingido. Seus dados foram preservados; conclua ou arquive obras para liberar vagas.</p>` : ''}<button ?disabled=${this.busy || !this.works?.canExportCsv} @click=${() => this.download('/api/v1/works/export','obras.csv')}>Exportar relatório de obras (CSV)</button><div class="items">${this.works?.works.map(work => html`<article><h3>${work.name}</h3><span>${states[work.status]}</span><div class="actions">${['active','completed','archived'].filter(status => status !== work.status).map(status => html`<button ?disabled=${this.busy || status === 'active' && !this.works?.canCreate} @click=${() => this.run(async () => { await request('PUT',`/api/v1/works/${work.id}/status`,{status}); await this.load() })}>${status === 'active' ? 'Reativar' : status === 'completed' ? 'Concluir' : 'Arquivar'}</button>`)}</div></article>`)}</div>` : html`<div class="items">${this.events.map(item => {
        const purchase = billing.orders.find(o => o.eventId === item.id && o.kind === 'event' && (o.status === 'paid' || o.status === 'pending'))
        const credit = purchase?.status === 'paid' || billing.orders.some(o => o.eventId === null && o.kind === 'event' && o.status === 'paid')
        return html`<article><div class="item-head"><h3>${item.name}</h3><span class="tag">${states[item.state]}</span></div><p>${item.paid ? 'Pago · customização completa' : 'Gratuito'} · ${(item.storageUsedBytes/1e9).toFixed(2)}/${item.storageLimitBytes/1e9} GB</p><p>Término: ${date(item.endsAt)}${item.downloadUntil ? html`<br>Download até ${date(item.downloadUntil)}` : ''}</p>${item.state === 'organization' && (item.hasCustomLogo || item.themeColor) ? html`<button ?disabled=${this.busy} @click=${() => this.run(async () => { await request('DELETE',`/api/v1/events/${item.id}/customization`); await this.load() })}>Remover customização</button>` : ''}<div class="actions">${item.state === 'organization' ? html`<button ?disabled=${this.busy} @click=${() => this.edit=item}>Editar</button><button ?disabled=${this.busy} @click=${() => this.activate(item,'free')}>Iniciar gratuito</button><button ?disabled=${this.busy || !billing.cycle || billing.cycle.activationsUsed>=8} @click=${() => this.activate(item,'subscription')}>Usar ativação da assinatura</button><button ?disabled=${this.busy || !credit} @click=${() => this.activate(item,'purchase')}>Usar compra paga</button>${purchase?.status === 'pending' && purchase.checkoutUrl ? html`<a class="checkout" href=${purchase.checkoutUrl}>Continuar pagamento ↗</a>` : !credit ? html`<button ?disabled=${this.busy || !billing.checkoutAvailable} @click=${() => this.checkout('event','paid-event',item.id)}>Comprar por ${money(billing.cycle && billing.cycle.activationsUsed>=8 ? 2000 : 3000)}</button>` : ''}<label class="file">${item.hasCustomLogo ? 'Substituir logo' : 'Logo própria (pago)'}<input type="file" accept="image/jpeg,image/png,image/webp" ?disabled=${this.busy} @change=${(e:Event) => this.upload(item,e,true)}></label><button ?disabled=${this.busy} @click=${() => { if(confirm('Excluir este evento em organização?')) void this.run(async () => { await request('DELETE',`/api/v1/events/${item.id}`); await this.load() }) }}>Excluir</button>` : item.state === 'active' ? html`<label class="file">Enviar foto<input type="file" accept="image/jpeg,image/png,image/webp" ?disabled=${this.busy} @change=${(e:Event) => this.upload(item,e,false)}></label><button ?disabled=${this.busy} @click=${() => this.run(() => this.openScreen(item))}>Abrir telão</button><button ?disabled=${this.busy} @click=${() => { if(confirm('Encerrar agora? O prazo de download começa imediatamente.')) void this.run(async () => { await request('POST',`/api/v1/events/${item.id}/end`,{}); await this.load() }) }}>Encerrar</button>` : ''}${item.canDownload ? html`<button ?disabled=${this.busy} @click=${() => this.run(async () => { this.media = await request('GET',`/api/v1/events/${item.id}/media`) })}>Ver downloads</button>` : ''}</div>${this.media.filter(m=>m.eventId===item.id).map((m,i)=>html`<button ?disabled=${this.busy} @click=${() => this.download(`/api/v1/events/${item.id}/media/${m.id}`,`${item.name}-${i+1}`)}>Baixar foto ${i+1}</button>`)}</article>`
      })}</div>`}` : ''}
      ${this.screen ? html`<div class="screen" style=${`background:${this.screen.themeColor ?? '#2f241e'}`}><header><img src=${this.logo || '/brand/wordmark.svg'} alt=${this.logo ? 'Logo do evento' : 'Momentte'}><h2>${this.screen.name}</h2><button @click=${this.closeScreen}>Fechar telão</button></header>${this.photo ? html`<img class="slide" src=${this.photo} alt="Foto compartilhada no evento">` : html`<p>Aguardando as primeiras fotos.</p>`}</div>` : ''}
    </section>`
  }
  static styles = css`
    :host{display:block;color:#302b24;font:14px 'DM Sans',Arial,sans-serif;text-align:left}.workspace{max-width:1120px;margin:30px auto;padding:25px;border:1px solid #ded8cc;border-radius:14px;background:#fffdf8}.title,.item-head{display:flex;align-items:center;justify-content:space-between;gap:20px}h2{font-size:28px;font-weight:500;margin:12px 0}h3{font-size:18px;font-weight:600}.eyebrow{font-size:10px;letter-spacing:2px;color:#94713c}.summary{display:flex;gap:15px;flex-wrap:wrap;padding:20px;background:#eee7db;border-radius:8px;margin:20px 0}.plans{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:15px;margin:20px 0}.plan,.items article{border:1px solid #ded8cc;border-radius:9px;padding:22px}.current{border-color:#b99251;background:#faf4e9}.price{font-size:25px;font-weight:500}.price small{font-size:12px}.plan p{font-size:12px;line-height:1.8;min-height:66px}button,.checkout{font:inherit;border:1px solid #cfc2af;background:#fffaf1;color:#302b24;border-radius:6px;padding:10px 13px;cursor:pointer;text-decoration:none;display:inline-block}button:hover,.checkout:hover{background:#eee7db}button:disabled{opacity:.45;cursor:not-allowed}button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid #b99251;outline-offset:3px}form{display:flex;gap:12px;flex-wrap:wrap;align-items:end;margin:20px 0 30px}label{display:grid;gap:8px;font-size:12px}input{padding:12px;border:1px solid #d9d0c1;border-radius:6px;font:inherit;background:white}.items{display:grid;gap:16px;margin-top:25px}.items p{line-height:1.8;color:#796f66;font-size:12px}.actions{display:flex;gap:9px;align-items:center;flex-wrap:wrap}.tag{font-size:11px;background:#eee7db;border-radius:20px;padding:8px 12px}.file input{max-width:230px;font-size:10px;padding:8px}.notice,.alert{padding:15px;line-height:1.7;border-radius:6px}.notice{background:#eee7db;color:#796238}.alert{background:#f6e8df;color:#944836}.screen{position:fixed;inset:0;z-index:100;background:#2f241e;color:white;display:flex;flex-direction:column;align-items:center;padding:25px}.screen header{display:flex;width:100%;gap:25px;align-items:center;justify-content:space-between}.screen header img{max-width:150px;max-height:70px;object-fit:contain;background:#fffaf1;padding:10px;border-radius:5px}.slide{width:100%;height:calc(100vh - 140px);object-fit:contain;margin-top:20px}@media(max-width:680px){.workspace{padding:18px;margin:20px 0}.title,.item-head{align-items:start;flex-direction:column}.plans{grid-template-columns:1fr}form{flex-direction:column;align-items:stretch}input{min-width:0;width:100%;box-sizing:border-box}.screen{padding:12px}.screen header{gap:10px}.screen h2{font-size:17px}.screen header img{max-width:75px}}
  `
}

