<script>
    import { onDestroy, onMount } from 'svelte';
    import { cardList } from '../registry.js';

    export let name;
    export let origin;

    const cardListUnsubscribe = cardList.subscribe( card => {
        // Find the orchestrator for a name
        const nameCard = card.find( entry => entry.name == name);

        if (! nameCard) {
            return;
        }

        const orchestrator = nameCard.orchestrator;

        // Find the orchestrator inbox
        const orchestratorCard = card.filter( entry => entry.id == orchestrator);
            
        if (orchestratorCard == 0) {
           return;
        }

        origin = entryMap(orchestratorCard[0]);
    });

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

<b>Origin</b><br>

{name.toUpperCase()}'S ORCHESTRATOR
