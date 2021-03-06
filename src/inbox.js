import { sparqlQuery } from './comunica.js';

export async function getNotification(notificationUrl) {
    // For now assume the notification is plain JSON
    const response = await fetch(notificationUrl);
    const data = await response.json();
    return data;
}

export async function listInbox(inboxUrl) {
    const notifications = await sparqlQuery(inboxUrl,`
        PREFIX ldp: <http://www.w3.org/ns/ldp#>
        PREFIX dcterms: <http://purl.org/dc/terms/>
        SELECT ?notification ?modified WHERE {
           ?ldp  ldp:contains ?notification .
           ?notification a ldp:Resource .
           ?notification dcterms:modified ?modified .
        } ORDER BY DESC(?modified)
    `);

    return new Promise( (resolve) => {
        let notificationList = 
            notifications.map( item => { return {
                id: item.get('?notification').value ,
                modified: item.get('?modified').value
            }});
        resolve(notificationList);
    });
}