
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        select.selectedIndex = -1; // no option should be selected
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                if (info.blocks[i] === block) {
                                    info.blocks[i] = null;
                                }
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
                if (!info.hasCatch) {
                    throw error;
                }
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }
    function update_await_block_branch(info, ctx, dirty) {
        const child_ctx = ctx.slice();
        const { resolved } = info;
        if (info.current === info.then) {
            child_ctx[info.value] = resolved;
        }
        if (info.current === info.catch) {
            child_ctx[info.error] = resolved;
        }
        info.block.p(child_ctx, dirty);
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.42.6' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const myEngine = Comunica.newEngine();

    // Return the value for the binding if it exists otherwise an undefined
    function maybeValue(binding, key) {
        if (binding.has(key)) {
            return binding.get(key).value;
        } 
        else {
            return undefined;
        }
    }

    // Find all card.ttl information from a registry of inboxes
    async function cardReader(source) {
        const boxes = await listInboxes(source);

        const cards = boxes.map( item => readCard(item) );

        return Promise.all(cards);
    }

    // Read a card.ttl and return the information as a (JSON) map
    async function readCard(url) {
        const wellKnownCard = `${url}/card.ttl`;

        const binding = await queryBinding(wellKnownCard, `
        PREFIX as: <http://www.w3.org/ns/activitystreams#> 
        PREFIX ex: <https://www.example.org/>
        SELECT ?id ?type ?name ?inbox ?outbox ?orchestrator
        WHERE {
            { ?id a ?type .
              ?id as:name ?name .
              ?id as:inbox ?inbox .
            } OPTIONAL 
            {
              ?id ex:orchestrator ?orchestrator .
			  ?id as:outbox ?outbox .
            }
        }
    `);

        if (binding.length != 1) {
            return undefined;
        }

        const result = {
            id:     maybeValue(binding[0],'?id'),
            type:   maybeValue(binding[0],'?type'),
            name:   maybeValue(binding[0],'?name'),
            inbox:  maybeValue(binding[0],'?inbox'),
    		outbox: maybeValue(binding[0],'?outbox'),
            orchestrator: maybeValue(binding[0],'?orchestrator')
        };

        return result;
    }

    // Starting from a base directory find all inboxes at a source
    async function listInboxes(source) {
        const boxes = await queryBinding(source,`
        SELECT ?box WHERE {
            ?ldp <http://www.w3.org/ns/ldp#contains> ?box
        }
    `);

        return new Promise( (resolve) => {
            let ids = boxes.map( item => item.get('?box').value );
            resolve(ids);
        });
    }

    // Execute the SPARQL query against the source
    async function queryBinding(source, query) {
        const result = await myEngine.query(
                                query, { 
                                sources: [source]
                       });

        const bd = result.bindings();
        return bd;
    }

    async function fetchJson() {
    	const response  = await fetch('registry.json');
    	const data      = await response.json();
    	return data;
    }

    const cardList = readable([], function start(set) {
    	fetchJson().then( data => {
    		cardReader(data.baseUrl).then( cards => {
    			// The cardList is a sorted list of card.ttl found at the source
    			set(cards.sort( (a,b) => a.name.localeCompare(b.name)));
    		});
    	});

    	return function stop() {
    		// Function that should be run when the last subscriber 
    		// Stops reading
    	};
    });

    const resetCount = writable(0);

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function getAugmentedNamespace(n) {
    	if (n.__esModule) return n;
    	var a = Object.defineProperty({}, '__esModule', {value: true});
    	Object.keys(n).forEach(function (k) {
    		var d = Object.getOwnPropertyDescriptor(n, k);
    		Object.defineProperty(a, k, d.get ? d : {
    			enumerable: true,
    			get: function () {
    				return n[k];
    			}
    		});
    	});
    	return a;
    }

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    function commonjsRequire (target) {
    	throw new Error('Could not dynamically require "' + target + '". Please configure the dynamicRequireTargets option of @rollup/plugin-commonjs appropriately for this require call to behave properly.');
    }

    var _nodeResolve_empty = {};

    var _nodeResolve_empty$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        'default': _nodeResolve_empty
    });

    var require$$0 = /*@__PURE__*/getAugmentedNamespace(_nodeResolve_empty$1);

    var core = createCommonjsModule(function (module, exports) {
    (function (root, factory) {
    	{
    		// CommonJS
    		module.exports = factory();
    	}
    }(commonjsGlobal, function () {

    	/*globals window, global, require*/

    	/**
    	 * CryptoJS core components.
    	 */
    	var CryptoJS = CryptoJS || (function (Math, undefined$1) {

    	    var crypto;

    	    // Native crypto from window (Browser)
    	    if (typeof window !== 'undefined' && window.crypto) {
    	        crypto = window.crypto;
    	    }

    	    // Native crypto in web worker (Browser)
    	    if (typeof self !== 'undefined' && self.crypto) {
    	        crypto = self.crypto;
    	    }

    	    // Native crypto from worker
    	    if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    	        crypto = globalThis.crypto;
    	    }

    	    // Native (experimental IE 11) crypto from window (Browser)
    	    if (!crypto && typeof window !== 'undefined' && window.msCrypto) {
    	        crypto = window.msCrypto;
    	    }

    	    // Native crypto from global (NodeJS)
    	    if (!crypto && typeof commonjsGlobal !== 'undefined' && commonjsGlobal.crypto) {
    	        crypto = commonjsGlobal.crypto;
    	    }

    	    // Native crypto import via require (NodeJS)
    	    if (!crypto && typeof commonjsRequire === 'function') {
    	        try {
    	            crypto = require$$0;
    	        } catch (err) {}
    	    }

    	    /*
    	     * Cryptographically secure pseudorandom number generator
    	     *
    	     * As Math.random() is cryptographically not safe to use
    	     */
    	    var cryptoSecureRandomInt = function () {
    	        if (crypto) {
    	            // Use getRandomValues method (Browser)
    	            if (typeof crypto.getRandomValues === 'function') {
    	                try {
    	                    return crypto.getRandomValues(new Uint32Array(1))[0];
    	                } catch (err) {}
    	            }

    	            // Use randomBytes method (NodeJS)
    	            if (typeof crypto.randomBytes === 'function') {
    	                try {
    	                    return crypto.randomBytes(4).readInt32LE();
    	                } catch (err) {}
    	            }
    	        }

    	        throw new Error('Native crypto module could not be used to get secure random number.');
    	    };

    	    /*
    	     * Local polyfill of Object.create

    	     */
    	    var create = Object.create || (function () {
    	        function F() {}

    	        return function (obj) {
    	            var subtype;

    	            F.prototype = obj;

    	            subtype = new F();

    	            F.prototype = null;

    	            return subtype;
    	        };
    	    }());

    	    /**
    	     * CryptoJS namespace.
    	     */
    	    var C = {};

    	    /**
    	     * Library namespace.
    	     */
    	    var C_lib = C.lib = {};

    	    /**
    	     * Base object for prototypal inheritance.
    	     */
    	    var Base = C_lib.Base = (function () {


    	        return {
    	            /**
    	             * Creates a new object that inherits from this object.
    	             *
    	             * @param {Object} overrides Properties to copy into the new object.
    	             *
    	             * @return {Object} The new object.
    	             *
    	             * @static
    	             *
    	             * @example
    	             *
    	             *     var MyType = CryptoJS.lib.Base.extend({
    	             *         field: 'value',
    	             *
    	             *         method: function () {
    	             *         }
    	             *     });
    	             */
    	            extend: function (overrides) {
    	                // Spawn
    	                var subtype = create(this);

    	                // Augment
    	                if (overrides) {
    	                    subtype.mixIn(overrides);
    	                }

    	                // Create default initializer
    	                if (!subtype.hasOwnProperty('init') || this.init === subtype.init) {
    	                    subtype.init = function () {
    	                        subtype.$super.init.apply(this, arguments);
    	                    };
    	                }

    	                // Initializer's prototype is the subtype object
    	                subtype.init.prototype = subtype;

    	                // Reference supertype
    	                subtype.$super = this;

    	                return subtype;
    	            },

    	            /**
    	             * Extends this object and runs the init method.
    	             * Arguments to create() will be passed to init().
    	             *
    	             * @return {Object} The new object.
    	             *
    	             * @static
    	             *
    	             * @example
    	             *
    	             *     var instance = MyType.create();
    	             */
    	            create: function () {
    	                var instance = this.extend();
    	                instance.init.apply(instance, arguments);

    	                return instance;
    	            },

    	            /**
    	             * Initializes a newly created object.
    	             * Override this method to add some logic when your objects are created.
    	             *
    	             * @example
    	             *
    	             *     var MyType = CryptoJS.lib.Base.extend({
    	             *         init: function () {
    	             *             // ...
    	             *         }
    	             *     });
    	             */
    	            init: function () {
    	            },

    	            /**
    	             * Copies properties into this object.
    	             *
    	             * @param {Object} properties The properties to mix in.
    	             *
    	             * @example
    	             *
    	             *     MyType.mixIn({
    	             *         field: 'value'
    	             *     });
    	             */
    	            mixIn: function (properties) {
    	                for (var propertyName in properties) {
    	                    if (properties.hasOwnProperty(propertyName)) {
    	                        this[propertyName] = properties[propertyName];
    	                    }
    	                }

    	                // IE won't copy toString using the loop above
    	                if (properties.hasOwnProperty('toString')) {
    	                    this.toString = properties.toString;
    	                }
    	            },

    	            /**
    	             * Creates a copy of this object.
    	             *
    	             * @return {Object} The clone.
    	             *
    	             * @example
    	             *
    	             *     var clone = instance.clone();
    	             */
    	            clone: function () {
    	                return this.init.prototype.extend(this);
    	            }
    	        };
    	    }());

    	    /**
    	     * An array of 32-bit words.
    	     *
    	     * @property {Array} words The array of 32-bit words.
    	     * @property {number} sigBytes The number of significant bytes in this word array.
    	     */
    	    var WordArray = C_lib.WordArray = Base.extend({
    	        /**
    	         * Initializes a newly created word array.
    	         *
    	         * @param {Array} words (Optional) An array of 32-bit words.
    	         * @param {number} sigBytes (Optional) The number of significant bytes in the words.
    	         *
    	         * @example
    	         *
    	         *     var wordArray = CryptoJS.lib.WordArray.create();
    	         *     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607]);
    	         *     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607], 6);
    	         */
    	        init: function (words, sigBytes) {
    	            words = this.words = words || [];

    	            if (sigBytes != undefined$1) {
    	                this.sigBytes = sigBytes;
    	            } else {
    	                this.sigBytes = words.length * 4;
    	            }
    	        },

    	        /**
    	         * Converts this word array to a string.
    	         *
    	         * @param {Encoder} encoder (Optional) The encoding strategy to use. Default: CryptoJS.enc.Hex
    	         *
    	         * @return {string} The stringified word array.
    	         *
    	         * @example
    	         *
    	         *     var string = wordArray + '';
    	         *     var string = wordArray.toString();
    	         *     var string = wordArray.toString(CryptoJS.enc.Utf8);
    	         */
    	        toString: function (encoder) {
    	            return (encoder || Hex).stringify(this);
    	        },

    	        /**
    	         * Concatenates a word array to this word array.
    	         *
    	         * @param {WordArray} wordArray The word array to append.
    	         *
    	         * @return {WordArray} This word array.
    	         *
    	         * @example
    	         *
    	         *     wordArray1.concat(wordArray2);
    	         */
    	        concat: function (wordArray) {
    	            // Shortcuts
    	            var thisWords = this.words;
    	            var thatWords = wordArray.words;
    	            var thisSigBytes = this.sigBytes;
    	            var thatSigBytes = wordArray.sigBytes;

    	            // Clamp excess bits
    	            this.clamp();

    	            // Concat
    	            if (thisSigBytes % 4) {
    	                // Copy one byte at a time
    	                for (var i = 0; i < thatSigBytes; i++) {
    	                    var thatByte = (thatWords[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    	                    thisWords[(thisSigBytes + i) >>> 2] |= thatByte << (24 - ((thisSigBytes + i) % 4) * 8);
    	                }
    	            } else {
    	                // Copy one word at a time
    	                for (var j = 0; j < thatSigBytes; j += 4) {
    	                    thisWords[(thisSigBytes + j) >>> 2] = thatWords[j >>> 2];
    	                }
    	            }
    	            this.sigBytes += thatSigBytes;

    	            // Chainable
    	            return this;
    	        },

    	        /**
    	         * Removes insignificant bits.
    	         *
    	         * @example
    	         *
    	         *     wordArray.clamp();
    	         */
    	        clamp: function () {
    	            // Shortcuts
    	            var words = this.words;
    	            var sigBytes = this.sigBytes;

    	            // Clamp
    	            words[sigBytes >>> 2] &= 0xffffffff << (32 - (sigBytes % 4) * 8);
    	            words.length = Math.ceil(sigBytes / 4);
    	        },

    	        /**
    	         * Creates a copy of this word array.
    	         *
    	         * @return {WordArray} The clone.
    	         *
    	         * @example
    	         *
    	         *     var clone = wordArray.clone();
    	         */
    	        clone: function () {
    	            var clone = Base.clone.call(this);
    	            clone.words = this.words.slice(0);

    	            return clone;
    	        },

    	        /**
    	         * Creates a word array filled with random bytes.
    	         *
    	         * @param {number} nBytes The number of random bytes to generate.
    	         *
    	         * @return {WordArray} The random word array.
    	         *
    	         * @static
    	         *
    	         * @example
    	         *
    	         *     var wordArray = CryptoJS.lib.WordArray.random(16);
    	         */
    	        random: function (nBytes) {
    	            var words = [];

    	            for (var i = 0; i < nBytes; i += 4) {
    	                words.push(cryptoSecureRandomInt());
    	            }

    	            return new WordArray.init(words, nBytes);
    	        }
    	    });

    	    /**
    	     * Encoder namespace.
    	     */
    	    var C_enc = C.enc = {};

    	    /**
    	     * Hex encoding strategy.
    	     */
    	    var Hex = C_enc.Hex = {
    	        /**
    	         * Converts a word array to a hex string.
    	         *
    	         * @param {WordArray} wordArray The word array.
    	         *
    	         * @return {string} The hex string.
    	         *
    	         * @static
    	         *
    	         * @example
    	         *
    	         *     var hexString = CryptoJS.enc.Hex.stringify(wordArray);
    	         */
    	        stringify: function (wordArray) {
    	            // Shortcuts
    	            var words = wordArray.words;
    	            var sigBytes = wordArray.sigBytes;

    	            // Convert
    	            var hexChars = [];
    	            for (var i = 0; i < sigBytes; i++) {
    	                var bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    	                hexChars.push((bite >>> 4).toString(16));
    	                hexChars.push((bite & 0x0f).toString(16));
    	            }

    	            return hexChars.join('');
    	        },

    	        /**
    	         * Converts a hex string to a word array.
    	         *
    	         * @param {string} hexStr The hex string.
    	         *
    	         * @return {WordArray} The word array.
    	         *
    	         * @static
    	         *
    	         * @example
    	         *
    	         *     var wordArray = CryptoJS.enc.Hex.parse(hexString);
    	         */
    	        parse: function (hexStr) {
    	            // Shortcut
    	            var hexStrLength = hexStr.length;

    	            // Convert
    	            var words = [];
    	            for (var i = 0; i < hexStrLength; i += 2) {
    	                words[i >>> 3] |= parseInt(hexStr.substr(i, 2), 16) << (24 - (i % 8) * 4);
    	            }

    	            return new WordArray.init(words, hexStrLength / 2);
    	        }
    	    };

    	    /**
    	     * Latin1 encoding strategy.
    	     */
    	    var Latin1 = C_enc.Latin1 = {
    	        /**
    	         * Converts a word array to a Latin1 string.
    	         *
    	         * @param {WordArray} wordArray The word array.
    	         *
    	         * @return {string} The Latin1 string.
    	         *
    	         * @static
    	         *
    	         * @example
    	         *
    	         *     var latin1String = CryptoJS.enc.Latin1.stringify(wordArray);
    	         */
    	        stringify: function (wordArray) {
    	            // Shortcuts
    	            var words = wordArray.words;
    	            var sigBytes = wordArray.sigBytes;

    	            // Convert
    	            var latin1Chars = [];
    	            for (var i = 0; i < sigBytes; i++) {
    	                var bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    	                latin1Chars.push(String.fromCharCode(bite));
    	            }

    	            return latin1Chars.join('');
    	        },

    	        /**
    	         * Converts a Latin1 string to a word array.
    	         *
    	         * @param {string} latin1Str The Latin1 string.
    	         *
    	         * @return {WordArray} The word array.
    	         *
    	         * @static
    	         *
    	         * @example
    	         *
    	         *     var wordArray = CryptoJS.enc.Latin1.parse(latin1String);
    	         */
    	        parse: function (latin1Str) {
    	            // Shortcut
    	            var latin1StrLength = latin1Str.length;

    	            // Convert
    	            var words = [];
    	            for (var i = 0; i < latin1StrLength; i++) {
    	                words[i >>> 2] |= (latin1Str.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
    	            }

    	            return new WordArray.init(words, latin1StrLength);
    	        }
    	    };

    	    /**
    	     * UTF-8 encoding strategy.
    	     */
    	    var Utf8 = C_enc.Utf8 = {
    	        /**
    	         * Converts a word array to a UTF-8 string.
    	         *
    	         * @param {WordArray} wordArray The word array.
    	         *
    	         * @return {string} The UTF-8 string.
    	         *
    	         * @static
    	         *
    	         * @example
    	         *
    	         *     var utf8String = CryptoJS.enc.Utf8.stringify(wordArray);
    	         */
    	        stringify: function (wordArray) {
    	            try {
    	                return decodeURIComponent(escape(Latin1.stringify(wordArray)));
    	            } catch (e) {
    	                throw new Error('Malformed UTF-8 data');
    	            }
    	        },

    	        /**
    	         * Converts a UTF-8 string to a word array.
    	         *
    	         * @param {string} utf8Str The UTF-8 string.
    	         *
    	         * @return {WordArray} The word array.
    	         *
    	         * @static
    	         *
    	         * @example
    	         *
    	         *     var wordArray = CryptoJS.enc.Utf8.parse(utf8String);
    	         */
    	        parse: function (utf8Str) {
    	            return Latin1.parse(unescape(encodeURIComponent(utf8Str)));
    	        }
    	    };

    	    /**
    	     * Abstract buffered block algorithm template.
    	     *
    	     * The property blockSize must be implemented in a concrete subtype.
    	     *
    	     * @property {number} _minBufferSize The number of blocks that should be kept unprocessed in the buffer. Default: 0
    	     */
    	    var BufferedBlockAlgorithm = C_lib.BufferedBlockAlgorithm = Base.extend({
    	        /**
    	         * Resets this block algorithm's data buffer to its initial state.
    	         *
    	         * @example
    	         *
    	         *     bufferedBlockAlgorithm.reset();
    	         */
    	        reset: function () {
    	            // Initial values
    	            this._data = new WordArray.init();
    	            this._nDataBytes = 0;
    	        },

    	        /**
    	         * Adds new data to this block algorithm's buffer.
    	         *
    	         * @param {WordArray|string} data The data to append. Strings are converted to a WordArray using UTF-8.
    	         *
    	         * @example
    	         *
    	         *     bufferedBlockAlgorithm._append('data');
    	         *     bufferedBlockAlgorithm._append(wordArray);
    	         */
    	        _append: function (data) {
    	            // Convert string to WordArray, else assume WordArray already
    	            if (typeof data == 'string') {
    	                data = Utf8.parse(data);
    	            }

    	            // Append
    	            this._data.concat(data);
    	            this._nDataBytes += data.sigBytes;
    	        },

    	        /**
    	         * Processes available data blocks.
    	         *
    	         * This method invokes _doProcessBlock(offset), which must be implemented by a concrete subtype.
    	         *
    	         * @param {boolean} doFlush Whether all blocks and partial blocks should be processed.
    	         *
    	         * @return {WordArray} The processed data.
    	         *
    	         * @example
    	         *
    	         *     var processedData = bufferedBlockAlgorithm._process();
    	         *     var processedData = bufferedBlockAlgorithm._process(!!'flush');
    	         */
    	        _process: function (doFlush) {
    	            var processedWords;

    	            // Shortcuts
    	            var data = this._data;
    	            var dataWords = data.words;
    	            var dataSigBytes = data.sigBytes;
    	            var blockSize = this.blockSize;
    	            var blockSizeBytes = blockSize * 4;

    	            // Count blocks ready
    	            var nBlocksReady = dataSigBytes / blockSizeBytes;
    	            if (doFlush) {
    	                // Round up to include partial blocks
    	                nBlocksReady = Math.ceil(nBlocksReady);
    	            } else {
    	                // Round down to include only full blocks,
    	                // less the number of blocks that must remain in the buffer
    	                nBlocksReady = Math.max((nBlocksReady | 0) - this._minBufferSize, 0);
    	            }

    	            // Count words ready
    	            var nWordsReady = nBlocksReady * blockSize;

    	            // Count bytes ready
    	            var nBytesReady = Math.min(nWordsReady * 4, dataSigBytes);

    	            // Process blocks
    	            if (nWordsReady) {
    	                for (var offset = 0; offset < nWordsReady; offset += blockSize) {
    	                    // Perform concrete-algorithm logic
    	                    this._doProcessBlock(dataWords, offset);
    	                }

    	                // Remove processed words
    	                processedWords = dataWords.splice(0, nWordsReady);
    	                data.sigBytes -= nBytesReady;
    	            }

    	            // Return processed words
    	            return new WordArray.init(processedWords, nBytesReady);
    	        },

    	        /**
    	         * Creates a copy of this object.
    	         *
    	         * @return {Object} The clone.
    	         *
    	         * @example
    	         *
    	         *     var clone = bufferedBlockAlgorithm.clone();
    	         */
    	        clone: function () {
    	            var clone = Base.clone.call(this);
    	            clone._data = this._data.clone();

    	            return clone;
    	        },

    	        _minBufferSize: 0
    	    });

    	    /**
    	     * Abstract hasher template.
    	     *
    	     * @property {number} blockSize The number of 32-bit words this hasher operates on. Default: 16 (512 bits)
    	     */
    	    C_lib.Hasher = BufferedBlockAlgorithm.extend({
    	        /**
    	         * Configuration options.
    	         */
    	        cfg: Base.extend(),

    	        /**
    	         * Initializes a newly created hasher.
    	         *
    	         * @param {Object} cfg (Optional) The configuration options to use for this hash computation.
    	         *
    	         * @example
    	         *
    	         *     var hasher = CryptoJS.algo.SHA256.create();
    	         */
    	        init: function (cfg) {
    	            // Apply config defaults
    	            this.cfg = this.cfg.extend(cfg);

    	            // Set initial values
    	            this.reset();
    	        },

    	        /**
    	         * Resets this hasher to its initial state.
    	         *
    	         * @example
    	         *
    	         *     hasher.reset();
    	         */
    	        reset: function () {
    	            // Reset data buffer
    	            BufferedBlockAlgorithm.reset.call(this);

    	            // Perform concrete-hasher logic
    	            this._doReset();
    	        },

    	        /**
    	         * Updates this hasher with a message.
    	         *
    	         * @param {WordArray|string} messageUpdate The message to append.
    	         *
    	         * @return {Hasher} This hasher.
    	         *
    	         * @example
    	         *
    	         *     hasher.update('message');
    	         *     hasher.update(wordArray);
    	         */
    	        update: function (messageUpdate) {
    	            // Append
    	            this._append(messageUpdate);

    	            // Update the hash
    	            this._process();

    	            // Chainable
    	            return this;
    	        },

    	        /**
    	         * Finalizes the hash computation.
    	         * Note that the finalize operation is effectively a destructive, read-once operation.
    	         *
    	         * @param {WordArray|string} messageUpdate (Optional) A final message update.
    	         *
    	         * @return {WordArray} The hash.
    	         *
    	         * @example
    	         *
    	         *     var hash = hasher.finalize();
    	         *     var hash = hasher.finalize('message');
    	         *     var hash = hasher.finalize(wordArray);
    	         */
    	        finalize: function (messageUpdate) {
    	            // Final message update
    	            if (messageUpdate) {
    	                this._append(messageUpdate);
    	            }

    	            // Perform concrete-hasher logic
    	            var hash = this._doFinalize();

    	            return hash;
    	        },

    	        blockSize: 512/32,

    	        /**
    	         * Creates a shortcut function to a hasher's object interface.
    	         *
    	         * @param {Hasher} hasher The hasher to create a helper for.
    	         *
    	         * @return {Function} The shortcut function.
    	         *
    	         * @static
    	         *
    	         * @example
    	         *
    	         *     var SHA256 = CryptoJS.lib.Hasher._createHelper(CryptoJS.algo.SHA256);
    	         */
    	        _createHelper: function (hasher) {
    	            return function (message, cfg) {
    	                return new hasher.init(cfg).finalize(message);
    	            };
    	        },

    	        /**
    	         * Creates a shortcut function to the HMAC's object interface.
    	         *
    	         * @param {Hasher} hasher The hasher to use in this HMAC helper.
    	         *
    	         * @return {Function} The shortcut function.
    	         *
    	         * @static
    	         *
    	         * @example
    	         *
    	         *     var HmacSHA256 = CryptoJS.lib.Hasher._createHmacHelper(CryptoJS.algo.SHA256);
    	         */
    	        _createHmacHelper: function (hasher) {
    	            return function (message, key) {
    	                return new C_algo.HMAC.init(hasher, key).finalize(message);
    	            };
    	        }
    	    });

    	    /**
    	     * Algorithm namespace.
    	     */
    	    var C_algo = C.algo = {};

    	    return C;
    	}(Math));


    	return CryptoJS;

    }));
    });

    var md5 = createCommonjsModule(function (module, exports) {
    (function (root, factory) {
    	{
    		// CommonJS
    		module.exports = factory(core);
    	}
    }(commonjsGlobal, function (CryptoJS) {

    	(function (Math) {
    	    // Shortcuts
    	    var C = CryptoJS;
    	    var C_lib = C.lib;
    	    var WordArray = C_lib.WordArray;
    	    var Hasher = C_lib.Hasher;
    	    var C_algo = C.algo;

    	    // Constants table
    	    var T = [];

    	    // Compute constants
    	    (function () {
    	        for (var i = 0; i < 64; i++) {
    	            T[i] = (Math.abs(Math.sin(i + 1)) * 0x100000000) | 0;
    	        }
    	    }());

    	    /**
    	     * MD5 hash algorithm.
    	     */
    	    var MD5 = C_algo.MD5 = Hasher.extend({
    	        _doReset: function () {
    	            this._hash = new WordArray.init([
    	                0x67452301, 0xefcdab89,
    	                0x98badcfe, 0x10325476
    	            ]);
    	        },

    	        _doProcessBlock: function (M, offset) {
    	            // Swap endian
    	            for (var i = 0; i < 16; i++) {
    	                // Shortcuts
    	                var offset_i = offset + i;
    	                var M_offset_i = M[offset_i];

    	                M[offset_i] = (
    	                    (((M_offset_i << 8)  | (M_offset_i >>> 24)) & 0x00ff00ff) |
    	                    (((M_offset_i << 24) | (M_offset_i >>> 8))  & 0xff00ff00)
    	                );
    	            }

    	            // Shortcuts
    	            var H = this._hash.words;

    	            var M_offset_0  = M[offset + 0];
    	            var M_offset_1  = M[offset + 1];
    	            var M_offset_2  = M[offset + 2];
    	            var M_offset_3  = M[offset + 3];
    	            var M_offset_4  = M[offset + 4];
    	            var M_offset_5  = M[offset + 5];
    	            var M_offset_6  = M[offset + 6];
    	            var M_offset_7  = M[offset + 7];
    	            var M_offset_8  = M[offset + 8];
    	            var M_offset_9  = M[offset + 9];
    	            var M_offset_10 = M[offset + 10];
    	            var M_offset_11 = M[offset + 11];
    	            var M_offset_12 = M[offset + 12];
    	            var M_offset_13 = M[offset + 13];
    	            var M_offset_14 = M[offset + 14];
    	            var M_offset_15 = M[offset + 15];

    	            // Working varialbes
    	            var a = H[0];
    	            var b = H[1];
    	            var c = H[2];
    	            var d = H[3];

    	            // Computation
    	            a = FF(a, b, c, d, M_offset_0,  7,  T[0]);
    	            d = FF(d, a, b, c, M_offset_1,  12, T[1]);
    	            c = FF(c, d, a, b, M_offset_2,  17, T[2]);
    	            b = FF(b, c, d, a, M_offset_3,  22, T[3]);
    	            a = FF(a, b, c, d, M_offset_4,  7,  T[4]);
    	            d = FF(d, a, b, c, M_offset_5,  12, T[5]);
    	            c = FF(c, d, a, b, M_offset_6,  17, T[6]);
    	            b = FF(b, c, d, a, M_offset_7,  22, T[7]);
    	            a = FF(a, b, c, d, M_offset_8,  7,  T[8]);
    	            d = FF(d, a, b, c, M_offset_9,  12, T[9]);
    	            c = FF(c, d, a, b, M_offset_10, 17, T[10]);
    	            b = FF(b, c, d, a, M_offset_11, 22, T[11]);
    	            a = FF(a, b, c, d, M_offset_12, 7,  T[12]);
    	            d = FF(d, a, b, c, M_offset_13, 12, T[13]);
    	            c = FF(c, d, a, b, M_offset_14, 17, T[14]);
    	            b = FF(b, c, d, a, M_offset_15, 22, T[15]);

    	            a = GG(a, b, c, d, M_offset_1,  5,  T[16]);
    	            d = GG(d, a, b, c, M_offset_6,  9,  T[17]);
    	            c = GG(c, d, a, b, M_offset_11, 14, T[18]);
    	            b = GG(b, c, d, a, M_offset_0,  20, T[19]);
    	            a = GG(a, b, c, d, M_offset_5,  5,  T[20]);
    	            d = GG(d, a, b, c, M_offset_10, 9,  T[21]);
    	            c = GG(c, d, a, b, M_offset_15, 14, T[22]);
    	            b = GG(b, c, d, a, M_offset_4,  20, T[23]);
    	            a = GG(a, b, c, d, M_offset_9,  5,  T[24]);
    	            d = GG(d, a, b, c, M_offset_14, 9,  T[25]);
    	            c = GG(c, d, a, b, M_offset_3,  14, T[26]);
    	            b = GG(b, c, d, a, M_offset_8,  20, T[27]);
    	            a = GG(a, b, c, d, M_offset_13, 5,  T[28]);
    	            d = GG(d, a, b, c, M_offset_2,  9,  T[29]);
    	            c = GG(c, d, a, b, M_offset_7,  14, T[30]);
    	            b = GG(b, c, d, a, M_offset_12, 20, T[31]);

    	            a = HH(a, b, c, d, M_offset_5,  4,  T[32]);
    	            d = HH(d, a, b, c, M_offset_8,  11, T[33]);
    	            c = HH(c, d, a, b, M_offset_11, 16, T[34]);
    	            b = HH(b, c, d, a, M_offset_14, 23, T[35]);
    	            a = HH(a, b, c, d, M_offset_1,  4,  T[36]);
    	            d = HH(d, a, b, c, M_offset_4,  11, T[37]);
    	            c = HH(c, d, a, b, M_offset_7,  16, T[38]);
    	            b = HH(b, c, d, a, M_offset_10, 23, T[39]);
    	            a = HH(a, b, c, d, M_offset_13, 4,  T[40]);
    	            d = HH(d, a, b, c, M_offset_0,  11, T[41]);
    	            c = HH(c, d, a, b, M_offset_3,  16, T[42]);
    	            b = HH(b, c, d, a, M_offset_6,  23, T[43]);
    	            a = HH(a, b, c, d, M_offset_9,  4,  T[44]);
    	            d = HH(d, a, b, c, M_offset_12, 11, T[45]);
    	            c = HH(c, d, a, b, M_offset_15, 16, T[46]);
    	            b = HH(b, c, d, a, M_offset_2,  23, T[47]);

    	            a = II(a, b, c, d, M_offset_0,  6,  T[48]);
    	            d = II(d, a, b, c, M_offset_7,  10, T[49]);
    	            c = II(c, d, a, b, M_offset_14, 15, T[50]);
    	            b = II(b, c, d, a, M_offset_5,  21, T[51]);
    	            a = II(a, b, c, d, M_offset_12, 6,  T[52]);
    	            d = II(d, a, b, c, M_offset_3,  10, T[53]);
    	            c = II(c, d, a, b, M_offset_10, 15, T[54]);
    	            b = II(b, c, d, a, M_offset_1,  21, T[55]);
    	            a = II(a, b, c, d, M_offset_8,  6,  T[56]);
    	            d = II(d, a, b, c, M_offset_15, 10, T[57]);
    	            c = II(c, d, a, b, M_offset_6,  15, T[58]);
    	            b = II(b, c, d, a, M_offset_13, 21, T[59]);
    	            a = II(a, b, c, d, M_offset_4,  6,  T[60]);
    	            d = II(d, a, b, c, M_offset_11, 10, T[61]);
    	            c = II(c, d, a, b, M_offset_2,  15, T[62]);
    	            b = II(b, c, d, a, M_offset_9,  21, T[63]);

    	            // Intermediate hash value
    	            H[0] = (H[0] + a) | 0;
    	            H[1] = (H[1] + b) | 0;
    	            H[2] = (H[2] + c) | 0;
    	            H[3] = (H[3] + d) | 0;
    	        },

    	        _doFinalize: function () {
    	            // Shortcuts
    	            var data = this._data;
    	            var dataWords = data.words;

    	            var nBitsTotal = this._nDataBytes * 8;
    	            var nBitsLeft = data.sigBytes * 8;

    	            // Add padding
    	            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);

    	            var nBitsTotalH = Math.floor(nBitsTotal / 0x100000000);
    	            var nBitsTotalL = nBitsTotal;
    	            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 15] = (
    	                (((nBitsTotalH << 8)  | (nBitsTotalH >>> 24)) & 0x00ff00ff) |
    	                (((nBitsTotalH << 24) | (nBitsTotalH >>> 8))  & 0xff00ff00)
    	            );
    	            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = (
    	                (((nBitsTotalL << 8)  | (nBitsTotalL >>> 24)) & 0x00ff00ff) |
    	                (((nBitsTotalL << 24) | (nBitsTotalL >>> 8))  & 0xff00ff00)
    	            );

    	            data.sigBytes = (dataWords.length + 1) * 4;

    	            // Hash final blocks
    	            this._process();

    	            // Shortcuts
    	            var hash = this._hash;
    	            var H = hash.words;

    	            // Swap endian
    	            for (var i = 0; i < 4; i++) {
    	                // Shortcut
    	                var H_i = H[i];

    	                H[i] = (((H_i << 8)  | (H_i >>> 24)) & 0x00ff00ff) |
    	                       (((H_i << 24) | (H_i >>> 8))  & 0xff00ff00);
    	            }

    	            // Return final computed hash
    	            return hash;
    	        },

    	        clone: function () {
    	            var clone = Hasher.clone.call(this);
    	            clone._hash = this._hash.clone();

    	            return clone;
    	        }
    	    });

    	    function FF(a, b, c, d, x, s, t) {
    	        var n = a + ((b & c) | (~b & d)) + x + t;
    	        return ((n << s) | (n >>> (32 - s))) + b;
    	    }

    	    function GG(a, b, c, d, x, s, t) {
    	        var n = a + ((b & d) | (c & ~d)) + x + t;
    	        return ((n << s) | (n >>> (32 - s))) + b;
    	    }

    	    function HH(a, b, c, d, x, s, t) {
    	        var n = a + (b ^ c ^ d) + x + t;
    	        return ((n << s) | (n >>> (32 - s))) + b;
    	    }

    	    function II(a, b, c, d, x, s, t) {
    	        var n = a + (c ^ (b | ~d)) + x + t;
    	        return ((n << s) | (n >>> (32 - s))) + b;
    	    }

    	    /**
    	     * Shortcut function to the hasher's object interface.
    	     *
    	     * @param {WordArray|string} message The message to hash.
    	     *
    	     * @return {WordArray} The hash.
    	     *
    	     * @static
    	     *
    	     * @example
    	     *
    	     *     var hash = CryptoJS.MD5('message');
    	     *     var hash = CryptoJS.MD5(wordArray);
    	     */
    	    C.MD5 = Hasher._createHelper(MD5);

    	    /**
    	     * Shortcut function to the HMAC's object interface.
    	     *
    	     * @param {WordArray|string} message The message to hash.
    	     * @param {WordArray|string} key The secret key.
    	     *
    	     * @return {WordArray} The HMAC.
    	     *
    	     * @static
    	     *
    	     * @example
    	     *
    	     *     var hmac = CryptoJS.HmacMD5(message, key);
    	     */
    	    C.HmacMD5 = Hasher._createHmacHelper(MD5);
    	}(Math));


    	return CryptoJS.MD5;

    }));
    });

    /* src/Inbox.svelte generated by Svelte v3.42.6 */
    const file$b = "src/Inbox.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	child_ctx[15] = i;
    	return child_ctx;
    }

    // (187:0) {:catch error}
    function create_catch_block_1(ctx) {
    	let p;
    	let t_value = /*error*/ ctx[17].message + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			set_style(p, "color", "red");
    			add_location(p, file$b, 187, 4, 4495);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*promise*/ 8 && t_value !== (t_value = /*error*/ ctx[17].message + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block_1.name,
    		type: "catch",
    		source: "(187:0) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (149:0) {:then data}
    function create_then_block$1(ctx) {
    	let table;
    	let each_value = /*data*/ ctx[12].contains;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			table = element("table");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(table, file$b, 149, 4, 3448);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, table, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(table, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*shortAbout, promise, upperCase, shortDate, maxRows*/ 28) {
    				each_value = /*data*/ ctx[12].contains;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(table, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(table);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block$1.name,
    		type: "then",
    		source: "(149:0) {:then data}",
    		ctx
    	});

    	return block;
    }

    // (152:6) {#if i < maxRows}
    function create_if_block$3(ctx) {
    	let tr;
    	let td;
    	let t0_value = shortDate(/*obj*/ ctx[13].modified) + "";
    	let t0;
    	let t1;
    	let promise_1;
    	let t2;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: false,
    		pending: create_pending_block_1,
    		then: create_then_block_1,
    		catch: create_catch_block$1,
    		value: 16
    	};

    	handle_promise(promise_1 = /*shortAbout*/ ctx[4](/*obj*/ ctx[13]), info);

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			info.block.c();
    			t2 = space();
    			add_location(td, file$b, 153, 12, 3543);
    			attr_dev(tr, "class", "svelte-s0xzkp");
    			add_location(tr, file$b, 152, 8, 3526);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td);
    			append_dev(td, t0);
    			append_dev(tr, t1);
    			info.block.m(tr, info.anchor = null);
    			info.mount = () => tr;
    			info.anchor = t2;
    			append_dev(tr, t2);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*promise*/ 8 && t0_value !== (t0_value = shortDate(/*obj*/ ctx[13].modified) + "")) set_data_dev(t0, t0_value);
    			info.ctx = ctx;

    			if (dirty & /*promise*/ 8 && promise_1 !== (promise_1 = /*shortAbout*/ ctx[4](/*obj*/ ctx[13])) && handle_promise(promise_1, info)) ; else {
    				update_await_block_branch(info, ctx, dirty);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			info.block.d();
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(152:6) {#if i < maxRows}",
    		ctx
    	});

    	return block;
    }

    // (1:0) <script>     import { onDestroy, onMount }
    function create_catch_block$1(ctx) {
    	const block = { c: noop, m: noop, p: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block$1.name,
    		type: "catch",
    		source: "(1:0) <script>     import { onDestroy, onMount }",
    		ctx
    	});

    	return block;
    }

    // (157:12) {:then about}
    function create_then_block_1(ctx) {
    	let td;
    	let div;
    	let div_title_value;
    	let t0;
    	let t1_value = /*about*/ ctx[16].color + "";
    	let t1;
    	let t2;
    	let a;
    	let span0;
    	let t3_value = upperCase(/*about*/ ctx[16].actor) + "";
    	let t3;
    	let t4;
    	let i0;
    	let t6;
    	let span1;
    	let t7_value = /*about*/ ctx[16].type + "";
    	let t7;
    	let t8;
    	let i1;
    	let t10;
    	let span2;
    	let t11_value = /*about*/ ctx[16].object + "";
    	let t11;
    	let t12;
    	let i2;
    	let t14;
    	let span3;
    	let t15_value = upperCase(/*about*/ ctx[16].target) + "";
    	let t15;
    	let a_href_value;
    	let a_title_value;

    	const block = {
    		c: function create() {
    			td = element("td");
    			div = element("div");
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = space();
    			a = element("a");
    			span0 = element("span");
    			t3 = text(t3_value);
    			t4 = space();
    			i0 = element("i");
    			i0.textContent = "sends";
    			t6 = text("\n\n                (\n                    ");
    			span1 = element("span");
    			t7 = text(t7_value);
    			t8 = space();
    			i1 = element("i");
    			i1.textContent = "a";
    			t10 = space();
    			span2 = element("span");
    			t11 = text(t11_value);
    			t12 = text("\n                )\n\n                ");
    			i2 = element("i");
    			i2.textContent = "to";
    			t14 = space();
    			span3 = element("span");
    			t15 = text(t15_value);
    			attr_dev(div, "class", "idbox svelte-s0xzkp");
    			attr_dev(div, "title", div_title_value = /*about*/ ctx[16].id);
    			set_style(div, "background-color", /*about*/ ctx[16].color);
    			add_location(div, file$b, 158, 16, 3716);
    			attr_dev(span0, "class", "actor svelte-s0xzkp");
    			add_location(span0, file$b, 164, 16, 3971);
    			add_location(i0, file$b, 166, 16, 4040);
    			attr_dev(span1, "class", "type svelte-s0xzkp");
    			add_location(span1, file$b, 169, 20, 4092);
    			add_location(i1, file$b, 171, 20, 4152);
    			attr_dev(span2, "class", "object svelte-s0xzkp");
    			add_location(span2, file$b, 173, 20, 4198);
    			add_location(i2, file$b, 176, 16, 4276);
    			attr_dev(span3, "class", "target svelte-s0xzkp");
    			add_location(span3, file$b, 178, 16, 4303);
    			attr_dev(a, "href", a_href_value = /*obj*/ ctx[13].id);
    			attr_dev(a, "title", a_title_value = /*about*/ ctx[16].id);
    			add_location(a, file$b, 162, 20, 3899);
    			add_location(td, file$b, 157, 16, 3695);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, div);
    			append_dev(td, t0);
    			append_dev(td, t1);
    			append_dev(td, t2);
    			append_dev(td, a);
    			append_dev(a, span0);
    			append_dev(span0, t3);
    			append_dev(a, t4);
    			append_dev(a, i0);
    			append_dev(a, t6);
    			append_dev(a, span1);
    			append_dev(span1, t7);
    			append_dev(a, t8);
    			append_dev(a, i1);
    			append_dev(a, t10);
    			append_dev(a, span2);
    			append_dev(span2, t11);
    			append_dev(a, t12);
    			append_dev(a, i2);
    			append_dev(a, t14);
    			append_dev(a, span3);
    			append_dev(span3, t15);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*promise*/ 8 && div_title_value !== (div_title_value = /*about*/ ctx[16].id)) {
    				attr_dev(div, "title", div_title_value);
    			}

    			if (dirty & /*promise*/ 8) {
    				set_style(div, "background-color", /*about*/ ctx[16].color);
    			}

    			if (dirty & /*promise*/ 8 && t1_value !== (t1_value = /*about*/ ctx[16].color + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*promise*/ 8 && t3_value !== (t3_value = upperCase(/*about*/ ctx[16].actor) + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*promise*/ 8 && t7_value !== (t7_value = /*about*/ ctx[16].type + "")) set_data_dev(t7, t7_value);
    			if (dirty & /*promise*/ 8 && t11_value !== (t11_value = /*about*/ ctx[16].object + "")) set_data_dev(t11, t11_value);
    			if (dirty & /*promise*/ 8 && t15_value !== (t15_value = upperCase(/*about*/ ctx[16].target) + "")) set_data_dev(t15, t15_value);

    			if (dirty & /*promise*/ 8 && a_href_value !== (a_href_value = /*obj*/ ctx[13].id)) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty & /*promise*/ 8 && a_title_value !== (a_title_value = /*about*/ ctx[16].id)) {
    				attr_dev(a, "title", a_title_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block_1.name,
    		type: "then",
    		source: "(157:12) {:then about}",
    		ctx
    	});

    	return block;
    }

    // (155:36)                ...loading notification             {:then about}
    function create_pending_block_1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("...loading notification");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block_1.name,
    		type: "pending",
    		source: "(155:36)                ...loading notification             {:then about}",
    		ctx
    	});

    	return block;
    }

    // (151:4) {#each data.contains as obj , i }
    function create_each_block$3(ctx) {
    	let if_block_anchor;
    	let if_block = /*i*/ ctx[15] < /*maxRows*/ ctx[2] && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*i*/ ctx[15] < /*maxRows*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(151:4) {#each data.contains as obj , i }",
    		ctx
    	});

    	return block;
    }

    // (147:16)    <p>...loading inbox</p> {:then data}
    function create_pending_block$1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "...loading inbox";
    			add_location(p, file$b, 147, 2, 3407);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block$1.name,
    		type: "pending",
    		source: "(147:16)    <p>...loading inbox</p> {:then data}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$c(ctx) {
    	let h3;
    	let t0;
    	let t1;
    	let div;
    	let t2;
    	let i;
    	let t3;
    	let t4;
    	let t5;
    	let await_block_anchor;
    	let promise_1;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: true,
    		pending: create_pending_block$1,
    		then: create_then_block$1,
    		catch: create_catch_block_1,
    		value: 12,
    		error: 17
    	};

    	handle_promise(promise_1 = /*promise*/ ctx[3], info);

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			t0 = text(/*title*/ ctx[0]);
    			t1 = space();
    			div = element("div");
    			t2 = text("[");
    			i = element("i");
    			t3 = text(/*containerUrl*/ ctx[1]);
    			t4 = text("]");
    			t5 = space();
    			await_block_anchor = empty();
    			info.block.c();
    			add_location(h3, file$b, 142, 0, 3334);
    			add_location(i, file$b, 144, 6, 3358);
    			add_location(div, file$b, 144, 0, 3352);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, t2);
    			append_dev(div, i);
    			append_dev(i, t3);
    			append_dev(div, t4);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, await_block_anchor, anchor);
    			info.block.m(target, info.anchor = anchor);
    			info.mount = () => await_block_anchor.parentNode;
    			info.anchor = await_block_anchor;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			if (dirty & /*title*/ 1) set_data_dev(t0, /*title*/ ctx[0]);
    			if (dirty & /*containerUrl*/ 2) set_data_dev(t3, /*containerUrl*/ ctx[1]);
    			info.ctx = ctx;

    			if (dirty & /*promise*/ 8 && promise_1 !== (promise_1 = /*promise*/ ctx[3]) && handle_promise(promise_1, info)) ; else {
    				update_await_block_branch(info, ctx, dirty);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(await_block_anchor);
    			info.block.d(detaching);
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    async function loadResouce(url) {
    	const response = await fetch(url);
    	const data = await response.json();
    	return data;
    }

    function shortId(url) {
    	return url.replaceAll(/.*\//g, "");
    }

    function shortDate(date) {
    	return date.replaceAll(/\..+/g, "");
    }

    function upperCase(string) {
    	return string.charAt(0).toUpperCase() + string.slice(1);
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let promise;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Inbox', slots, []);
    	let { title = 'Inbox' } = $$props;
    	let { containerUrl } = $$props;
    	let { refreshInterval = 30 } = $$props;
    	let { maxRows = 5 } = $$props;
    	let cards;

    	const cardUnsubscribe = cardList.subscribe(li => {
    		cards = li;
    	});

    	const resetUnsubscribe = resetCount.subscribe(_ => {
    		doRefresh();
    	});

    	function doRefresh() {
    		$$invalidate(3, promise = loadResouce(containerUrl));
    	}

    	function md5Color(string) {
    		let md5String = md5(string).toString();
    		return `#${md5String.substring(0, 6)}`;
    	}

    	function nameLookup(iri) {
    		if (!iri) {
    			return "someone";
    		}

    		const knownCard = cards.filter(item => iri == item.id);

    		if (knownCard.length == 1) {
    			return knownCard[0].name;
    		} else {
    			return "someone";
    		}
    	}

    	async function shortAbout(obj) {
    		const notification = await loadResouce(obj['id']);
    		const id = notification['id'];
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
    		} else {
    			object = "something";
    		}

    		let type;

    		if (notification['type']) {
    			type = notification['type'] || "";
    		} else {
    			type = "whatever";
    		}

    		object = [].concat(upperCase(object));
    		type = [].concat(upperCase(type));
    		const actorName = nameLookup(actor);
    		const targetName = nameLookup(target);
    		const objectName = object.join("+");
    		const typeName = type.join("+");

    		return {
    			id,
    			"color": md5Color(id),
    			"object": objectName,
    			"type": typeName,
    			"actor": actorName,
    			"target": targetName
    		};
    	}

    	onMount(() => {
    		// Set a refresh interval when asked for
    		if (refreshInterval > 0) {
    			const interval = setInterval(
    				() => {
    					doRefresh();
    				},
    				refreshInterval * 1000
    			);

    			return () => {
    				clearInterval(interval);
    			};
    		}
    	});

    	onDestroy(() => {
    		cardUnsubscribe();
    		resetUnsubscribe();
    	});

    	const writable_props = ['title', 'containerUrl', 'refreshInterval', 'maxRows'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Inbox> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('title' in $$props) $$invalidate(0, title = $$props.title);
    		if ('containerUrl' in $$props) $$invalidate(1, containerUrl = $$props.containerUrl);
    		if ('refreshInterval' in $$props) $$invalidate(5, refreshInterval = $$props.refreshInterval);
    		if ('maxRows' in $$props) $$invalidate(2, maxRows = $$props.maxRows);
    	};

    	$$self.$capture_state = () => ({
    		onDestroy,
    		onMount,
    		cardList,
    		resetCount,
    		MD5: md5,
    		title,
    		containerUrl,
    		refreshInterval,
    		maxRows,
    		cards,
    		cardUnsubscribe,
    		resetUnsubscribe,
    		loadResouce,
    		doRefresh,
    		shortId,
    		shortDate,
    		upperCase,
    		md5Color,
    		nameLookup,
    		shortAbout,
    		promise
    	});

    	$$self.$inject_state = $$props => {
    		if ('title' in $$props) $$invalidate(0, title = $$props.title);
    		if ('containerUrl' in $$props) $$invalidate(1, containerUrl = $$props.containerUrl);
    		if ('refreshInterval' in $$props) $$invalidate(5, refreshInterval = $$props.refreshInterval);
    		if ('maxRows' in $$props) $$invalidate(2, maxRows = $$props.maxRows);
    		if ('cards' in $$props) cards = $$props.cards;
    		if ('promise' in $$props) $$invalidate(3, promise = $$props.promise);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*containerUrl*/ 2) {
    			$$invalidate(3, promise = loadResouce(containerUrl));
    		}
    	};

    	return [title, containerUrl, maxRows, promise, shortAbout, refreshInterval];
    }

    class Inbox extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {
    			title: 0,
    			containerUrl: 1,
    			refreshInterval: 5,
    			maxRows: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Inbox",
    			options,
    			id: create_fragment$c.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*containerUrl*/ ctx[1] === undefined && !('containerUrl' in props)) {
    			console.warn("<Inbox> was created without expected prop 'containerUrl'");
    		}
    	}

    	get title() {
    		throw new Error("<Inbox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<Inbox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get containerUrl() {
    		throw new Error("<Inbox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set containerUrl(value) {
    		throw new Error("<Inbox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get refreshInterval() {
    		throw new Error("<Inbox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set refreshInterval(value) {
    		throw new Error("<Inbox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get maxRows() {
    		throw new Error("<Inbox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set maxRows(value) {
    		throw new Error("<Inbox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    // Unique ID creation requires a high quality random # generator. In the browser we therefore
    // require the crypto API and do not support built-in fallback to lower quality random number
    // generators (like Math.random()).
    var getRandomValues;
    var rnds8 = new Uint8Array(16);
    function rng() {
      // lazy load so that environments that need to polyfill have a chance to do so
      if (!getRandomValues) {
        // getRandomValues needs to be invoked in a context where "this" is a Crypto implementation. Also,
        // find the complete implementation of crypto (msCrypto) on IE11.
        getRandomValues = typeof crypto !== 'undefined' && crypto.getRandomValues && crypto.getRandomValues.bind(crypto) || typeof msCrypto !== 'undefined' && typeof msCrypto.getRandomValues === 'function' && msCrypto.getRandomValues.bind(msCrypto);

        if (!getRandomValues) {
          throw new Error('crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported');
        }
      }

      return getRandomValues(rnds8);
    }

    var REGEX = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;

    function validate(uuid) {
      return typeof uuid === 'string' && REGEX.test(uuid);
    }

    /**
     * Convert array of 16 byte values to UUID string format of the form:
     * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
     */

    var byteToHex = [];

    for (var i = 0; i < 256; ++i) {
      byteToHex.push((i + 0x100).toString(16).substr(1));
    }

    function stringify(arr) {
      var offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      // Note: Be careful editing this code!  It's been tuned for performance
      // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434
      var uuid = (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + '-' + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + '-' + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + '-' + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + '-' + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase(); // Consistency check for valid UUID.  If this throws, it's likely due to one
      // of the following:
      // - One or more input array values don't map to a hex octet (leading to
      // "undefined" in the uuid)
      // - Invalid input values for the RFC `version` or `variant` fields

      if (!validate(uuid)) {
        throw TypeError('Stringified UUID is invalid');
      }

      return uuid;
    }

    function v4(options, buf, offset) {
      options = options || {};
      var rnds = options.random || (options.rng || rng)(); // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`

      rnds[6] = rnds[6] & 0x0f | 0x40;
      rnds[8] = rnds[8] & 0x3f | 0x80; // Copy bytes to buffer, if provided

      if (buf) {
        offset = offset || 0;

        for (var i = 0; i < 16; ++i) {
          buf[offset + i] = rnds[i];
        }

        return buf;
      }

      return stringify(rnds);
    }

    /* src/notification/Origin.svelte generated by Svelte v3.42.6 */
    const file$a = "src/notification/Origin.svelte";

    function create_fragment$b(ctx) {
    	let b;
    	let br;
    	let t1;
    	let t2_value = /*name*/ ctx[0].toUpperCase() + "";
    	let t2;
    	let t3;

    	const block = {
    		c: function create() {
    			b = element("b");
    			b.textContent = "Origin";
    			br = element("br");
    			t1 = space();
    			t2 = text(t2_value);
    			t3 = text("'S ORCHESTRATOR");
    			add_location(b, file$a, 39, 0, 970);
    			add_location(br, file$a, 39, 13, 983);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, b, anchor);
    			insert_dev(target, br, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, t3, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*name*/ 1 && t2_value !== (t2_value = /*name*/ ctx[0].toUpperCase() + "")) set_data_dev(t2, t2_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(b);
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(t3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function entryMap$2(item) {
    	return JSON.stringify({
    		id: item.id,
    		type: item.type,
    		inbox: item.inbox
    	});
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Origin', slots, []);
    	let { name } = $$props;
    	let { origin } = $$props;

    	onMount(() => {
    		cardList.subscribe(card => {
    			// Find the orchestrator for a name
    			const nameCard = card.filter(entry => entry.name == name);

    			if (nameCard.length == 0) {
    				return;
    			}

    			// We take the first hit..
    			const orchestrator = nameCard[0].orchestrator;

    			// Find the orchestrator inbox
    			const orchestratorCard = card.filter(entry => entry.id == orchestrator);

    			if (orchestratorCard == 0) {
    				return;
    			}

    			$$invalidate(1, origin = entryMap$2(orchestratorCard[0]));
    		});
    	});

    	const writable_props = ['name', 'origin'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Origin> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('origin' in $$props) $$invalidate(1, origin = $$props.origin);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		cardList,
    		name,
    		origin,
    		entryMap: entryMap$2
    	});

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('origin' in $$props) $$invalidate(1, origin = $$props.origin);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [name, origin];
    }

    class Origin extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, { name: 0, origin: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Origin",
    			options,
    			id: create_fragment$b.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[0] === undefined && !('name' in props)) {
    			console.warn("<Origin> was created without expected prop 'name'");
    		}

    		if (/*origin*/ ctx[1] === undefined && !('origin' in props)) {
    			console.warn("<Origin> was created without expected prop 'origin'");
    		}
    	}

    	get name() {
    		throw new Error("<Origin>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Origin>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get origin() {
    		throw new Error("<Origin>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set origin(value) {
    		throw new Error("<Origin>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/notification/Target.svelte generated by Svelte v3.42.6 */
    const file$9 = "src/notification/Target.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (38:4) {#each $cardList as card}
    function create_each_block$2(ctx) {
    	let option;
    	let t_value = /*card*/ ctx[6].name.toUpperCase() + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*card*/ ctx[6];
    			option.value = option.__value;
    			add_location(option, file$9, 38, 8, 850);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$cardList*/ 2 && t_value !== (t_value = /*card*/ ctx[6].name.toUpperCase() + "")) set_data_dev(t, t_value);

    			if (dirty & /*$cardList*/ 2 && option_value_value !== (option_value_value = /*card*/ ctx[6])) {
    				prop_dev(option, "__value", option_value_value);
    				option.value = option.__value;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(38:4) {#each $cardList as card}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let b;
    	let br;
    	let t1;
    	let select;
    	let option;
    	let mounted;
    	let dispose;
    	let each_value = /*$cardList*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			b = element("b");
    			b.textContent = "Target";
    			br = element("br");
    			t1 = space();
    			select = element("select");
    			option = element("option");
    			option.textContent = "Choose a target";

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(b, file$9, 33, 0, 692);
    			add_location(br, file$9, 33, 13, 705);
    			option.__value = "Choose a target";
    			option.value = option.__value;
    			add_location(option, file$9, 36, 8, 779);
    			if (/*selected*/ ctx[0] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[5].call(select));
    			add_location(select, file$9, 35, 0, 711);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, b, anchor);
    			insert_dev(target, br, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, select, anchor);
    			append_dev(select, option);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			select_option(select, /*selected*/ ctx[0]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(select, "change", /*select_change_handler*/ ctx[5]),
    					listen_dev(select, "change", /*updateTarget*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$cardList*/ 2) {
    				each_value = /*$cardList*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*selected, $cardList*/ 3) {
    				select_option(select, /*selected*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(b);
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(select);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function entryMap$1(item) {
    	return JSON.stringify({
    		id: item.id,
    		type: item.type,
    		inbox: item.inbox
    	});
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let $cardList;
    	validate_store(cardList, 'cardList');
    	component_subscribe($$self, cardList, $$value => $$invalidate(1, $cardList = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Target', slots, []);
    	let { name } = $$props;
    	let { target } = $$props;
    	let selected;

    	function updateTarget() {
    		$$invalidate(3, target = entryMap$1(selected));
    	}

    	onMount(() => {
    		cardList.subscribe(card => {
    			card.forEach(entry => {
    				if (entry.name == name) {
    					$$invalidate(0, selected = entry);
    					$$invalidate(3, target = entryMap$1(entry));
    				}
    			});
    		});
    	});

    	const writable_props = ['name', 'target'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Target> was created with unknown prop '${key}'`);
    	});

    	function select_change_handler() {
    		selected = select_value(this);
    		$$invalidate(0, selected);
    	}

    	$$self.$$set = $$props => {
    		if ('name' in $$props) $$invalidate(4, name = $$props.name);
    		if ('target' in $$props) $$invalidate(3, target = $$props.target);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		cardList,
    		name,
    		target,
    		selected,
    		updateTarget,
    		entryMap: entryMap$1,
    		$cardList
    	});

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(4, name = $$props.name);
    		if ('target' in $$props) $$invalidate(3, target = $$props.target);
    		if ('selected' in $$props) $$invalidate(0, selected = $$props.selected);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [selected, $cardList, updateTarget, target, name, select_change_handler];
    }

    class Target extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, { name: 4, target: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Target",
    			options,
    			id: create_fragment$a.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[4] === undefined && !('name' in props)) {
    			console.warn("<Target> was created without expected prop 'name'");
    		}

    		if (/*target*/ ctx[3] === undefined && !('target' in props)) {
    			console.warn("<Target> was created without expected prop 'target'");
    		}
    	}

    	get name() {
    		throw new Error("<Target>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Target>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get target() {
    		throw new Error("<Target>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set target(value) {
    		throw new Error("<Target>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/notification/Actor.svelte generated by Svelte v3.42.6 */
    const file$8 = "src/notification/Actor.svelte";

    function create_fragment$9(ctx) {
    	let b;
    	let br;
    	let t1;
    	let t2_value = /*name*/ ctx[0].toUpperCase() + "";
    	let t2;

    	const block = {
    		c: function create() {
    			b = element("b");
    			b.textContent = "Actor";
    			br = element("br");
    			t1 = space();
    			t2 = text(t2_value);
    			add_location(b, file$8, 27, 0, 550);
    			add_location(br, file$8, 27, 12, 562);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, b, anchor);
    			insert_dev(target, br, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, t2, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*name*/ 1 && t2_value !== (t2_value = /*name*/ ctx[0].toUpperCase() + "")) set_data_dev(t2, t2_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(b);
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(t2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function entryMap(item) {
    	return JSON.stringify({
    		id: item.id,
    		type: item.type,
    		inbox: item.inbox
    	});
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Actor', slots, []);
    	let { name } = $$props;
    	let { actor } = $$props;

    	onMount(() => {
    		cardList.subscribe(li => {
    			li.forEach(entry => {
    				if (entry.name == name) {
    					$$invalidate(1, actor = entryMap(entry));
    				}
    			});
    		});
    	});

    	const writable_props = ['name', 'actor'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Actor> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('actor' in $$props) $$invalidate(1, actor = $$props.actor);
    	};

    	$$self.$capture_state = () => ({ onMount, cardList, name, actor, entryMap });

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('actor' in $$props) $$invalidate(1, actor = $$props.actor);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [name, actor];
    }

    class Actor extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { name: 0, actor: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Actor",
    			options,
    			id: create_fragment$9.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[0] === undefined && !('name' in props)) {
    			console.warn("<Actor> was created without expected prop 'name'");
    		}

    		if (/*actor*/ ctx[1] === undefined && !('actor' in props)) {
    			console.warn("<Actor> was created without expected prop 'actor'");
    		}
    	}

    	get name() {
    		throw new Error("<Actor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Actor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get actor() {
    		throw new Error("<Actor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set actor(value) {
    		throw new Error("<Actor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/notification/Object.svelte generated by Svelte v3.42.6 */

    const { Object: Object_1$1 } = globals;
    const file$7 = "src/notification/Object.svelte";

    function create_fragment$8(ctx) {
    	let b;
    	let br;
    	let t1;
    	let textarea;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			b = element("b");
    			b.textContent = "Object";
    			br = element("br");
    			t1 = space();
    			textarea = element("textarea");
    			add_location(b, file$7, 10, 0, 190);
    			add_location(br, file$7, 10, 13, 203);
    			attr_dev(textarea, "class", "svelte-1eo0wli");
    			add_location(textarea, file$7, 11, 0, 208);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, b, anchor);
    			insert_dev(target, br, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, textarea, anchor);
    			set_input_value(textarea, /*object*/ ctx[0]);

    			if (!mounted) {
    				dispose = listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[1]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*object*/ 1) {
    				set_input_value(textarea, /*object*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(b);
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(textarea);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Object', slots, []);

    	let { object = `
{
  "id": "https://origin-system.org/resources/0021",
  "ietf:cite-as": "https://doi.org/10.4598/12123487",
  "type": "Document"
}
    `.trim() } = $$props;

    	const writable_props = ['object'];

    	Object_1$1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Object> was created with unknown prop '${key}'`);
    	});

    	function textarea_input_handler() {
    		object = this.value;
    		$$invalidate(0, object);
    	}

    	$$self.$$set = $$props => {
    		if ('object' in $$props) $$invalidate(0, object = $$props.object);
    	};

    	$$self.$capture_state = () => ({ object });

    	$$self.$inject_state = $$props => {
    		if ('object' in $$props) $$invalidate(0, object = $$props.object);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [object, textarea_input_handler];
    }

    class Object$1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { object: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Object",
    			options,
    			id: create_fragment$8.name
    		});
    	}

    	get object() {
    		throw new Error("<Object>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set object(value) {
    		throw new Error("<Object>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/notification/Type.svelte generated by Svelte v3.42.6 */

    const file$6 = "src/notification/Type.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (15:4) {#each as2Types as t}
    function create_each_block$1(ctx) {
    	let option;
    	let t_value = /*t*/ ctx[3] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*t*/ ctx[3];
    			option.value = option.__value;
    			add_location(option, file$6, 15, 8, 249);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(15:4) {#each as2Types as t}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let b;
    	let br;
    	let t1;
    	let select;
    	let mounted;
    	let dispose;
    	let each_value = /*as2Types*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			b = element("b");
    			b.textContent = "Type";
    			br = element("br");
    			t1 = space();
    			select = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(b, file$6, 12, 0, 169);
    			add_location(br, file$6, 12, 11, 180);
    			if (/*as2Type*/ ctx[0] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[2].call(select));
    			add_location(select, file$6, 13, 0, 185);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, b, anchor);
    			insert_dev(target, br, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, select, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			select_option(select, /*as2Type*/ ctx[0]);

    			if (!mounted) {
    				dispose = listen_dev(select, "change", /*select_change_handler*/ ctx[2]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*as2Types*/ 2) {
    				each_value = /*as2Types*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*as2Type, as2Types*/ 3) {
    				select_option(select, /*as2Type*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(b);
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(select);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Type', slots, []);
    	let { as2Type } = $$props;
    	let as2Types = ['Offer', 'Accept', 'Reject', 'Undo', 'Announce'];
    	const writable_props = ['as2Type'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Type> was created with unknown prop '${key}'`);
    	});

    	function select_change_handler() {
    		as2Type = select_value(this);
    		$$invalidate(0, as2Type);
    		$$invalidate(1, as2Types);
    	}

    	$$self.$$set = $$props => {
    		if ('as2Type' in $$props) $$invalidate(0, as2Type = $$props.as2Type);
    	};

    	$$self.$capture_state = () => ({ as2Type, as2Types });

    	$$self.$inject_state = $$props => {
    		if ('as2Type' in $$props) $$invalidate(0, as2Type = $$props.as2Type);
    		if ('as2Types' in $$props) $$invalidate(1, as2Types = $$props.as2Types);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [as2Type, as2Types, select_change_handler];
    }

    class Type extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { as2Type: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Type",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*as2Type*/ ctx[0] === undefined && !('as2Type' in props)) {
    			console.warn("<Type> was created without expected prop 'as2Type'");
    		}
    	}

    	get as2Type() {
    		throw new Error("<Type>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set as2Type(value) {
    		throw new Error("<Type>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/SendNotification.svelte generated by Svelte v3.42.6 */

    const { Error: Error_1, Object: Object_1 } = globals;
    const file$5 = "src/SendNotification.svelte";

    // (86:0) {:catch error}
    function create_catch_block(ctx) {
    	let p;
    	let t_value = /*error*/ ctx[16].message + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			set_style(p, "color", "red");
    			attr_dev(p, "class", "svelte-1c2whwr");
    			add_location(p, file$5, 86, 4, 2222);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*promise*/ 128 && t_value !== (t_value = /*error*/ ctx[16].message + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(86:0) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (78:0) {:then status}
    function create_then_block(ctx) {
    	let if_block_anchor;
    	let if_block = /*status*/ ctx[15] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*status*/ ctx[15]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(78:0) {:then status}",
    		ctx
    	});

    	return block;
    }

    // (79:1) {#if status}
    function create_if_block$2(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*status*/ ctx[15] == 200 || /*status*/ ctx[15] == 201 || /*status*/ ctx[15] == 202) return create_if_block_1$1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(79:1) {#if status}",
    		ctx
    	});

    	return block;
    }

    // (82:4) {:else}
    function create_else_block(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*status*/ ctx[15] + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Whoops got a ");
    			t1 = text(t1_value);
    			set_style(p, "color", "red");
    			attr_dev(p, "class", "svelte-1c2whwr");
    			add_location(p, file$5, 82, 8, 2138);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*promise*/ 128 && t1_value !== (t1_value = /*status*/ ctx[15] + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(82:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (80:4) {#if status == 200 || status == 201 || status == 202 }
    function create_if_block_1$1(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*status*/ ctx[15] + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Sent with status ");
    			t1 = text(t1_value);
    			set_style(p, "color", "green");
    			attr_dev(p, "class", "svelte-1c2whwr");
    			add_location(p, file$5, 80, 8, 2064);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*promise*/ 128 && t1_value !== (t1_value = /*status*/ ctx[15] + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(80:4) {#if status == 200 || status == 201 || status == 202 }",
    		ctx
    	});

    	return block;
    }

    // (76:16)  <p>...sending notification</p> {:then status}
    function create_pending_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "...sending notification";
    			attr_dev(p, "class", "svelte-1c2whwr");
    			add_location(p, file$5, 76, 0, 1936);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(76:16)  <p>...sending notification</p> {:then status}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let div5;
    	let h2;
    	let t1;
    	let promise_1;
    	let t2;
    	let div0;
    	let table0;
    	let tr0;
    	let td0;
    	let type;
    	let updating_as2Type;
    	let t3;
    	let div3;
    	let div1;
    	let table1;
    	let tr1;
    	let td1;
    	let actor_1;
    	let updating_actor;
    	let t4;
    	let tr2;
    	let td2;
    	let origin_1;
    	let updating_origin;
    	let t5;
    	let tr3;
    	let td3;
    	let target_1;
    	let updating_target;
    	let t6;
    	let div2;
    	let table2;
    	let tr4;
    	let td4;
    	let object_1;
    	let updating_object;
    	let t7;
    	let div4;
    	let button;
    	let current;
    	let mounted;
    	let dispose;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: true,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 15,
    		error: 16
    	};

    	handle_promise(promise_1 = /*promise*/ ctx[7], info);

    	function type_as2Type_binding(value) {
    		/*type_as2Type_binding*/ ctx[9](value);
    	}

    	let type_props = {};

    	if (/*as2Type*/ ctx[2] !== void 0) {
    		type_props.as2Type = /*as2Type*/ ctx[2];
    	}

    	type = new Type({ props: type_props, $$inline: true });
    	binding_callbacks.push(() => bind(type, 'as2Type', type_as2Type_binding));

    	function actor_1_actor_binding(value) {
    		/*actor_1_actor_binding*/ ctx[10](value);
    	}

    	let actor_1_props = { name: /*fromName*/ ctx[0] };

    	if (/*actor*/ ctx[4] !== void 0) {
    		actor_1_props.actor = /*actor*/ ctx[4];
    	}

    	actor_1 = new Actor({ props: actor_1_props, $$inline: true });
    	binding_callbacks.push(() => bind(actor_1, 'actor', actor_1_actor_binding));

    	function origin_1_origin_binding(value) {
    		/*origin_1_origin_binding*/ ctx[11](value);
    	}

    	let origin_1_props = { name: /*fromName*/ ctx[0] };

    	if (/*origin*/ ctx[3] !== void 0) {
    		origin_1_props.origin = /*origin*/ ctx[3];
    	}

    	origin_1 = new Origin({ props: origin_1_props, $$inline: true });
    	binding_callbacks.push(() => bind(origin_1, 'origin', origin_1_origin_binding));

    	function target_1_target_binding(value) {
    		/*target_1_target_binding*/ ctx[12](value);
    	}

    	let target_1_props = { name: /*toName*/ ctx[1] };

    	if (/*target*/ ctx[5] !== void 0) {
    		target_1_props.target = /*target*/ ctx[5];
    	}

    	target_1 = new Target({ props: target_1_props, $$inline: true });
    	binding_callbacks.push(() => bind(target_1, 'target', target_1_target_binding));

    	function object_1_object_binding(value) {
    		/*object_1_object_binding*/ ctx[13](value);
    	}

    	let object_1_props = {};

    	if (/*object*/ ctx[6] !== void 0) {
    		object_1_props.object = /*object*/ ctx[6];
    	}

    	object_1 = new Object$1({ props: object_1_props, $$inline: true });
    	binding_callbacks.push(() => bind(object_1, 'object', object_1_object_binding));

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Send Notification";
    			t1 = space();
    			info.block.c();
    			t2 = space();
    			div0 = element("div");
    			table0 = element("table");
    			tr0 = element("tr");
    			td0 = element("td");
    			create_component(type.$$.fragment);
    			t3 = space();
    			div3 = element("div");
    			div1 = element("div");
    			table1 = element("table");
    			tr1 = element("tr");
    			td1 = element("td");
    			create_component(actor_1.$$.fragment);
    			t4 = space();
    			tr2 = element("tr");
    			td2 = element("td");
    			create_component(origin_1.$$.fragment);
    			t5 = space();
    			tr3 = element("tr");
    			td3 = element("td");
    			create_component(target_1.$$.fragment);
    			t6 = space();
    			div2 = element("div");
    			table2 = element("table");
    			tr4 = element("tr");
    			td4 = element("td");
    			create_component(object_1.$$.fragment);
    			t7 = space();
    			div4 = element("div");
    			button = element("button");
    			button.textContent = "Send";
    			attr_dev(h2, "class", "svelte-1c2whwr");
    			add_location(h2, file$5, 73, 0, 1891);
    			attr_dev(td0, "class", "svelte-1c2whwr");
    			add_location(td0, file$5, 92, 8, 2317);
    			attr_dev(tr0, "class", "svelte-1c2whwr");
    			add_location(tr0, file$5, 91, 4, 2304);
    			attr_dev(table0, "class", "svelte-1c2whwr");
    			add_location(table0, file$5, 90, 0, 2292);
    			attr_dev(div0, "class", "row svelte-1c2whwr");
    			add_location(div0, file$5, 89, 0, 2274);
    			attr_dev(td1, "class", "svelte-1c2whwr");
    			add_location(td1, file$5, 104, 8, 2465);
    			attr_dev(tr1, "class", "svelte-1c2whwr");
    			add_location(tr1, file$5, 103, 4, 2452);
    			attr_dev(td2, "class", "svelte-1c2whwr");
    			add_location(td2, file$5, 109, 8, 2559);
    			attr_dev(tr2, "class", "svelte-1c2whwr");
    			add_location(tr2, file$5, 108, 4, 2546);
    			attr_dev(td3, "class", "svelte-1c2whwr");
    			add_location(td3, file$5, 114, 8, 2655);
    			attr_dev(tr3, "class", "svelte-1c2whwr");
    			add_location(tr3, file$5, 113, 4, 2642);
    			attr_dev(table1, "class", "svelte-1c2whwr");
    			add_location(table1, file$5, 102, 0, 2440);
    			attr_dev(div1, "class", "column svelte-1c2whwr");
    			add_location(div1, file$5, 100, 4, 2418);
    			attr_dev(td4, "class", "svelte-1c2whwr");
    			add_location(td4, file$5, 125, 8, 2826);
    			attr_dev(tr4, "class", "svelte-1c2whwr");
    			add_location(tr4, file$5, 124, 4, 2813);
    			set_style(table2, "float", "left");
    			attr_dev(table2, "class", "svelte-1c2whwr");
    			add_location(table2, file$5, 123, 0, 2780);
    			attr_dev(div2, "class", "column svelte-1c2whwr");
    			add_location(div2, file$5, 121, 4, 2758);
    			attr_dev(div3, "class", "row svelte-1c2whwr");
    			add_location(div3, file$5, 99, 0, 2396);
    			attr_dev(button, "class", "svelte-1c2whwr");
    			add_location(button, file$5, 135, 4, 2941);
    			attr_dev(div4, "class", "row svelte-1c2whwr");
    			add_location(div4, file$5, 134, 0, 2919);
    			attr_dev(div5, "class", "main svelte-1c2whwr");
    			add_location(div5, file$5, 72, 0, 1872);
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, h2);
    			append_dev(div5, t1);
    			info.block.m(div5, info.anchor = null);
    			info.mount = () => div5;
    			info.anchor = t2;
    			append_dev(div5, t2);
    			append_dev(div5, div0);
    			append_dev(div0, table0);
    			append_dev(table0, tr0);
    			append_dev(tr0, td0);
    			mount_component(type, td0, null);
    			append_dev(div5, t3);
    			append_dev(div5, div3);
    			append_dev(div3, div1);
    			append_dev(div1, table1);
    			append_dev(table1, tr1);
    			append_dev(tr1, td1);
    			mount_component(actor_1, td1, null);
    			append_dev(table1, t4);
    			append_dev(table1, tr2);
    			append_dev(tr2, td2);
    			mount_component(origin_1, td2, null);
    			append_dev(table1, t5);
    			append_dev(table1, tr3);
    			append_dev(tr3, td3);
    			mount_component(target_1, td3, null);
    			append_dev(div3, t6);
    			append_dev(div3, div2);
    			append_dev(div2, table2);
    			append_dev(table2, tr4);
    			append_dev(tr4, td4);
    			mount_component(object_1, td4, null);
    			append_dev(div5, t7);
    			append_dev(div5, div4);
    			append_dev(div4, button);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*handleClick*/ ctx[8], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			info.ctx = ctx;

    			if (dirty & /*promise*/ 128 && promise_1 !== (promise_1 = /*promise*/ ctx[7]) && handle_promise(promise_1, info)) ; else {
    				update_await_block_branch(info, ctx, dirty);
    			}

    			const type_changes = {};

    			if (!updating_as2Type && dirty & /*as2Type*/ 4) {
    				updating_as2Type = true;
    				type_changes.as2Type = /*as2Type*/ ctx[2];
    				add_flush_callback(() => updating_as2Type = false);
    			}

    			type.$set(type_changes);
    			const actor_1_changes = {};
    			if (dirty & /*fromName*/ 1) actor_1_changes.name = /*fromName*/ ctx[0];

    			if (!updating_actor && dirty & /*actor*/ 16) {
    				updating_actor = true;
    				actor_1_changes.actor = /*actor*/ ctx[4];
    				add_flush_callback(() => updating_actor = false);
    			}

    			actor_1.$set(actor_1_changes);
    			const origin_1_changes = {};
    			if (dirty & /*fromName*/ 1) origin_1_changes.name = /*fromName*/ ctx[0];

    			if (!updating_origin && dirty & /*origin*/ 8) {
    				updating_origin = true;
    				origin_1_changes.origin = /*origin*/ ctx[3];
    				add_flush_callback(() => updating_origin = false);
    			}

    			origin_1.$set(origin_1_changes);
    			const target_1_changes = {};
    			if (dirty & /*toName*/ 2) target_1_changes.name = /*toName*/ ctx[1];

    			if (!updating_target && dirty & /*target*/ 32) {
    				updating_target = true;
    				target_1_changes.target = /*target*/ ctx[5];
    				add_flush_callback(() => updating_target = false);
    			}

    			target_1.$set(target_1_changes);
    			const object_1_changes = {};

    			if (!updating_object && dirty & /*object*/ 64) {
    				updating_object = true;
    				object_1_changes.object = /*object*/ ctx[6];
    				add_flush_callback(() => updating_object = false);
    			}

    			object_1.$set(object_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(type.$$.fragment, local);
    			transition_in(actor_1.$$.fragment, local);
    			transition_in(origin_1.$$.fragment, local);
    			transition_in(target_1.$$.fragment, local);
    			transition_in(object_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(type.$$.fragment, local);
    			transition_out(actor_1.$$.fragment, local);
    			transition_out(origin_1.$$.fragment, local);
    			transition_out(target_1.$$.fragment, local);
    			transition_out(object_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			info.block.d();
    			info.token = null;
    			info = null;
    			destroy_component(type);
    			destroy_component(actor_1);
    			destroy_component(origin_1);
    			destroy_component(target_1);
    			destroy_component(object_1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('SendNotification', slots, []);
    	let { fromName } = $$props;
    	let { toName } = $$props;
    	let as2Type;
    	let origin;
    	let actor;
    	let target;
    	let object;
    	let promise;

    	function handleClick() {
    		$$invalidate(7, promise = sendToTarget());
    	}

    	async function sendToTarget() {
    		let uuid = v4();

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

    		let jOrigin = JSON.parse(origin);
    		let jTarget = JSON.parse(target);
    		let jObject = JSON.parse(object);
    		let jActor = JSON.parse(actor);

    		let notification = {
    			'@context': ["https://www.w3.org/ns/activitystreams", "http://purl.org/coar/notify"],
    			id: `urn:uuid:${uuid}`,
    			type: as2Type,
    			actor: jActor,
    			origin: jOrigin,
    			target: jTarget,
    			object: jObject
    		};

    		// Send the notification to the inbox of the sender ...
    		// The orchestrator will forward it to the target
    		let response = await fetch(notification.origin.inbox, {
    			method: 'POST',
    			headers: { 'Content-Type': 'application/ld+json' },
    			body: JSON.stringify(notification)
    		});

    		return response.status;
    	}

    	const writable_props = ['fromName', 'toName'];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<SendNotification> was created with unknown prop '${key}'`);
    	});

    	function type_as2Type_binding(value) {
    		as2Type = value;
    		$$invalidate(2, as2Type);
    	}

    	function actor_1_actor_binding(value) {
    		actor = value;
    		$$invalidate(4, actor);
    	}

    	function origin_1_origin_binding(value) {
    		origin = value;
    		$$invalidate(3, origin);
    	}

    	function target_1_target_binding(value) {
    		target = value;
    		$$invalidate(5, target);
    	}

    	function object_1_object_binding(value) {
    		object = value;
    		$$invalidate(6, object);
    	}

    	$$self.$$set = $$props => {
    		if ('fromName' in $$props) $$invalidate(0, fromName = $$props.fromName);
    		if ('toName' in $$props) $$invalidate(1, toName = $$props.toName);
    	};

    	$$self.$capture_state = () => ({
    		uuidv4: v4,
    		Origin,
    		Target,
    		Actor,
    		Object: Object$1,
    		Type,
    		fromName,
    		toName,
    		as2Type,
    		origin,
    		actor,
    		target,
    		object,
    		promise,
    		handleClick,
    		sendToTarget
    	});

    	$$self.$inject_state = $$props => {
    		if ('fromName' in $$props) $$invalidate(0, fromName = $$props.fromName);
    		if ('toName' in $$props) $$invalidate(1, toName = $$props.toName);
    		if ('as2Type' in $$props) $$invalidate(2, as2Type = $$props.as2Type);
    		if ('origin' in $$props) $$invalidate(3, origin = $$props.origin);
    		if ('actor' in $$props) $$invalidate(4, actor = $$props.actor);
    		if ('target' in $$props) $$invalidate(5, target = $$props.target);
    		if ('object' in $$props) $$invalidate(6, object = $$props.object);
    		if ('promise' in $$props) $$invalidate(7, promise = $$props.promise);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		fromName,
    		toName,
    		as2Type,
    		origin,
    		actor,
    		target,
    		object,
    		promise,
    		handleClick,
    		type_as2Type_binding,
    		actor_1_actor_binding,
    		origin_1_origin_binding,
    		target_1_target_binding,
    		object_1_object_binding
    	];
    }

    class SendNotification extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { fromName: 0, toName: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SendNotification",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*fromName*/ ctx[0] === undefined && !('fromName' in props)) {
    			console.warn("<SendNotification> was created without expected prop 'fromName'");
    		}

    		if (/*toName*/ ctx[1] === undefined && !('toName' in props)) {
    			console.warn("<SendNotification> was created without expected prop 'toName'");
    		}
    	}

    	get fromName() {
    		throw new Error_1("<SendNotification>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fromName(value) {
    		throw new Error_1("<SendNotification>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get toName() {
    		throw new Error_1("<SendNotification>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set toName(value) {
    		throw new Error_1("<SendNotification>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Modal.svelte generated by Svelte v3.42.6 */
    const file$4 = "src/Modal.svelte";
    const get_header_slot_changes = dirty => ({});
    const get_header_slot_context = ctx => ({});

    function create_fragment$5(ctx) {
    	let div0;
    	let t0;
    	let div1;
    	let t1;
    	let hr0;
    	let t2;
    	let t3;
    	let hr1;
    	let t4;
    	let button;
    	let current;
    	let mounted;
    	let dispose;
    	const header_slot_template = /*#slots*/ ctx[4].header;
    	const header_slot = create_slot(header_slot_template, ctx, /*$$scope*/ ctx[3], get_header_slot_context);
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			if (header_slot) header_slot.c();
    			t1 = space();
    			hr0 = element("hr");
    			t2 = space();
    			if (default_slot) default_slot.c();
    			t3 = space();
    			hr1 = element("hr");
    			t4 = space();
    			button = element("button");
    			button.textContent = "Close";
    			attr_dev(div0, "class", "modal-background svelte-c58rcy");
    			add_location(div0, file$4, 41, 0, 890);
    			add_location(hr0, file$4, 45, 1, 1045);
    			add_location(hr1, file$4, 47, 1, 1066);
    			button.autofocus = true;
    			attr_dev(button, "class", "svelte-c58rcy");
    			add_location(button, file$4, 50, 1, 1112);
    			attr_dev(div1, "class", "modal svelte-c58rcy");
    			attr_dev(div1, "role", "dialog");
    			attr_dev(div1, "aria-modal", "true");
    			add_location(div1, file$4, 43, 0, 945);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);

    			if (header_slot) {
    				header_slot.m(div1, null);
    			}

    			append_dev(div1, t1);
    			append_dev(div1, hr0);
    			append_dev(div1, t2);

    			if (default_slot) {
    				default_slot.m(div1, null);
    			}

    			append_dev(div1, t3);
    			append_dev(div1, hr1);
    			append_dev(div1, t4);
    			append_dev(div1, button);
    			/*div1_binding*/ ctx[5](div1);
    			current = true;
    			button.focus();

    			if (!mounted) {
    				dispose = [
    					listen_dev(window, "keydown", /*handle_keydown*/ ctx[2], false, false, false),
    					listen_dev(div0, "click", /*close*/ ctx[1], false, false, false),
    					listen_dev(button, "click", /*close*/ ctx[1], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (header_slot) {
    				if (header_slot.p && (!current || dirty & /*$$scope*/ 8)) {
    					update_slot_base(
    						header_slot,
    						header_slot_template,
    						ctx,
    						/*$$scope*/ ctx[3],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
    						: get_slot_changes(header_slot_template, /*$$scope*/ ctx[3], dirty, get_header_slot_changes),
    						get_header_slot_context
    					);
    				}
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 8)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[3],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header_slot, local);
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header_slot, local);
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    			if (header_slot) header_slot.d(detaching);
    			if (default_slot) default_slot.d(detaching);
    			/*div1_binding*/ ctx[5](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Modal', slots, ['header','default']);
    	const dispatch = createEventDispatcher();
    	const close = () => dispatch('close');
    	let modal;

    	const handle_keydown = e => {
    		if (e.key === 'Escape') {
    			close();
    			return;
    		}

    		if (e.key === 'Tab') {
    			// trap focus
    			const nodes = modal.querySelectorAll('*');

    			const tabbable = Array.from(nodes).filter(n => n.tabIndex >= 0);
    			let index = tabbable.indexOf(document.activeElement);
    			if (index === -1 && e.shiftKey) index = 0;
    			index += tabbable.length + (e.shiftKey ? -1 : 1);
    			index %= tabbable.length;
    			tabbable[index].focus();
    			e.preventDefault();
    		}
    	};

    	const previously_focused = typeof document !== 'undefined' && document.activeElement;

    	if (previously_focused) {
    		onDestroy(() => {
    			previously_focused.focus();
    		});
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Modal> was created with unknown prop '${key}'`);
    	});

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			modal = $$value;
    			$$invalidate(0, modal);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		onDestroy,
    		dispatch,
    		close,
    		modal,
    		handle_keydown,
    		previously_focused
    	});

    	$$self.$inject_state = $$props => {
    		if ('modal' in $$props) $$invalidate(0, modal = $$props.modal);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [modal, close, handle_keydown, $$scope, slots, div1_binding];
    }

    class Modal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Modal",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/Send.svelte generated by Svelte v3.42.6 */
    const file$3 = "src/Send.svelte";

    // (14:0) {#if showModal}
    function create_if_block$1(ctx) {
    	let modal;
    	let current;

    	modal = new Modal({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	modal.$on("close", /*close_handler*/ ctx[4]);

    	const block = {
    		c: function create() {
    			create_component(modal.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const modal_changes = {};

    			if (dirty & /*$$scope, fromName, toName*/ 35) {
    				modal_changes.$$scope = { dirty, ctx };
    			}

    			modal.$set(modal_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(14:0) {#if showModal}",
    		ctx
    	});

    	return block;
    }

    // (15:1) <Modal on:close="{() => showModal = false}">
    function create_default_slot(ctx) {
    	let sendnotification;
    	let current;

    	sendnotification = new SendNotification({
    			props: {
    				fromName: /*fromName*/ ctx[0],
    				toName: /*toName*/ ctx[1]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(sendnotification.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(sendnotification, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const sendnotification_changes = {};
    			if (dirty & /*fromName*/ 1) sendnotification_changes.fromName = /*fromName*/ ctx[0];
    			if (dirty & /*toName*/ 2) sendnotification_changes.toName = /*toName*/ ctx[1];
    			sendnotification.$set(sendnotification_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(sendnotification.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(sendnotification.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(sendnotification, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(15:1) <Modal on:close=\\\"{() => showModal = false}\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let button;
    	let t1;
    	let if_block_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*showModal*/ ctx[2] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Send Notification";
    			t1 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			add_location(button, file$3, 9, 0, 186);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*showModal*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*showModal*/ 4) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t1);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Send', slots, []);
    	let { fromName } = $$props;
    	let { toName } = $$props;
    	let showModal = false;
    	const writable_props = ['fromName', 'toName'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Send> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(2, showModal = true);
    	const close_handler = () => $$invalidate(2, showModal = false);

    	$$self.$$set = $$props => {
    		if ('fromName' in $$props) $$invalidate(0, fromName = $$props.fromName);
    		if ('toName' in $$props) $$invalidate(1, toName = $$props.toName);
    	};

    	$$self.$capture_state = () => ({
    		Modal,
    		SendNotification,
    		fromName,
    		toName,
    		showModal
    	});

    	$$self.$inject_state = $$props => {
    		if ('fromName' in $$props) $$invalidate(0, fromName = $$props.fromName);
    		if ('toName' in $$props) $$invalidate(1, toName = $$props.toName);
    		if ('showModal' in $$props) $$invalidate(2, showModal = $$props.showModal);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [fromName, toName, showModal, click_handler, close_handler];
    }

    class Send extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { fromName: 0, toName: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Send",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*fromName*/ ctx[0] === undefined && !('fromName' in props)) {
    			console.warn("<Send> was created without expected prop 'fromName'");
    		}

    		if (/*toName*/ ctx[1] === undefined && !('toName' in props)) {
    			console.warn("<Send> was created without expected prop 'toName'");
    		}
    	}

    	get fromName() {
    		throw new Error("<Send>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fromName(value) {
    		throw new Error("<Send>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get toName() {
    		throw new Error("<Send>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set toName(value) {
    		throw new Error("<Send>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/PodView.svelte generated by Svelte v3.42.6 */

    // (9:0) {#if pod}
    function create_if_block(ctx) {
    	let t0;
    	let t1;
    	let if_block2_anchor;
    	let current;
    	let if_block0 = /*pod*/ ctx[0].name && create_if_block_3(ctx);
    	let if_block1 = /*pod*/ ctx[0].inbox && create_if_block_2(ctx);
    	let if_block2 = /*pod*/ ctx[0].outbox && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert_dev(target, if_block2_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*pod*/ ctx[0].name) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*pod*/ 1) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*pod*/ ctx[0].inbox) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*pod*/ 1) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(t1.parentNode, t1);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*pod*/ ctx[0].outbox) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty & /*pod*/ 1) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_1(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block2);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach_dev(if_block2_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(9:0) {#if pod}",
    		ctx
    	});

    	return block;
    }

    // (10:4) {#if pod.name}
    function create_if_block_3(ctx) {
    	let send;
    	let current;

    	send = new Send({
    			props: { fromName: /*pod*/ ctx[0].name },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(send.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(send, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const send_changes = {};
    			if (dirty & /*pod*/ 1) send_changes.fromName = /*pod*/ ctx[0].name;
    			send.$set(send_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(send.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(send.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(send, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(10:4) {#if pod.name}",
    		ctx
    	});

    	return block;
    }

    // (14:4) {#if pod.inbox}
    function create_if_block_2(ctx) {
    	let inbox;
    	let current;

    	inbox = new Inbox({
    			props: {
    				title: "Inbox",
    				containerUrl: /*pod*/ ctx[0].inbox,
    				refreshInterval: "30"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(inbox.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(inbox, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const inbox_changes = {};
    			if (dirty & /*pod*/ 1) inbox_changes.containerUrl = /*pod*/ ctx[0].inbox;
    			inbox.$set(inbox_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(inbox.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(inbox.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(inbox, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(14:4) {#if pod.inbox}",
    		ctx
    	});

    	return block;
    }

    // (20:4) {#if pod.outbox}
    function create_if_block_1(ctx) {
    	let inbox;
    	let current;

    	inbox = new Inbox({
    			props: {
    				title: "Events",
    				containerUrl: /*pod*/ ctx[0].outbox,
    				refreshInterval: "30"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(inbox.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(inbox, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const inbox_changes = {};
    			if (dirty & /*pod*/ 1) inbox_changes.containerUrl = /*pod*/ ctx[0].outbox;
    			inbox.$set(inbox_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(inbox.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(inbox.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(inbox, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(20:4) {#if pod.outbox}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*pod*/ ctx[0] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*pod*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*pod*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('PodView', slots, []);
    	let { pod } = $$props;
    	const writable_props = ['pod'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<PodView> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('pod' in $$props) $$invalidate(0, pod = $$props.pod);
    	};

    	$$self.$capture_state = () => ({ Inbox, SendNotification, Send, pod });

    	$$self.$inject_state = $$props => {
    		if ('pod' in $$props) $$invalidate(0, pod = $$props.pod);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [pod];
    }

    class PodView extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { pod: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PodView",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*pod*/ ctx[0] === undefined && !('pod' in props)) {
    			console.warn("<PodView> was created without expected prop 'pod'");
    		}
    	}

    	get pod() {
    		throw new Error("<PodView>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pod(value) {
    		throw new Error("<PodView>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/PodSelector.svelte generated by Svelte v3.42.6 */
    const file$2 = "src/PodSelector.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (9:0) {#each $cardList as card}
    function create_each_block(ctx) {
    	let option;
    	let t_value = /*card*/ ctx[3].name.toUpperCase() + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*card*/ ctx[3];
    			option.value = option.__value;
    			add_location(option, file$2, 9, 4, 179);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$cardList*/ 2 && t_value !== (t_value = /*card*/ ctx[3].name.toUpperCase() + "")) set_data_dev(t, t_value);

    			if (dirty & /*$cardList*/ 2 && option_value_value !== (option_value_value = /*card*/ ctx[3])) {
    				prop_dev(option, "__value", option_value_value);
    				option.value = option.__value;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(9:0) {#each $cardList as card}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let select;
    	let option;
    	let mounted;
    	let dispose;
    	let each_value = /*$cardList*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			select = element("select");
    			option = element("option");
    			option.textContent = "Choose a pod";

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			option.__value = "Choose a pod";
    			option.value = option.__value;
    			add_location(option, file$2, 7, 4, 119);
    			if (/*pod*/ ctx[0] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[2].call(select));
    			add_location(select, file$2, 6, 0, 87);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, select, anchor);
    			append_dev(select, option);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			select_option(select, /*pod*/ ctx[0]);

    			if (!mounted) {
    				dispose = listen_dev(select, "change", /*select_change_handler*/ ctx[2]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$cardList*/ 2) {
    				each_value = /*$cardList*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*pod, $cardList*/ 3) {
    				select_option(select, /*pod*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(select);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $cardList;
    	validate_store(cardList, 'cardList');
    	component_subscribe($$self, cardList, $$value => $$invalidate(1, $cardList = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('PodSelector', slots, []);
    	let { pod } = $$props;
    	const writable_props = ['pod'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<PodSelector> was created with unknown prop '${key}'`);
    	});

    	function select_change_handler() {
    		pod = select_value(this);
    		$$invalidate(0, pod);
    	}

    	$$self.$$set = $$props => {
    		if ('pod' in $$props) $$invalidate(0, pod = $$props.pod);
    	};

    	$$self.$capture_state = () => ({ cardList, pod, $cardList });

    	$$self.$inject_state = $$props => {
    		if ('pod' in $$props) $$invalidate(0, pod = $$props.pod);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [pod, $cardList, select_change_handler];
    }

    class PodSelector extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { pod: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PodSelector",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*pod*/ ctx[0] === undefined && !('pod' in props)) {
    			console.warn("<PodSelector> was created without expected prop 'pod'");
    		}
    	}

    	get pod() {
    		throw new Error("<PodSelector>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pod(value) {
    		throw new Error("<PodSelector>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Refresher.svelte generated by Svelte v3.42.6 */
    const file$1 = "src/Refresher.svelte";

    function create_fragment$1(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Refresh All";
    			add_location(button, file$1, 9, 0, 161);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*refreshAll*/ ctx[0], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Refresher', slots, []);

    	function refreshAll() {
    		resetCount.update(n => n + 1);
    		return true;
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Refresher> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ resetCount, refreshAll });
    	return [refreshAll];
    }

    class Refresher extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Refresher",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.42.6 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t0;
    	let t1;
    	let refresher;
    	let t2;
    	let div2;
    	let div0;
    	let podselector0;
    	let updating_pod;
    	let t3;
    	let podview0;
    	let t4;
    	let div1;
    	let podselector1;
    	let updating_pod_1;
    	let t5;
    	let podview1;
    	let t6;
    	let div5;
    	let div3;
    	let podselector2;
    	let updating_pod_2;
    	let t7;
    	let podview2;
    	let t8;
    	let div4;
    	let podselector3;
    	let updating_pod_3;
    	let t9;
    	let podview3;
    	let current;
    	refresher = new Refresher({ $$inline: true });

    	function podselector0_pod_binding(value) {
    		/*podselector0_pod_binding*/ ctx[5](value);
    	}

    	let podselector0_props = {};

    	if (/*pod1*/ ctx[0] !== void 0) {
    		podselector0_props.pod = /*pod1*/ ctx[0];
    	}

    	podselector0 = new PodSelector({
    			props: podselector0_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(podselector0, 'pod', podselector0_pod_binding));

    	podview0 = new PodView({
    			props: { pod: /*pod1*/ ctx[0] },
    			$$inline: true
    		});

    	function podselector1_pod_binding(value) {
    		/*podselector1_pod_binding*/ ctx[6](value);
    	}

    	let podselector1_props = {};

    	if (/*pod2*/ ctx[1] !== void 0) {
    		podselector1_props.pod = /*pod2*/ ctx[1];
    	}

    	podselector1 = new PodSelector({
    			props: podselector1_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(podselector1, 'pod', podselector1_pod_binding));

    	podview1 = new PodView({
    			props: { pod: /*pod2*/ ctx[1] },
    			$$inline: true
    		});

    	function podselector2_pod_binding(value) {
    		/*podselector2_pod_binding*/ ctx[7](value);
    	}

    	let podselector2_props = {};

    	if (/*pod3*/ ctx[2] !== void 0) {
    		podselector2_props.pod = /*pod3*/ ctx[2];
    	}

    	podselector2 = new PodSelector({
    			props: podselector2_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(podselector2, 'pod', podselector2_pod_binding));

    	podview2 = new PodView({
    			props: { pod: /*pod3*/ ctx[2] },
    			$$inline: true
    		});

    	function podselector3_pod_binding(value) {
    		/*podselector3_pod_binding*/ ctx[8](value);
    	}

    	let podselector3_props = {};

    	if (/*pod4*/ ctx[3] !== void 0) {
    		podselector3_props.pod = /*pod4*/ ctx[3];
    	}

    	podselector3 = new PodSelector({
    			props: podselector3_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(podselector3, 'pod', podselector3_pod_binding));

    	podview3 = new PodView({
    			props: { pod: /*pod4*/ ctx[3] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			t0 = text(/*name*/ ctx[4]);
    			t1 = space();
    			create_component(refresher.$$.fragment);
    			t2 = space();
    			div2 = element("div");
    			div0 = element("div");
    			create_component(podselector0.$$.fragment);
    			t3 = space();
    			create_component(podview0.$$.fragment);
    			t4 = space();
    			div1 = element("div");
    			create_component(podselector1.$$.fragment);
    			t5 = space();
    			create_component(podview1.$$.fragment);
    			t6 = space();
    			div5 = element("div");
    			div3 = element("div");
    			create_component(podselector2.$$.fragment);
    			t7 = space();
    			create_component(podview2.$$.fragment);
    			t8 = space();
    			div4 = element("div");
    			create_component(podselector3.$$.fragment);
    			t9 = space();
    			create_component(podview3.$$.fragment);
    			attr_dev(h1, "class", "svelte-1mwlt0d");
    			add_location(h1, file, 13, 1, 254);
    			attr_dev(main, "class", "svelte-1mwlt0d");
    			add_location(main, file, 12, 0, 246);
    			attr_dev(div0, "class", "column svelte-1mwlt0d");
    			add_location(div0, file, 19, 1, 312);
    			attr_dev(div1, "class", "column svelte-1mwlt0d");
    			add_location(div1, file, 23, 1, 400);
    			attr_dev(div2, "class", "row svelte-1mwlt0d");
    			add_location(div2, file, 18, 0, 293);
    			attr_dev(div3, "class", "column svelte-1mwlt0d");
    			add_location(div3, file, 30, 1, 513);
    			attr_dev(div4, "class", "column svelte-1mwlt0d");
    			add_location(div4, file, 34, 1, 601);
    			attr_dev(div5, "class", "row svelte-1mwlt0d");
    			add_location(div5, file, 29, 0, 494);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(h1, t0);
    			insert_dev(target, t1, anchor);
    			mount_component(refresher, target, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			mount_component(podselector0, div0, null);
    			append_dev(div0, t3);
    			mount_component(podview0, div0, null);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			mount_component(podselector1, div1, null);
    			append_dev(div1, t5);
    			mount_component(podview1, div1, null);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div3);
    			mount_component(podselector2, div3, null);
    			append_dev(div3, t7);
    			mount_component(podview2, div3, null);
    			append_dev(div5, t8);
    			append_dev(div5, div4);
    			mount_component(podselector3, div4, null);
    			append_dev(div4, t9);
    			mount_component(podview3, div4, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*name*/ 16) set_data_dev(t0, /*name*/ ctx[4]);
    			const podselector0_changes = {};

    			if (!updating_pod && dirty & /*pod1*/ 1) {
    				updating_pod = true;
    				podselector0_changes.pod = /*pod1*/ ctx[0];
    				add_flush_callback(() => updating_pod = false);
    			}

    			podselector0.$set(podselector0_changes);
    			const podview0_changes = {};
    			if (dirty & /*pod1*/ 1) podview0_changes.pod = /*pod1*/ ctx[0];
    			podview0.$set(podview0_changes);
    			const podselector1_changes = {};

    			if (!updating_pod_1 && dirty & /*pod2*/ 2) {
    				updating_pod_1 = true;
    				podselector1_changes.pod = /*pod2*/ ctx[1];
    				add_flush_callback(() => updating_pod_1 = false);
    			}

    			podselector1.$set(podselector1_changes);
    			const podview1_changes = {};
    			if (dirty & /*pod2*/ 2) podview1_changes.pod = /*pod2*/ ctx[1];
    			podview1.$set(podview1_changes);
    			const podselector2_changes = {};

    			if (!updating_pod_2 && dirty & /*pod3*/ 4) {
    				updating_pod_2 = true;
    				podselector2_changes.pod = /*pod3*/ ctx[2];
    				add_flush_callback(() => updating_pod_2 = false);
    			}

    			podselector2.$set(podselector2_changes);
    			const podview2_changes = {};
    			if (dirty & /*pod3*/ 4) podview2_changes.pod = /*pod3*/ ctx[2];
    			podview2.$set(podview2_changes);
    			const podselector3_changes = {};

    			if (!updating_pod_3 && dirty & /*pod4*/ 8) {
    				updating_pod_3 = true;
    				podselector3_changes.pod = /*pod4*/ ctx[3];
    				add_flush_callback(() => updating_pod_3 = false);
    			}

    			podselector3.$set(podselector3_changes);
    			const podview3_changes = {};
    			if (dirty & /*pod4*/ 8) podview3_changes.pod = /*pod4*/ ctx[3];
    			podview3.$set(podview3_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(refresher.$$.fragment, local);
    			transition_in(podselector0.$$.fragment, local);
    			transition_in(podview0.$$.fragment, local);
    			transition_in(podselector1.$$.fragment, local);
    			transition_in(podview1.$$.fragment, local);
    			transition_in(podselector2.$$.fragment, local);
    			transition_in(podview2.$$.fragment, local);
    			transition_in(podselector3.$$.fragment, local);
    			transition_in(podview3.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(refresher.$$.fragment, local);
    			transition_out(podselector0.$$.fragment, local);
    			transition_out(podview0.$$.fragment, local);
    			transition_out(podselector1.$$.fragment, local);
    			transition_out(podview1.$$.fragment, local);
    			transition_out(podselector2.$$.fragment, local);
    			transition_out(podview2.$$.fragment, local);
    			transition_out(podselector3.$$.fragment, local);
    			transition_out(podview3.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (detaching) detach_dev(t1);
    			destroy_component(refresher, detaching);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div2);
    			destroy_component(podselector0);
    			destroy_component(podview0);
    			destroy_component(podselector1);
    			destroy_component(podview1);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(div5);
    			destroy_component(podselector2);
    			destroy_component(podview2);
    			destroy_component(podselector3);
    			destroy_component(podview3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let { name } = $$props;
    	let { pod1 } = $$props;
    	let { pod2 } = $$props;
    	let { pod3 } = $$props;
    	let { pod4 } = $$props;
    	const writable_props = ['name', 'pod1', 'pod2', 'pod3', 'pod4'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function podselector0_pod_binding(value) {
    		pod1 = value;
    		$$invalidate(0, pod1);
    	}

    	function podselector1_pod_binding(value) {
    		pod2 = value;
    		$$invalidate(1, pod2);
    	}

    	function podselector2_pod_binding(value) {
    		pod3 = value;
    		$$invalidate(2, pod3);
    	}

    	function podselector3_pod_binding(value) {
    		pod4 = value;
    		$$invalidate(3, pod4);
    	}

    	$$self.$$set = $$props => {
    		if ('name' in $$props) $$invalidate(4, name = $$props.name);
    		if ('pod1' in $$props) $$invalidate(0, pod1 = $$props.pod1);
    		if ('pod2' in $$props) $$invalidate(1, pod2 = $$props.pod2);
    		if ('pod3' in $$props) $$invalidate(2, pod3 = $$props.pod3);
    		if ('pod4' in $$props) $$invalidate(3, pod4 = $$props.pod4);
    	};

    	$$self.$capture_state = () => ({
    		PodView,
    		PodSelector,
    		Refresher,
    		name,
    		pod1,
    		pod2,
    		pod3,
    		pod4
    	});

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(4, name = $$props.name);
    		if ('pod1' in $$props) $$invalidate(0, pod1 = $$props.pod1);
    		if ('pod2' in $$props) $$invalidate(1, pod2 = $$props.pod2);
    		if ('pod3' in $$props) $$invalidate(2, pod3 = $$props.pod3);
    		if ('pod4' in $$props) $$invalidate(3, pod4 = $$props.pod4);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		pod1,
    		pod2,
    		pod3,
    		pod4,
    		name,
    		podselector0_pod_binding,
    		podselector1_pod_binding,
    		podselector2_pod_binding,
    		podselector3_pod_binding
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			name: 4,
    			pod1: 0,
    			pod2: 1,
    			pod3: 2,
    			pod4: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[4] === undefined && !('name' in props)) {
    			console.warn("<App> was created without expected prop 'name'");
    		}

    		if (/*pod1*/ ctx[0] === undefined && !('pod1' in props)) {
    			console.warn("<App> was created without expected prop 'pod1'");
    		}

    		if (/*pod2*/ ctx[1] === undefined && !('pod2' in props)) {
    			console.warn("<App> was created without expected prop 'pod2'");
    		}

    		if (/*pod3*/ ctx[2] === undefined && !('pod3' in props)) {
    			console.warn("<App> was created without expected prop 'pod3'");
    		}

    		if (/*pod4*/ ctx[3] === undefined && !('pod4' in props)) {
    			console.warn("<App> was created without expected prop 'pod4'");
    		}
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pod1() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pod1(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pod2() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pod2(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pod3() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pod3(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pod4() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pod4(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'Mellon Demonstrator (Dev)'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
