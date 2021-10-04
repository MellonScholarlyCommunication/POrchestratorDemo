<script>
    import { cardList } from './registry.js';

    export let pod;
</script>

<select bind:value="{pod}">
    <option>Choose a pod</option>
{#each $cardList as card}
   {#if card}
    <option value={card}>{card.name.toUpperCase()}</option>
   {/if}
{/each}
</select>