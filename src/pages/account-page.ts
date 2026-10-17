import {brandHref} from '../lib/brand-href'
import { LitElement, html } from 'lit'
import { customElement } from 'lit/decorators.js'
import { authStore } from '../auth/auth-store'
import { navigate } from '../lib/navigate'
import '../components/event-workspace'
@customElement('account-page')
export class AccountPage extends LitElement {
  protected createRenderRoot() { return this }
  connectedCallback() { super.connectedCallback(); document.title = 'Sua conta — Momentte' }
  private logout() { void authStore.logout(); navigate('/login', true) }
  render() {
    const user = authStore.session?.user
    return html`<main class="account-page"><div class="account-header"><a href=${brandHref()} class="brand" aria-label="Momentte, início"><img src="/brand/icon.svg" alt=""><img src="/brand/wordmark.svg" alt="Momentte"></a><button class="text-button" @click=${this.logout}>Sair ↗</button></div><h1>Bem-vindo${user?.name ? html`, ${user.name.split(' ')[0]}` : ''}.</h1><p>Organize suas histórias e participe dos momentos de quem importa.</p><event-workspace></event-workspace></main>`
  }
}
