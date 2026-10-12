import { LitElement, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { authStore } from './auth/auth-store'
import { navigate } from './lib/navigate'
import './components/site-header'
import './components/site-footer'
import './pages/home-page'
import './pages/login-page'
import './pages/register-page'
import './pages/account-page'
@customElement('app-root')
export class AppRoot extends LitElement {
 @state() private path = window.location.pathname
 private onPopState = () => { this.path = window.location.pathname; this.guard(); window.scrollTo(0, 0) }
 private onSession = () => { this.guard(); this.requestUpdate() }
 private onAction = (event: Event) => {
   const action = (event as CustomEvent<string>).detail
   if (action === 'login' || action === 'create') navigate(authStore.session ? '/conta' : action === 'login' ? '/login' : '/cadastro')
 }
 private onClick = (event: MouseEvent) => {
   if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
   const anchor = event.composedPath().find(item => item instanceof HTMLAnchorElement) as HTMLAnchorElement | undefined
   if (!anchor || anchor.target || anchor.hasAttribute('download')) return
   const url = new URL(anchor.href)
   if (url.origin !== location.origin || url.hash) return
   event.preventDefault()
   navigate(url.pathname + url.search)
 }
 private guard() {
   if (this.path === '/conta' && !authStore.session) navigate('/login?expired=1', true)
   else if ((this.path === '/login' || this.path === '/cadastro') && authStore.session) navigate('/conta', true)
 }
 connectedCallback() {
   super.connectedCallback()
   window.addEventListener('popstate', this.onPopState)
   window.addEventListener('momentte-action', this.onAction)
   authStore.addEventListener('change', this.onSession)
   this.addEventListener('click', this.onClick)
   this.guard()
 }
 disconnectedCallback() {
   window.removeEventListener('popstate', this.onPopState)
   window.removeEventListener('momentte-action', this.onAction)
   authStore.removeEventListener('change', this.onSession)
   this.removeEventListener('click', this.onClick)
   super.disconnectedCallback()
 }
 protected createRenderRoot() { return this }
 protected updated() {
   if (this.path === '/' && location.hash) {
     document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
   }
 }
 render() {
   if (this.path === '/login') return html`<login-page></login-page>`
   if (this.path === '/cadastro') return html`<register-page></register-page>`
   if (this.path === '/conta') return html`<account-page></account-page>`
   if (this.path !== '/') return html`<main class="not-found"><h1>Esse caminho ainda não existe.</h1><a class="button" href="/">Voltar ao início</a></main>`
   return html`<site-header></site-header><home-page></home-page><site-footer></site-footer>`
 }
}
