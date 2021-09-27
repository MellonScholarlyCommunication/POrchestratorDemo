<script>
    import { onDestroy } from 'svelte';
    import { listArtefacts , listEvents } from '../artefact.js';
    import { cardList } from '../registry.js';
    import { hasAny } from '../util.js'; 

    export let name;
    export let object;

    let artefactList;
    let eventList;
    let selected;

    const cardListUnsubscribe = cardList.subscribe( async li => {
        let actor = li.find( e => e.name == name);
        if (actor) {
           artefactList = await listArtefacts(actor);
           artefactList = artefactList.map( art => {
                return { id: art , type: 'Document' }
           });
           eventList    = await listEvents(actor);
           eventList = eventList.filter( event => {
                return hasAny(event.type, e => e === 'Offer') &&
                       event.actor.id != actor.id;
           });
        }
    });

    function updateObject() {
        if (isMaybeArray(selected.type, e => e === 'Document')) {
            object = {
                id: selected.id ,
                type: selected.type         
            };
        } 
        else {
            object = {
                id: selected.id ,
                type: selected.type,     
                object: selected.object
            };
        }
    }

    onDestroy( () => {
        cardListUnsubscribe();
    });
</script>

<b>Object</b><br>

<select bind:value={selected} on:change={updateObject}>
    <option>Choose an object</option>

    {#if artefactList}
        <option>-Artefact-</option>
        {#each artefactList as artefact}
            <option value={artefact}>{artefact.id}</option>
        {/each}
    {/if}

    {#if eventList && eventList.length }
        <option>-Offer-</option>
        {#each eventList as event}
            <option value={event}>Offer {event.object.id}</option>
        {/each}
    {/if}
</select>