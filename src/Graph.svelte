<script>
    import { onDestroy, onMount } from 'svelte';
    import cytoscape from 'cytoscape';

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

    function updateGraph() {
        cy = cytoscape({
                container: document.getElementById('cy') ,
                elements: [
                { // node a
                    data: { id: 'a' , label: 'brol' }
                },
                { // node b
                    data: { id: 'b' , label : 'dol' }
                },
                // { // edge ab
                //     data: { id: 'ab', source: 'a', target: 'b' }
                // }
                ],
                style: cyStyle ,
                layout: cyLayout
            });

    }

    onMount( 
        () => {
            updateGraph();
        }
    );
</script>

<div id="cy"></div>

<style>
    #cy {
        height: 300px;
    }
</style>