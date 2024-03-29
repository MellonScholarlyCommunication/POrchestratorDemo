<script>
    import { v4 as uuidv4 } from 'uuid';
    import Origin from './notification/Origin.svelte';
    import Target from './notification/Target.svelte';
    import Actor from './notification/Actor.svelte';
    import Context from './notification/Context.svelte';
    import Object from './notification/Object.svelte';
    import Type from './notification/Type.svelte';
    import SubType from './notification/SubType.svelte';

    export let fromName;
    export let toName;

    let as2Type;
    let as2SubType;
    let origin;
    let actor;
    let target;
    let object;
    let context;
    let inReplyTo;

    let promise;

    function handleClick() {
        promise = sendToTarget();
    }

    async function sendToTarget() {
        let uuid    = uuidv4();

        if (!origin) {
            throw new Error("need an origin");
        }
        if (!target) {
            throw new Error("need a target");
        }
        if (!object) {
            throw new Error("need an object");
        }
        if (!actor) {
            throw new Error("need an actor");
        }

        let notification = {
            '@context': [
                "https://www.w3.org/ns/activitystreams",
                "http://purl.org/coar/notify" ,
                { "ex" : "https://www.example.org/" }
            ],
            id: `urn:uuid:${uuid}`,
            type:   as2Type ,
            actor:  actor,
            origin: origin ,
            target: target ,
            object: object
        };

        if (as2SubType && as2SubType.length) {
            notification.type = [ as2Type , `ex:${as2SubType}` ];
        }

        if (inReplyTo) {
            notification.inReplyTo = inReplyTo;
        }

        if (context) {
            notification.context = context;
        }

        // Send the notification to the inbox of the sender ...
        // The orchestrator will forward it to the target
        let response = await fetch(notification.origin.inbox, {
            method: 'POST',
            headers: {
                'Content-Type':'application/ld+json'
            },
            body: JSON.stringify(notification)
        });

        return response.status;
    }

</script>

<div class="main">
<h2>Send Notification</h2>

{#await promise}
<p>...sending notification</p>
{:then status} 
 {#if status}
    {#if status == 200 || status == 201 || status == 202 }
        <p style="color: green">Sent with status {status}</p>
    {:else}
        <p style="color: red">Whoops got a {status}</p>
    {/if}
 {/if}
{:catch error}
    <p style="color: red">{error.message}</p>
{/await}

<div class="row">
<table>
    <tr>
        <td>
            <Actor bind:actor name={fromName} />
        </td>
        <td>
            <Target bind:target name={toName} />
        </td>
        <td>
        </td>
    </tr>
    <tr>
        <td>
            <Origin bind:origin name={fromName} />
        </td>
    </tr>
</table>
</div>

<div class="row">
    <div class="column">

<table>
    <tr>
        <td>
            <Type bind:as2Type/>
        </td>
        <td>
            <SubType bind:as2SubType/>
        </td>
    </tr>
    <tr>
        <td colspan="2">
            <Context bind:object bind:context bind:inReplyTo name={fromName} />
        </td>
    </tr>
    <tr>
        <td colspan="2">
            <Object bind:object name={fromName} />
        </td>
    </tr>
</table>

    </div>
</div>

<div class="row">
    <button on:click="{handleClick}">Send</button>
</div>
</div>

<style>
    * {
        box-sizing: border-box;
        width: 100%;
    }

    .column {
        float: left;
        width: 50%;
        padding: 5px;
    }

    .row::after {
        content: "";
        clear: both;
        display: table;
    }
</style>