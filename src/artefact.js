import { getCard } from './card.js';
import { getRegistry, cardReader } from './registry.js';
import { listOutbox, getEvent } from './outbox.js';
import { sparqlQuery, maybeValue } from "./comunica.js";
import { isMaybeArray } from './util.js';

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

    const eventList = await listEvents(card);

    const objectList = eventList.map( event => event.object.id );

    const uniqIds = [...new Set(artefactList.concat(objectList))];

    return uniqIds;
}

// Return all known events from the ex:outbox
export async function listEvents(card) {
    if (! card.outbox ) {
        return [];
    }

    const outboxList = await listOutbox(card.outbox);

    if (! outboxList ) {
        return [];
    }

    const eventList = await Promise.all(
        outboxList.map( async item => await getEvent(item.id) )
    );

    return eventList;
}

// Return all known artefacts from all event logs in the registry
export async function listAllKnownArtefacts(eventList) {
    if (eventList === undefined) { 
        eventList = await listAllKnownEvents();
    }

    // Artefacts are typically in Offer or Announce notifications...
    const eventTypeFilter = /Offer|Announce/;
    const nodeList = eventList
                      .filter( event => 
                            event.object && 
                            isMaybeArray(event.type,
                                e => e.match(eventTypeFilter)
                            )
                      )
                      .map( event => event.object.id );

    const uniqNodeList = [...new Set(nodeList)];

    return uniqNodeList;
}

export async function listAllKnownEvents() {
    const config   = await getRegistry();
    const cardList = await cardReader(config.registry);

    // Find all eventLogs (outboxes)...
    const outboxList = await Promise.all( 
        cardList.filter( card =>  card.outbox )
                .map( async card => {
                    return await listOutbox(card.outbox);  
                })
    );

    // Find all events in all eventLogs...
    const eventList = await Promise.all(
        outboxList.flat().map( async item => {
            return await getEvent(item.id)  
        })
    );

    return eventList;
}