const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim()

export function searchEvents<T extends {name: string}>(events: T[], query: string): T[] {
 const terms = normalize(query).split(/\s+/).filter(Boolean)
 return events.filter(event => terms.every(term => normalize(event.name).includes(term)))
}
