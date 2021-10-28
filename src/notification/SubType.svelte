<script>
    export let as2SubType;

    let as2SubTypes = [
        'ArchivationAction' ,
        'AwarenessAction'   ,
        'CertificationAction' ,
        'EndorsementAction',
        'RegistrationAction' 
    ];
</script>

<b>SubType</b><br>
<select bind:value={as2SubType}>
        <option></option>
    {#each as2SubTypes as t}
        <option value={t}>{t}</option>
    {/each}
</select>