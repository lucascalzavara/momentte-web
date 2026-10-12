import { LitElement, html } from 'lit'
import { customElement } from 'lit/decorators.js'
import { authStore } from '../auth/auth-store'
import { navigate } from '../lib/navigate'
@customElement('account-page')
export class AccountPage extends LitElement {
  protected createRenderRoot() { return this }
  connectedCallback() { super.connectedCallback(); document.title = 'Sua conta — Momentte' }
  private logout() { void authStore.logout(); navigate('/login', true) }
  render() {
    const user = authStore.session?.user
    return html`<main class="account-page"><div class="account-header"><a href="/" class="brand" aria-label="Momentte, início"><img src="/brand/icon.svg" alt=""><img src="/brand/wordmark.svg" alt="Momentte"></a><button class="text-button" @click=${this.logout}>Sair ↗</button></div><section class="account-card"><span class="account-check" aria-hidden="true">✓</span><span class="eyebrow">SUA HISTÓRIA COM A MOMENTTE</span><h1>Bem-vindo${user?.name ? html`, ${user.name.split(' ')[0]}` : ''}.</h1><p>Você está conectado à sua conta.</p><div class="account-profile"><span>Seu nome</span><strong>${user?.name}</strong><span>E-mail</span><strong>${user?.email}</strong></div><p>A criação e a gestão de eventos chegam na próxima etapa. Enquanto isso, conheça a experiência na nossa demonstração.</p><a class="button" href="/#demonstracao">Explorar a Momentte ↗</a></section></main>`
  }
}
