<script>
    import { onDestroy } from 'svelte';
    import { cardList } from '../registry.js';

    export let name;
    export let actor;

    const cardUnsubscribe = cardList.subscribe( li => {
        let found = li.find( e => e.name == name);

        if (found) {
            actor = entryMap(found);
        }
    })

    function entryMap(item) {
        return JSON.stringify({
            id: item.id ,
            type: item.type ,
            inbox: item.inbox
        });
    }

    onDestroy( () =>  {
        cardUnsubscribe();
    });

</script>

<b>Actor</b><br>

{name.toUpperCase()}