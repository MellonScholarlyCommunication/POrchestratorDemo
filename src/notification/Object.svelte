<script>
import { onDestroy } from 'svelte';
 
    import { listKnownArtefacts } from '../artefact.js';
    import { cardList } from '../registry.js';

    export let name;
    export let object;

    let promise;
    let selected;

    const cardListUnsubscribe = cardList.subscribe( li => {
        let actor = li.find( e => e.name == name);
        if (actor) {
           promise = listKnownArtefacts(actor);
        }
    });

    function updateObject() {
        object = JSON.stringify({
            id: selected ,
            type: "Document"          
        });
    }

    onDestroy( () => {
        cardListUnsubscribe();
    });
</script>

<b>Object</b><br>

<select bind:value={selected} on:change={updateObject}>
    <option>Choose an artefact</option>

    {#await promise}
    {:then artefactList}
        {#each artefactList as artefact}
            <option value={artefact}>{artefact}</option>
        {/each}
    {/await}
</select>