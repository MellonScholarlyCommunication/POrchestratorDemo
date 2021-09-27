<script>
    import { onDestroy, onMount } from 'svelte';
    import { cardList } from './registry.js';
    import { resetCount } from './stores.js'; 
    import { listInbox , getNotification } from './inbox.js';
    import { listMaybeArray } from './util.js';
    import MD5 from "crypto-js/md5";

    // Title of the box
    export let title = 'Inbox';

    // Location of the inbox
    export let containerUrl; 

    // Autorefresh after X seconds
    export let refreshInterval = 30;
    // Maximum number of rows in the output
    export let maxRows = 5; 

    $: promise = listInbox(containerUrl);

    let cards;
    
    const cardUnsubscribe = cardList.subscribe( li => {
        cards= li;
    });

    const resetUnsubscribe = resetCount.subscribe( _ => {
        doRefresh();
	});

    function doRefresh() {
        promise = listInbox(containerUrl);
    }

    function shortId(url) {
        return url.replaceAll(/.*\//g,"");
    } 

    function shortDate(date) {
        return date.replaceAll(/\..+/g,"");
    }

    function upperCase(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    function md5Color(string) {
        let md5String = MD5(string).toString();
        return `#${md5String.substring(0, 6)}`;
    }

    function nameLookup(iri) {
        if (!iri) {
            return "someone";
        }

        const knownCard = cards.find( item => iri == item.id );

        if (knownCard) {
            return knownCard.name
        }
        else {
            return "someone";
        }
    }

    async function shortAbout(obj) {
        const notification = await getNotification(obj['id']);    

        const id   = notification['id'];

        let actor;

        if (notification['actor']) {
            actor = notification['actor']['id']; 
        }

        let target;

        if (notification['target']) {
            target = notification['target']['id'];
        }

        let object;

        if (notification['object']) {
            object = notification['object']['type'] || "something";
        }
        else {
            object = "something";
        }

        let type;

        if (notification['type']) {
            type = notification['type'] || "";
        }
        else {
            type = "whatever";
        }

        object = [].concat(listMaybeArray(object,upperCase));
        type = [].concat(listMaybeArray(type,upperCase));

        const actorName = nameLookup(actor);
        const targetName = nameLookup(target);

        const objectName = object.join("+");        
        const typeName = type.join("+");
        
        return {
            "id"     : id,
            "color"  : md5Color(id),
            "object" : objectName ,
            "type"   : typeName ,
            "actor"  : actorName ,
            "target" : targetName
        }
    }

    onMount( 
        () => {
            // Set a refresh interval when asked for
            if (refreshInterval > 0) {
                const interval = setInterval( 
                    () => { doRefresh(); } ,  refreshInterval * 1000
                );

                return () => { clearInterval(interval) }
            }     
    });

    onDestroy(() => {
        cardUnsubscribe();
        resetUnsubscribe();
    });
</script>

<h3>{title}</h3>

<div>[<i>{containerUrl}</i>]</div>

{#await promise}
  <p>...loading inbox</p>
{:then data}
    <table>
    {#each data as notification , i }
      {#if i < maxRows}
        <tr>
            <td>{shortDate(notification.modified)}</td>
            {#await shortAbout(notification)}
              ...loading notification
            {:then about}
                <td>
                <div class="idbox" 
                     title="{about.id}"
                     style="background-color: {about.color}"></div>
                     {about.color}
                    <a href="{notification.id}" title="{about.id}">
                
                <span class="actor">{upperCase(about.actor)}</span>

                <i>sends</i>

                (
                    <span class="type">{about.type}</span>

                    <i>a</i>
                
                    <span class="object">{about.object}</span>
                )

                <i>to</i>

                <span class="target">{upperCase(about.target)}</span>
                    </a>
                </td>
            {/await}
        </tr>
      {/if}
    {/each}
    </table>
{:catch error}
    <p style="color: red">{error.message}</p>
{/await}

<style>
    tr {
        background-color: white;
        width: 100%;
        border: 2px, black;
    }

    .type {
        font-weight: bold;
    }

    .object {
        font-weight: bold;
    }

    .actor {
        font-weight: bold;
    }

    .target {
        font-weight: bold;
    }

    .idbox {
        float: left;
        height: 10px;
        width: 10px;
        margin-top: 2px;
        margin-right: 5px;
        border: 1px solid black;
        clear: both;
    }
</style>