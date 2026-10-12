import { LitElement, html } from 'lit'
import { customElement } from 'lit/decorators.js'
import '../components/auth-layout'
@customElement('register-page')
export class RegisterPage extends LitElement {
  protected createRenderRoot() { return this }
  connectedCallback() { super.connectedCallback(); document.title = 'Criar conta — Momentte' }
  render() { return html`<auth-layout mode="register"></auth-layout>` }
}
