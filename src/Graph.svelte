<script>
    import Modal from './Modal.svelte';
    import { onMount } from 'svelte';
    import { listAllKnownArtefacts } from './artefact.js';
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
        const artefactList = await listAllKnownArtefacts();

        const nodeList = artefactList.map( art => {
            // Node:
            //     data: { id: 'b' , label : 'dol' }
            // Edge:
            //     data: { id: 'ab', source: 'a', target: 'b' }
            return { data: {id: art , label: art }};
        });

        return cy = cytoscape({
                container: document.getElementById('cy') ,
                elements: nodeList,
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