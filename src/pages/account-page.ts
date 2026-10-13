import { LitElement, html } from 'lit'
import { customElement } from 'lit/decorators.js'
import { authStore } from '../auth/auth-store'
import { navigate } from '../lib/navigate'
import '../components/business-panel'
@customElement('account-page')
export class AccountPage extends LitElement {
  protected createRenderRoot() { return this }
  connectedCallback() { super.connectedCallback(); document.title = 'Sua conta — Momentte' }
  private logout() { void authStore.logout(); navigate('/login', true) }
  render() {
    const user = authStore.session?.user
    return html`<main class="account-page"><div class="account-header"><a href="/" class="brand" aria-label="Momentte, início"><img src="/brand/icon.svg" alt=""><img src="/brand/wordmark.svg" alt="Momentte"></a><button class="text-button" @click=${this.logout}>Sair ↗</button></div><h1>Bem-vindo${user?.name ? html`, ${user.name.split(' ')[0]}` : ''}.</h1><p>Organize seus eventos e acompanhe seu plano.</p><business-panel product="momentte"></business-panel></main>`
  }
}
