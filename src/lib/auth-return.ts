export function authReturn(search=location.search){const next=new URLSearchParams(search).get('next');return next&&/^(?:\/e\/[a-f0-9]{32}|\/(?:moderacao|telao)\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/.test(next)?next:'/conta'}
export function invitationQuery(search=location.search){const next=authReturn(search);return next==='/conta'?'':'?next='+encodeURIComponent(next)}
