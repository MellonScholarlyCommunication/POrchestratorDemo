import { sparqlQuery ,maybeValue } from './comunica.js';

// Read a card.ttl and return the information as a (JSON) map
export async function getCard(webid) {
    const binding = await sparqlQuery(webid, `
        PREFIX as: <http://www.w3.org/ns/activitystreams#> 
        PREFIX ex: <https://www.example.org/>
        SELECT ?id ?type ?name ?inbox ?outbox ?orchestrator ?artefacts
        WHERE {
            { ?id a ?type .
              ?id as:name ?name .
              ?id as:inbox ?inbox .
            } 
            OPTIONAL { ?id ex:artefacts ?artefacts . } .
            OPTIONAL { ?id ex:orchestrator ?orchestrator . } .
			OPTIONAL { ?id as:outbox ?outbox . } .
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
        artefacts: maybeValue(binding[0],'?artefacts'),
        orchestrator: maybeValue(binding[0],'?orchestrator')
    }

    return result;
}