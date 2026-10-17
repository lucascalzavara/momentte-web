import {brandHref} from '../lib/brand-href'
import { LitElement, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import './auth-form'
@customElement('auth-layout')
export class AuthLayout extends LitElement {
  @property() mode: 'login' | 'register' = 'login'
  protected createRenderRoot() { return this }
  render() {
    const register = this.mode === 'register'
    return html`<main class="auth-layout"><aside class="auth-story"><a class="brand" href=${brandHref()} aria-label="Momentte, início"><img src="/brand/icon.svg" alt=""><img src="/brand/wordmark.svg" alt="Momentte"></a><div class="auth-story-copy"><span class="eyebrow">CADA OLHAR, UMA MEMÓRIA</span><h1>Os momentos<br>são seus.<br><em>As memórias,<br>de todos.</em></h1><p>Um lugar para reunir os olhares de quem faz parte da sua história.</p></div><div class="auth-story-photo"><img src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=85" alt="Casal celebrando seu casamento"><span>para viver agora. e lembrar sempre. ♡</span></div><span class="auth-story-spark" aria-hidden="true">✧</span></aside><section class="auth-panel"><a href="/" class="auth-back">← Voltar ao início</a><div class="auth-card"><span class="eyebrow">${register ? 'O PRIMEIRO PASSO DA SUA HISTÓRIA' : 'QUE BOM TER VOCÊ AQUI'}</span><h2>${register ? html`Boas memórias<br>começam aqui.` : html`Seu próximo<br><em>momento espera.</em>`}</h2><p class="auth-intro">${register ? 'Crie sua conta para começar sua jornada com a Momentte.' : 'Entre para continuar sua história com a Momentte.'}</p>${!register && new URLSearchParams(location.search).has('expired') ? html`<p class="session-notice" role="status">Entre na sua conta para continuar. Sua sessão pode ter expirado.</p>` : ''}<auth-form .mode=${this.mode}></auth-form></div><p class="auth-bottom">Feito para celebrar. E lembrar.</p></section></main>`
  }
}
