import { collections } from './domain'
import { store } from './store'

console.log(`Seeded ${store.getHabits().length} habits for ${store.getUser().name}.`)
console.log(`Persistence collections ready: ${collections.join(', ')}`)
