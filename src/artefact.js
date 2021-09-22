import { getCard } from './card.js';
import { sparqlQuery, maybeValue } from "./comunica.js";

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
            artefacts.map( item => { return {
                id: item.get('?artefact').value ,
                modified: item.get('?modified').value
            }});
        resolve(artefactList);
    });
}