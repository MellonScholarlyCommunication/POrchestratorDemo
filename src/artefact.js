import { getCard } from './card.js';
import { cardList } from './registry.js';
import { listOutbox, getEvent } from './outbox.js';
import { sparqlQuery, maybeValue } from "./comunica.js";

// Return all artefact IRI-s from the ex:artefact location in the card
export async function listArtefacts(card) {
    const artefacts = await sparqlQuery(card.artefacts,`
          PREFIX ldp: <http://www.w3.org/ns/ldp#>
          PREFIX dcterms: <http://purl.org/dc/terms/>
          SELECT ?artefact ?modified WHERE {
             ?ldp  ldp:contains ?artefact .
             ?artefact a ldp:Resource .
             ?artefact dcterms:modified ?modified .
          }
    `);

    return new Promise( (resolve) => {
        let artefactList = 
            artefacts.map( item => item.get('?artefact').value );
        resolve(artefactList);
    });
}

// Return all known artefacts found in ex:artefact and ex:outbox
export async function listKnownArtefacts(card) {
    const artefactList = await listArtefacts(card);

    const outboxList = await listOutbox(card.outbox);

    outboxList ||= [];

    const eventList = await Promise.all(
        outboxList.map( async item => await getEvent(item.id) )
    );

    eventList ||= [];

    const objectList = eventList.map( event => event.object.id );

    const uniqIds = [...new Set(artefactList.concat(objectList))];

    return uniqIds;
}

// Return all known artefacts from all event logs in the registry
export async function listAllKnownArtefacts(cardList) {
    // TODO
}