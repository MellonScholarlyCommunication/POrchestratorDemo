<script>
    export let context;
    export let inReplyTo;
    export let object;

    $: {
        if (object) {
            let jObject = JSON.parse(object);

            if (! jObject.type) {

            }
            else if (jObject.type == 'Document') {
                context = undefined;
                inReplyTo = undefined;
            }
            else if (jObject.type == 'Offer') {
                context = jObject.object.id;
                inReplyTo = jObject.id;
            }
        }
        else {
            context = undefined;
            inReplyTo = undefined;
        }
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
    <select>
        <option>Choose a notification</option>
    </select>
    </div>
{/if}