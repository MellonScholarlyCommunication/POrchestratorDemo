<script>
    import { listArtefacts , listEvents } from '../artefact.js';
    import { cardList } from '../registry.js';
    import { isMaybeArray } from '../util.js';

    export let name;
    export let context;
    export let inReplyTo;

    let eventList;
    let selected;

    const cardListUnsubscribe = cardList.subscribe( async li => {
        let actor = li.find( e => e.name == name);
        if (actor) {
            eventList = await listEvents(actor);
            eventList = eventList.filter( event => {
                return isMaybeArray(event.type,e => e === 'Offer') 
                        &&
                        event.actor.id != actor.id
            });
        }
    });

    function updateReplyContext() {
        inReplyTo = selected.id ;
        context   = selected.object.id;
    }

</script>

{#if context || inReplyTo}
    <div>
        <b>Context</b>
    </div>

    <div>
        { context }
    </div>

    <div>
        <b>InReplyTo</b>
    </div>

    <div>
        { inReplyTo }
    </div>
{:else}
    <div>
        <b>ReplyTo</b>
    </div>
    <div>
     <select bind:value={selected} on:change={updateReplyContext}>
         <option>Choose a reply</option>
     {#if eventList && eventList.length }
        {#each eventList as event}
            <option value={event}>Offer {event.object.id}</option>
        {/each}
     {/if}
     </select>
    </div>
{/if}