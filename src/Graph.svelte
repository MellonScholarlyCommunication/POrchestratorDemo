<script>
    import Modal from './Modal.svelte';
    import { onMount } from 'svelte';
    import { listAllKnownArtefacts, listAllKnownEvents } from './artefact.js';
    import { isMaybeArray } from './util.js';

    import cytoscape from 'cytoscape';

    // Autorefresh after X seconds
    export let refreshInterval = 30;

    let showModal = false;

    const cyStyle = [ 
                {
                    selector: 'node',
                    style: {
                        'background-color': '#666',
                        'label': 'data(label)'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 3,
                        'line-color': '#ccc',
                        'target-arrow-color': '#ccc',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier'
                    }
                }
    ];

    const cyLayout = {
        name: 'circle',
        rows: 1
    };

    let cy;

    async function updateGraph() {

        const eventList    = await listAllKnownEvents();
        const artefactList = await listAllKnownArtefacts(eventList);

        const edgeList = 
                eventList
                    .filter( event => 
                            event.context &&
                            isMaybeArray(event.type,
                                e => e === 'Announce')
                    )
                    .map( event => {
                        const source = event.object.id;
                        const target = event.context;
                        
                        return { data: {
                            id: `E-${source}`,
                            source: source,
                            target: target
                        } }
                    });

        const nodeList = artefactList.map( art => {
            const label = art.replaceAll(/.*\//g,'');
            return { data: {id: art , label: label }};
        });

        return cy = cytoscape({
                container: document.getElementById('cy') ,
                elements: nodeList.concat(edgeList),
                style: cyStyle ,
                layout: cyLayout
            });

    }

    onMount( 
        () => {
            if (refreshInterval > 0) {
                const interval = setInterval( 
                    () => { cy = updateGraph(); } ,  refreshInterval * 1000
                );

                return () => { clearInterval(interval) }
            }     
            cy = updateGraph();
        }
    );
</script>

<button on:click="{() => {showModal = true; cy = updateGraph() } }">
	Show network
</button>

{#if showModal}
	<Modal on:close="{() => showModal = false}">
    <div id="cy"></div>
    </Modal>
{:else}
    <div id="cy" style="display: none"></div>
{/if}

<style>
    #cy {
        height: 300px;
    }
</style>