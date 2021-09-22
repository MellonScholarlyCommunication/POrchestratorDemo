const myEngine = Comunica.newEngine();

export async function getNotification(url) {
    // For now assume the notification is plain JSON
    const response = await fetch(url);
    const data = await response.json();
    return data;
}

export async function listInbox(inboxUrl) {
    const notifications = await queryBinding(inboxUrl,`
        PREFIX ldp: <http://www.w3.org/ns/ldp#>
        PREFIX dcterms: <http://purl.org/dc/terms/>
        SELECT ?notification ?modified WHERE {
           ?ldp  ldp:contains ?notification .
           ?notification a ldp:Resource .
           ?notification dcterms:modified ?modified .
        }
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

// Execute the SPARQL query against the source
async function queryBinding(source, query) {
    const result = await myEngine.query(
                            query, { 
                            sources: [source]
                   });

    const bd = result.bindings();
    return bd;
}