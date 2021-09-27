<script>
    import { onDestroy, onMount } from 'svelte';
    import { cardList } from '../registry.js';

    export let name;
    export let target;

    let selected;

    const cardListUnsubscribe = cardList.subscribe( card => {
        let found = card.find( e => e.name == name);
        if (found) {
            selected = found;
            target   = entryMap(found);
        }
    });

    function updateTarget() {
        target = entryMap(selected);
    }

    function entryMap(item) {
        return {
            id: item.id ,
            type: item.type ,
            inbox: item.inbox
        };
    }
   
    onDestroy( () => {
        cardListUnsubscribe();
    });
</script>

<b>Target</b><br>

<select bind:value={selected} on:change={updateTarget}>
        <option>Choose a target</option>
    {#each $cardList as card}
        <option value={card}>{card.name.toUpperCase()}</option>
    {/each}
</select>
