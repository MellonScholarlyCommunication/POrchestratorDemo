import { readable } from 'svelte/store';

const mySource = 'http://localhost:2000';
const myEngine = Comunica.newEngine();

// Return the value for the binding if it exists otherwise an undefined
function maybeValue(binding, key) {
    if (binding.has(key)) {
        return binding.get(key).value;
    } 
    else {
        return undefined;
    }
}

// Find all card.ttl information from a registry of inboxes
async function cardReader(source) {
    const boxes = await listInboxes(source);

    const cards = boxes.map( item => readCard(item) );

    return Promise.all(cards);
}

// Read a card.ttl and return the information as a (JSON) map
async function readCard(url) {
    const wellKnownCard = `${url}/card.ttl`;

    const binding = await queryBinding(wellKnownCard, `
        PREFIX as: <http://www.w3.org/ns/activitystreams#> 
        PREFIX ex: <https://www.example.org/>
        SELECT ?id ?type ?name ?inbox ?outbox ?orchestrator
        WHERE {
            { ?id a ?type .
              ?id as:name ?name .
              ?id as:inbox ?inbox .
            } OPTIONAL 
            {
              ?id ex:orchestrator ?orchestrator .
			  ?id as:outbox ?outbox .
            }
        }
    `);

    if (binding.length != 1) {
        return undefined;
    }

    const result = {
        id:     maybeValue(binding[0],'?id'),
        type:   maybeValue(binding[0],'?type'),
        name:   maybeValue(binding[0],'?name'),
        inbox:  maybeValue(binding[0],'?inbox'),
		outbox: maybeValue(binding[0],'?outbox'),
        orchestrator: maybeValue(binding[0],'?orchestrator')
    }

    return result;
}

// Starting from a base directory find all inboxes at a source
async function listInboxes(source) {
    const boxes = await queryBinding(source,`
        SELECT ?box WHERE {
            ?ldp <http://www.w3.org/ns/ldp#contains> ?box
        }
    `);

    return new Promise( (resolve) => {
        let ids = boxes.map( item => item.get('?box').value );
        resolve(ids);
    });
}

// Execute the SPARQL query against the source
async function queryBinding(source, query) {
    const result = await myEngine.query(
                            query, { 
                            sources: [source]
                   });

    const bd = result.bindings();
    return bd;
}

async function fetchJson() {
	const response  = await fetch('registry.json');
	const data      = await response.json();
	return data;
}

export const cardList = readable([], function start(set) {
	fetchJson().then( data => {
		cardReader(data.baseUrl).then( cards => {
			// The cardList is a sorted list of card.ttl found at the source
			set(cards.sort( (a,b) => a.name.localeCompare(b.name)));
		});
	});

	return function stop() {
		// Function that should be run when the last subscriber 
		// Stops reading
	};
});