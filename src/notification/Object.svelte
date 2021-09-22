<script> 
    import { listArtefacts } from '../artefact.js';
    import { cardList } from '../registry.js';

    export let name;
    export let object;

    let promise;
    let selected;

    cardList.subscribe( li => {
        let actor = li.find( e => e.name == name);
        if (actor) {
           promise = listArtefacts(actor);
        }
    });

    function updateObject() {
        object = JSON.stringify({
            id: selected.id ,
            type: "Document"          
        });
    }

</script>

<b>Object</b><br>

<select bind:value={selected} on:change={updateObject}>
    <option>Choose an artefact</option>

    {#await promise}
    {:then artefactList}
        {#each artefactList as artefact}
            <option value={artefact}>{artefact.id}</option>
        {/each}
    {/await}
</select>