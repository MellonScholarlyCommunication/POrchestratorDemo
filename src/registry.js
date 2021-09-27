import { readable } from 'svelte/store';
import { getCard } from './card.js';
import { sparqlQuery ,maybeValue } from './comunica.js';

// Find all card.ttl information from a registry of inboxes
export async function cardReader(registryUrl) {
    const cardList = await listCards(registryUrl);

    const cards = cardList.map( item => getCard(item) );

    return Promise.all(cards);
}

// Starting from a base directory find all inboxes at a source
async function listCards(registryUrl) {
    const cards = await sparqlQuery(registryUrl,`
        SELECT ?card WHERE {
            <${registryUrl}> <http://xmlns.com/foaf/0.1/knows> ?card
        }
    `);

    return new Promise( (resolve) => {
        let ids = cards.map( item => maybeValue(item,'?card') );
        resolve(ids);
    });
}

export async function getRegistry() {
	const response  = await fetch('registry.json');
	const data      = await response.json();
	return data;
}

export const cardList = readable([], function start(set) {
	getRegistry().then( data => {
		cardReader(data.registry).then( cards => {
			// The cardList is a sorted list of card.ttl found at the source
			set(cards.sort( (a,b) => a.name.localeCompare(b.name)));
		});
	});

	return function stop() {
		// Function that should be run when the last subscriber 
		// Stops reading
	};
});