const myEngine = Comunica.newEngine();

// Return the value for the binding if it exists otherwise an undefined
export function maybeValue(binding, key) {
    if (binding.has(key)) {
        return binding.get(key).value;
    } 
    else {
        return undefined;
    }
}

// Execute the SPARQL query against the source
export async function sparqlQuery(source, query) {
    const result = await myEngine.query(
                            query, { 
                            sources: [source]
                   });

    const bd = result.bindings();
    return bd;
}

