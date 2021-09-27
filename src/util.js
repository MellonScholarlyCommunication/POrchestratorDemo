import _ from 'lodash';

// Have an array or string and expecting a boolean result
// E.g.
//    if (isMaybeArray(event.type, e => e.match(/Announce/))) { ... }
export function isMaybeArray(object,callback) {
    if (object === undefined) {
        return undefined;
    }
    else if (_.isArray(object)) {
        return _.find(object, e => callback(e) );
    }
    else {
        return callback(object);
    }
}

// Hava an array or string and expect an array result
// E.g.
//    [].concat(listMaybeArray(event.type, e => uppercase(e)));
export function listMaybeArray(object,callback) {
    if (object === undefined) {
        return undefined;
    }
    else if (_.isArray(object)) {
        return _.map(object, e => callback(e));
    }
    else {
        return [ callback(object) ];
    }
}