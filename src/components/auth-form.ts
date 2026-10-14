import { LitElement, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { authApi } from '../api/auth-api'
import { ApiError } from '../api/http'
import { authStore } from '../auth/auth-store'
import { navigate } from '../lib/navigate'
import { authReturn, invitationQuery } from '../lib/auth-return'

@customElement('auth-form')
export class AuthForm extends LitElement {
  @property() mode: 'login' | 'register' = 'login'
  @state() private busy = false
  @state() private visible = false
  @state() private message = ''
  @state() private errors: Record<string, string> = {}
  private controller?: AbortController
  protected createRenderRoot() { return this }
  disconnectedCallback() { this.controller?.abort(); super.disconnectedCallback() }
  private clearError(event: Event) {
    const input = event.target as HTMLInputElement
    this.errors = { ...this.errors, [input.name]: '' }
    this.message = ''
  }
  private async submit(event: SubmitEvent) {
    event.preventDefault()
    if (this.busy) return
    const form = event.currentTarget as HTMLFormElement
    const data = new FormData(form)
    const name = String(data.get('name') ?? '').trim()
    const email = String(data.get('email') ?? '').trim()
    const password = String(data.get('password') ?? '')
    const confirmation = String(data.get('confirmation') ?? '')
    const errors: Record<string, string> = {}
    if (this.mode === 'register' && !name) errors.name = 'Informe seu nome.'
    else if (this.mode === 'register' && name.length > 150) errors.name = 'Use até 150 caracteres no nome.'
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Informe um e-mail válido.'
    else if (email.length > 254) errors.email = 'Use um e-mail com até 254 caracteres.'
    if (!password.trim()) errors.password = 'Informe sua senha.'
    else if (this.mode === 'register' && password.length < 8) errors.password = 'Use pelo menos 8 caracteres.'
    else if (new TextEncoder().encode(password).length > 72) errors.password = 'Sua senha ultrapassa o limite de 72 bytes. Use uma senha menor.'
    if (this.mode === 'register' && password !== confirmation) errors.confirmation = 'As senhas precisam ser iguais.'
    this.errors = errors
    this.message = ''
    if (Object.keys(errors).length) {
      await this.updateComplete
      this.querySelector<HTMLInputElement>(`[name="${Object.keys(errors)[0]}"]`)?.focus()
      return
    }
    this.busy = true
    this.controller = new AbortController()
    const timeout = window.setTimeout(() => this.controller?.abort('timeout'), 20000)
    try {
      const response = this.mode === 'register'
        ? await authApi.register({ name, email, password }, this.controller.signal)
        : await authApi.login({ email, password }, this.controller.signal)
      if (!this.isConnected) return
      const destination=authReturn()
      authStore.apply(response)
      navigate(destination, true)
    } catch (error) {
      if (!this.isConnected) return
      if (this.controller.signal.aborted) this.message = 'A conexão demorou mais que o esperado. Tente novamente.'
      else if (error instanceof ApiError) {
        this.message = error.message
        const labels: Record<string, string> = { name: 'Confira seu nome.', email: 'Confira o e-mail informado.', password: 'Confira os requisitos da senha.' }
        this.errors = Object.fromEntries(Object.keys(error.errors).map(key => {
          const field = key.toLowerCase().replace(/^\$\./, '')
          return [field, labels[field] ?? 'Confira este campo.']
        }))
      } else this.message = error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.'
      await this.updateComplete
      this.querySelector<HTMLElement>('.form-alert')?.focus()
    } finally { window.clearTimeout(timeout); this.busy = false }
  }
  private error(field: string) { return this.errors[field] ? html`<span class="field-error" id=${`${this.mode}-${field}-error`}>${this.errors[field]}</span>` : '' }
  render() {
    const register = this.mode === 'register'
    return html`<form class="auth-form" novalidate @submit=${this.submit} aria-busy=${this.busy}>
      ${this.message ? html`<div class="form-alert" role="alert" tabindex="-1">${this.message}</div>` : ''}
      ${register ? html`<div class="field"><label for="register-name">Seu nome</label><input id="register-name" name="name" autocomplete="name" placeholder="Como podemos chamar você?" maxlength="150" required ?readonly=${this.busy} aria-invalid=${Boolean(this.errors.name)} aria-describedby="register-name-error" @input=${this.clearError}>${this.error('name')}</div>` : ''}
      <div class="field"><label for=${`${this.mode}-email`}>E-mail</label><input id=${`${this.mode}-email`} name="email" type="email" autocomplete="email" inputmode="email" placeholder="voce@exemplo.com" maxlength="254" required ?readonly=${this.busy} aria-invalid=${Boolean(this.errors.email)} aria-describedby=${`${this.mode}-email-error`} @input=${this.clearError}>${this.error('email')}</div>
      <div class="field"><label for=${`${this.mode}-password`}>Senha</label><div class="password-input"><input id=${`${this.mode}-password`} name="password" type=${this.visible ? 'text' : 'password'} autocomplete=${register ? 'new-password' : 'current-password'} placeholder=${register ? 'Crie uma senha' : 'Sua senha'} required ?readonly=${this.busy} aria-invalid=${Boolean(this.errors.password)} aria-describedby=${`${this.mode}-password-hint ${this.mode}-password-error`} @input=${this.clearError}><button type="button" class="password-toggle" aria-label=${this.visible ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed=${this.visible} @click=${() => this.visible = !this.visible}>${this.visible ? 'Ocultar' : 'Mostrar'}</button></div>${register ? html`<span class="field-hint" id="register-password-hint">Pelo menos 8 caracteres. Até 72 bytes (acentos podem ocupar mais de um byte).</span>` : ''}${this.error('password')}</div>
      ${register ? html`<div class="field"><label for="register-confirmation">Confirme a senha</label><input id="register-confirmation" name="confirmation" type=${this.visible ? 'text' : 'password'} autocomplete="new-password" placeholder="Digite sua senha novamente" required ?readonly=${this.busy} aria-invalid=${Boolean(this.errors.confirmation)} aria-describedby="register-confirmation-error" @input=${this.clearError}>${this.error('confirmation')}</div>` : ''}
      <button type="submit" class="button auth-submit" ?disabled=${this.busy}>${this.busy ? html`<span class="spinner" aria-hidden="true"></span> ${register ? 'Criando sua conta…' : 'Entrando…'}` : html`${register ? 'Criar minha conta' : 'Entrar na minha conta'} <span>↗</span>`}</button>
      <p class="auth-switch">${register ? html`Já tem uma conta? <a href=${'/login'+invitationQuery()}>Entrar</a>` : html`Ainda não tem uma conta? <a href=${'/cadastro'+invitationQuery()}>Cadastre-se</a>`}</p>
    </form>`
  }
}
